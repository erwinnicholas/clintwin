import uuid
import json
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, List

from core.database import get_db_connection
from core.schemas import BeliefState, ClinicalAction, StepDecisionLog, AlertEvent, SimulationStepResponse
from core.config import SimulationConfig, METRIC_ORDER, _rules
from clinical_math.kalman import BatchKalmanTracker
from simulation.agent import ClinicalPOMDPAgent
from simulation.drugs import load_profiles, generate_random_drug_profile

from core.state.live_state import TrialLiveState, active_live_trials

class TrialLiveService:

    @staticmethod
    def _create_run(trial_id: str) -> str:
        run_id = f"RUN_LIVE_{uuid.uuid4().hex[:6].upper()}"
        with get_db_connection() as conn:
            conn.execute(
                """INSERT INTO simulation_runs (run_id, trial_id, status, total_days, started_at)
                   VALUES (?, ?, 'RUNNING', 180, ?)""",
                (run_id, trial_id, datetime.now().isoformat())
            )
            conn.commit()
        return run_id

    @staticmethod
    def start_trial(trial_id: str) -> dict:
        """Initializes the live trial, builds twins, stratifies, and returns balance report."""
        run_id = TrialLiveService._create_run(trial_id)
        
        # 1. Load Twins
        patients = []
        with get_db_connection() as conn:
            rows = conn.execute(
                """SELECT dt.patient_id, dt.baseline_vector_json, dt.trajectory_slopes_json,
                          p.age, p.sex, p.ecog_score 
                   FROM digital_twins dt
                   JOIN patient_vitals_baseline p ON dt.patient_id = p.patient_id
                   WHERE dt.trial_id = ? AND dt.is_fit = 1""",
                (trial_id,)
            ).fetchall()
            for r in rows:
                patients.append({
                    "patient_id": r["patient_id"],
                    "baseline_vector": json.loads(r["baseline_vector_json"]),
                    "trajectory_slopes": json.loads(r["trajectory_slopes_json"]),
                    "age": r["age"],
                    "sex": r["sex"],
                    "ecog_score": r["ecog_score"]
                })
        
        if not patients:
            raise ValueError("No valid twins found. Have you built twins yet?")

        # 2. Stratify
        from core.balance_verifier import stratified_randomize, verify_cohort_balance
        assignments = stratified_randomize(patients, ["ARM_CONTROL", "ARM_VACCINE_A", "ARM_VACCINE_B"], seed=42)
        balance_report = verify_cohort_balance(patients, assignments)
        
        # 3. Initialize State
        state = TrialLiveState(run_id, trial_id)
        state.patient_ids = [p["patient_id"] for p in patients]
        state.arm_assignments = assignments
        
        all_profiles = load_profiles()
        state.drug_profiles = {
            "ARM_CONTROL": all_profiles.get("ARM_CONTROL"),
            "ARM_VACCINE_A": generate_random_drug_profile("ARM_VACCINE_A", seed=42),
            "ARM_VACCINE_B": generate_random_drug_profile("ARM_VACCINE_B", seed=43)
        }
        
        # Build Matrices for Kalman
        N = len(patients)
        M = len(METRIC_ORDER)
        baselines = np.zeros((N, M), dtype=np.float64)
        slopes = np.zeros((N, M), dtype=np.float64)
        for i, p in enumerate(patients):
            bv = p["baseline_vector"]
            ts = p["trajectory_slopes"]
            for j, m in enumerate(METRIC_ORDER):
                baselines[i, j] = bv.get(m, 0.0)
                slopes[i, j] = ts.get(m, 0.0)
                
        state.tracker = BatchKalmanTracker(
            metrics=METRIC_ORDER,
            baselines=baselines,
            initial_variance_scale=0.02,
            process_noise_std=0.5,
            measurement_noise_std=3.0,
            adaptive_r_alpha=0.1
        )
        
        # Generate Initial Beliefs and Forecasts for Day 0 -> Day 14
        # Just to have a "previous forecast" when Day 14 comes in
        dt = SimulationConfig.TIMESTEP_DAYS
        x_hat_next, P_next = state.tracker.predict(slopes, dt_days=dt)
        for i, pid in enumerate(state.patient_ids):
            state.previous_forecast[pid] = {m: x_hat_next[i, j] for j, m in enumerate(METRIC_ORDER)}
            
        active_live_trials[run_id] = state
        
        return {
            "run_id": run_id,
            "balance_report": balance_report,
            "patient_count": N
        }

    @staticmethod
    def process_step(run_id: str, day: int, csv_path: str) -> SimulationStepResponse:
        state = active_live_trials.get(run_id)
        if not state:
            raise ValueError("Live trial run not found.")
            
        df = pd.read_csv(csv_path)
        
        # Verify Day
        if 'day' in df.columns:
            csv_day = int(df['day'].iloc[0])
            if csv_day != day:
                raise ValueError(f"CSV data is for Day {csv_day}, but endpoint expected Day {day}")
        
        state.current_day = day
        
        N = len(state.patient_ids)
        M = len(METRIC_ORDER)
        y_meas = np.zeros((N, M), dtype=np.float64)
        
        # Create a fast lookup from the CSV
        csv_data = {}
        for _, row in df.iterrows():
            csv_data[row['patient_id']] = row
            
        # 1. Delta Calculation (Actual vs Previous Forecast)
        delta_report = []
        for i, pid in enumerate(state.patient_ids):
            if pid not in csv_data:
                continue # Skip dropped
            row = csv_data[pid]
            prev_forecast = state.previous_forecast.get(pid, {})
            
            p_deltas = {}
            for j, m in enumerate(METRIC_ORDER):
                actual = row.get(m, 0.0)
                y_meas[i, j] = actual
                if m in prev_forecast:
                    err = actual - prev_forecast[m]
                    p_deltas[m] = round(err, 2)
                    
            delta_report.append({
                "patient_id": pid,
                "arm": state.arm_assignments.get(pid),
                "deltas": p_deltas
            })
            
        # 2. Kalman Update (incorporate new data)
        # We need measurement noise matrix R
        lab_noise = np.array([SimulationConfig.LAB_NOISE_STD.get(m, 1.0) for m in METRIC_ORDER])
        R_matrix = np.tile(lab_noise**2, (N, 1))
        
        state.tracker.update(y_meas, R_matrix)
        
        # 3. Agent Evaluation & Forecast for Day + 14
        dt = SimulationConfig.TIMESTEP_DAYS
        
        # Get biological slopes from DB for prediction
        slopes = np.zeros((N, M), dtype=np.float64)
        with get_db_connection() as conn:
            for i, pid in enumerate(state.patient_ids):
                row = conn.execute("SELECT trajectory_slopes_json FROM digital_twins WHERE trial_id = ? AND patient_id = ?", (state.trial_id, pid)).fetchone()
                if row:
                    ts = json.loads(row[0])
                    for j, m in enumerate(METRIC_ORDER):
                        slopes[i, j] = ts.get(m, 0.0)
                        
        x_hat_next, P_next = state.tracker.predict(slopes, dt_days=dt)
        
        # Extract states and run POMDP
        logs = []
        alerts = []
        patient_states = []
        
        reality = {"ARM_CONTROL": [], "ARM_VACCINE_A": [], "ARM_VACCINE_B": []}
        forecast = {"ARM_CONTROL": [], "ARM_VACCINE_A": [], "ARM_VACCINE_B": []}
        agent_actions = []

        # Find control arm indices for z-score divergence
        control_indices = [i for i, pid in enumerate(state.patient_ids) if state.arm_assignments.get(pid) == "ARM_CONTROL"]
        mu_c_batch = np.mean(state.tracker.x_hat[control_indices], axis=0) if control_indices else np.zeros(M)
        var_c_batch = np.mean(state.tracker.P[control_indices], axis=0) if control_indices else np.ones(M)

        for i, pid in enumerate(state.patient_ids):
            if pid not in csv_data:
                continue
            
            arm_id = state.arm_assignments.get(pid)
            
            # Current Belief
            mu_t = state.tracker.x_hat[i]
            var_t = state.tracker.P[i]
            b_t = BeliefState(
                mean_vector={m: float(mu_t[j]) for j, m in enumerate(METRIC_ORDER)},
                variance_vector={m: float(var_t[j]) for j, m in enumerate(METRIC_ORDER)}
            )
            
            # Control Belief
            b_c = BeliefState(
                mean_vector={m: float(mu_c_batch[j]) for j, m in enumerate(METRIC_ORDER)},
                variance_vector={m: float(var_c_batch[j]) for j, m in enumerate(METRIC_ORDER)}
            )
            
            # Observed Labs
            obs = {m: float(y_meas[i, j]) for j, m in enumerate(METRIC_ORDER)}
            
            # Forecast
            f_mu = x_hat_next[i]
            f_var = P_next[i]
            forecasted_vals = {m: float(f_mu[j]) for j, m in enumerate(METRIC_ORDER)}
            forecast_ci = {m: {"upper": float(f_mu[j] + 1.96*np.sqrt(f_var[j])), "lower": float(f_mu[j] - 1.96*np.sqrt(f_var[j]))} for j, m in enumerate(METRIC_ORDER)}
            
            # Save forecast for next day delta
            state.previous_forecast[pid] = forecasted_vals
            
            # Run Agent
            log, p_alerts = state.agent.evaluate_policy(day, pid, arm_id, b_t, b_c, obs, forecasted_vals, state.trial_id, run_id)
            alerts.extend(p_alerts)
            logs.append(log)
            
            # Populate Response
            reality[arm_id].append({
                "patient_id": pid,
                "arm_id": arm_id,
                "observed_labs": obs,
                "belief_mean": b_t.mean_vector,
                "belief_variance": b_t.variance_vector
            })
            forecast[arm_id].append({
                "patient_id": pid,
                "predicted_values": forecasted_vals,
                "confidence_interval": forecast_ci
            })
            agent_actions.append({
                "patient_id": pid,
                "action": log.action.value,
                "rationale": log.rationale
            })

        # Persist to DB
        with get_db_connection() as conn:
            conn.execute("UPDATE simulation_runs SET current_day = ? WHERE run_id = ?", (day, run_id))
            for log in logs:
                conn.execute(
                    """INSERT INTO simulation_decision_log
                       (run_id, trial_id, day, patient_id, arm_id, action, rationale, hard_override,
                        obs_platelets, obs_egfr, obs_alt)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (run_id, state.trial_id, log.day, log.patient_id, log.arm_id, log.action.value, log.rationale, 1 if log.hard_override_triggered else 0,
                     log.observed_labs.get("platelets"), log.observed_labs.get("egfr"), log.observed_labs.get("alt"))
                )
            for alert in alerts:
                conn.execute(
                    """INSERT INTO simulation_alerts
                       (alert_id, run_id, trial_id, patient_id, day, severity, message, metric, forecasted_value, threshold, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (alert.alert_id, run_id, state.trial_id, alert.patient_id, alert.day, alert.severity, alert.message, alert.metric, alert.forecasted_value, alert.threshold, datetime.now().isoformat())
                )
            conn.commit()
            
        return SimulationStepResponse(
            current_day=day,
            reality=reality,
            forecast=forecast,
            agent_actions=agent_actions,
            alerts=alerts,
            balance_report=None,
            active_patients=len(csv_data)
        ), delta_report

    @staticmethod
    def finalize(run_id: str):
        with get_db_connection() as conn:
            conn.execute("UPDATE simulation_runs SET status = 'COMPLETED', completed_at = ? WHERE run_id = ?", (datetime.now().isoformat(), run_id))
            conn.commit()
        active_live_trials.pop(run_id, None)
