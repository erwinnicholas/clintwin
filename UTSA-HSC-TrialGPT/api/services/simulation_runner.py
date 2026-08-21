"""
api/services/simulation_runner.py
=================================
Manages stateful step-by-step simulation runs without SSE.
"""

import json
import uuid
from datetime import datetime
from typing import Dict, Any, Generator

from core.database import get_db_connection
from simulation.engine import TrialSimulator
from simulation.drugs import load_profiles, generate_random_drug_profile
from core.schemas import SimulationStepResponse


class SimulationState:
    def __init__(self, generator: Generator, run_id: str, trial_id: str):
        self.generator = generator
        self.run_id = run_id
        self.trial_id = trial_id
        self.current_day = 0

# In-memory dictionary to hold stateful generators for active runs
active_simulations: Dict[str, SimulationState] = {}

class SimulationRunnerService:

    @staticmethod
    def _create_run(trial_id: str, total_days: int) -> str:
        run_id = f"RUN_{uuid.uuid4().hex[:8].upper()}"
        with get_db_connection() as conn:
            conn.execute(
                """INSERT INTO simulation_runs (run_id, trial_id, status, total_days, started_at)
                   VALUES (?, ?, 'RUNNING', ?, ?)""",
                (run_id, trial_id, total_days, datetime.now().isoformat())
            )
            conn.commit()
        return run_id

    @staticmethod
    def _update_run_status(run_id: str, status: str, day: int = None):
        with get_db_connection() as conn:
            if day is not None:
                conn.execute(
                    "UPDATE simulation_runs SET status = ?, current_day = ? WHERE run_id = ?",
                    (status, day, run_id)
                )
            else:
                conn.execute(
                    "UPDATE simulation_runs SET status = ? WHERE run_id = ?",
                    (status, run_id)
                )
            if status in ['COMPLETED', 'FAILED']:
                conn.execute(
                    "UPDATE simulation_runs SET completed_at = ? WHERE run_id = ?",
                    (datetime.now().isoformat(), run_id)
                )
            conn.commit()

    @staticmethod
    def start_simulation(trial_id: str, duration_days: int = 180, timestep_days: int = 14) -> str:
        run_id = SimulationRunnerService._create_run(trial_id, duration_days)
        
        # 1. Load twins
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
            SimulationRunnerService._update_run_status(run_id, 'FAILED')
            raise ValueError("No valid twins found for simulation.")

        # 2. Stratify & Balance Check
        from core.balance_verifier import stratified_randomize, verify_cohort_balance
        assignments = stratified_randomize(patients, ["ARM_CONTROL", "ARM_VACCINE_A", "ARM_VACCINE_B"], seed=42)
        balance_report = verify_cohort_balance(patients, assignments)

        # 3. Setup Profiles
        all_profiles = load_profiles()
        drug_profiles = {
            "ARM_CONTROL": all_profiles.get("ARM_CONTROL"),
            "ARM_VACCINE_A": generate_random_drug_profile("ARM_VACCINE_A", seed=42),
            "ARM_VACCINE_B": generate_random_drug_profile("ARM_VACCINE_B", seed=43)
        }

        # 4. Initialize Generator
        sim = TrialSimulator(duration_days=duration_days, timestep_days=timestep_days, seed=42)
        gen = sim.run_multi_arm_streaming(trial_id, patients, assignments, drug_profiles, run_id)
        
        active_simulations[run_id] = SimulationState(
            generator=gen,
            run_id=run_id,
            trial_id=trial_id
        )
        active_simulations[run_id].balance_report = balance_report
        
        return run_id

    @staticmethod
    def step(run_id: str) -> SimulationStepResponse:
        state = active_simulations.get(run_id)
        if not state:
            raise ValueError(f"No active simulation found for run_id: {run_id}")
            
        try:
            step_data = next(state.generator)
            state.current_day = step_data["day"]
            
            # Update DB day
            SimulationRunnerService._update_run_status(run_id, 'RUNNING', step_data["day"])
            
            # Persist step logs directly to DB
            with get_db_connection() as conn:
                for log in step_data["logs"]:
                    obs = log.observed_labs
                    belief = log.belief_state
                    conn.execute(
                        """INSERT INTO simulation_decision_log
                           (run_id, trial_id, day, patient_id, arm_id, action, rationale, hard_override,
                            obs_egfr, obs_platelets, obs_alt, obs_ast, obs_hemoglobin, obs_anc, obs_systolic_bp, obs_diastolic_bp,
                            belief_egfr, belief_platelets, belief_alt, belief_ast, belief_hemoglobin, belief_anc, belief_systolic_bp, belief_diastolic_bp,
                            var_egfr, var_platelets, var_alt, var_ast, var_hemoglobin, var_anc, var_systolic_bp, var_diastolic_bp)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            run_id, state.trial_id, log.day, log.patient_id, log.arm_id, log.action.value, log.rationale, 1 if log.hard_override_triggered else 0,
                            obs.get("egfr"), obs.get("platelets"), obs.get("alt"), obs.get("ast"), obs.get("hemoglobin"), obs.get("anc"), obs.get("systolic_bp"), obs.get("diastolic_bp"),
                            belief.mean_vector.get("egfr"), belief.mean_vector.get("platelets"), belief.mean_vector.get("alt"), belief.mean_vector.get("ast"), belief.mean_vector.get("hemoglobin"), belief.mean_vector.get("anc"), belief.mean_vector.get("systolic_bp"), belief.mean_vector.get("diastolic_bp"),
                            belief.variance_vector.get("egfr"), belief.variance_vector.get("platelets"), belief.variance_vector.get("alt"), belief.variance_vector.get("ast"), belief.variance_vector.get("hemoglobin"), belief.variance_vector.get("anc"), belief.variance_vector.get("systolic_bp"), belief.variance_vector.get("diastolic_bp")
                        )
                    )
                    
                for alert in step_data["alerts"]:
                    conn.execute(
                        """INSERT INTO simulation_alerts
                           (alert_id, run_id, trial_id, patient_id, day, severity, message, metric, forecasted_value, threshold, created_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (alert.alert_id, run_id, state.trial_id, alert.patient_id, alert.day, alert.severity, alert.message, alert.metric, alert.forecasted_value, alert.threshold, datetime.now().isoformat())
                    )
                conn.commit()

            is_first_step = (state.current_day == 0)
            
            return SimulationStepResponse(
                current_day=step_data["day"],
                reality=step_data["reality"],
                forecast=step_data["forecast"],
                agent_actions=step_data["agent_actions"],
                alerts=step_data["alerts"],
                balance_report=state.balance_report if is_first_step else None,
                active_patients=step_data["active_patients"]
            )
            
        except StopIteration:
            SimulationRunnerService._update_run_status(run_id, 'COMPLETED')
            # Pop from active map
            active_simulations.pop(run_id, None)
            raise ValueError(f"Simulation {run_id} is already completed.")
        except Exception as e:
            SimulationRunnerService._update_run_status(run_id, 'FAILED')
            raise e
