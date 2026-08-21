"""
api/services/live_feed.py — Live Hospital Data Feed Service
============================================================
Simulates "live data streaming from hospitals" by replaying pre-generated
trajectory CSVs one day at a time. The Kalman Filter and POMDP Agent
observe this data — they do NOT generate it.

Architecture:
  1. On start(): loads the pre-generated 3_trial_trajectory.csv + arm allocations
  2. On step(): serves the NEXT day's data as "incoming hospital labs"
  3. Feeds it into a per-patient BatchKalmanTracker for belief update
  4. Runs ClinicalPOMDPAgent against updated beliefs
  5. Returns: ground_truth, previous_forecast, next_forecast, error, alerts

This ensures the model is being TESTED, not predicting its own output.
"""

import json
import uuid
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

import pandas as pd

from core.database import get_db_connection
from clinical_math.kalman import BatchKalmanTracker
from simulation.agent import ClinicalPOMDPAgent
from core.config_loader import load_clinical_rules

_rules = load_clinical_rules()
METRIC_ORDER = _rules["metric_order"]


class LiveFeedState:
    """Holds the stateful context for a single live feed run."""

    def __init__(
        self,
        run_id: str,
        trial_id: str,
        trajectory_df: pd.DataFrame,
        arm_allocations: Dict[str, str],
        patient_ids: List[str],
        tracker: BatchKalmanTracker,
        agent: ClinicalPOMDPAgent,
        slopes: np.ndarray,
        total_days: int,
        baselines: np.ndarray = None,
    ):
        self.run_id = run_id
        self.trial_id = trial_id
        self.trajectory_df = trajectory_df
        self.arm_allocations = arm_allocations
        self.patient_ids = patient_ids
        self.tracker = tracker
        self.agent = agent
        self.slopes = slopes
        self.total_days = total_days
        self.baselines = baselines

        self.current_day = -1  # Will be incremented on first step
        self.previous_forecast: np.ndarray = None  # (N, M) — what we predicted for current day
        self.prev_observations: np.ndarray = None   # (N, M) — previous day's observations for slope learning
        self.adaptive_slopes: np.ndarray = slopes.copy()  # Will be updated from observed deltas
        self.cumulative_errors: Dict[str, List[float]] = {m: [] for m in METRIC_ORDER}
        self.step_history: List[dict] = []
        self.action_summary_total: Dict[str, int] = {"CONTINUE": 0, "HOLD_DOSE": 0, "HALT_PATIENT": 0}
        self.halted_patients: set = set()


# In-memory store of active live feeds
_active_feeds: Dict[str, LiveFeedState] = {}


class LiveFeedService:

    @staticmethod
    def start(trial_id: str, trajectory_csv_path: str = None, allocations_json_path: str = None) -> str:
        """Initialize a live feed run by loading from the database dynamically."""

        run_id = f"LIVE_{uuid.uuid4().hex[:8].upper()}"

        with get_db_connection() as conn:
            # 1. Fetch allocated patients
            rows = conn.execute(
                "SELECT patient_id, arm_id FROM trial_patients WHERE trial_id = ? AND filter_stage = 'ENROLLED'",
                (trial_id,)
            ).fetchall()
            
            if not rows:
                raise ValueError(f"No enrolled patients found for trial {trial_id}")
                
            arm_alloc = {row["patient_id"]: row["arm_id"] for row in rows}
            patient_ids = sorted(list(arm_alloc.keys()))
            n_patients = len(patient_ids)
            arm_ids = [arm_alloc[pid] for pid in patient_ids]

            # 2. Fetch baselines and slopes from digital twins
            baselines = np.zeros((n_patients, len(METRIC_ORDER)), dtype=np.float64)
            slopes = np.zeros((n_patients, len(METRIC_ORDER)), dtype=np.float64)
            
            for i, pid in enumerate(patient_ids):
                twin_row = conn.execute(
                    "SELECT baseline_vector_json, trajectory_slopes_json FROM digital_twins WHERE trial_id = ? AND patient_id = ?",
                    (trial_id, pid)
                ).fetchone()
                
                if twin_row:
                    if twin_row["baseline_vector_json"]:
                        bv = json.loads(twin_row["baseline_vector_json"])
                        for j, m in enumerate(METRIC_ORDER):
                            baselines[i, j] = bv.get(m, 0.0)
                    
                    if twin_row["trajectory_slopes_json"]:
                        ts = json.loads(twin_row["trajectory_slopes_json"])
                        for j, m in enumerate(METRIC_ORDER):
                            slopes[i, j] = ts.get(m, 0.0)

        # Initialize Kalman tracker with same parameters as simulation engine
        tracker = BatchKalmanTracker(
            metrics=METRIC_ORDER,
            baselines=baselines,
            initial_variance_scale=0.02,
            process_noise_std=2.0,
            measurement_noise_std=1.5,
            adaptive_r_alpha=0.3,
        )

        agent = ClinicalPOMDPAgent(_rules)

        total_days = 180

        state = LiveFeedState(
            run_id=run_id,
            trial_id=trial_id,
            trajectory_df=None,  # We will generate this dynamically in step()
            arm_allocations=arm_alloc,
            patient_ids=patient_ids,
            tracker=tracker,
            agent=agent,
            slopes=slopes,
            total_days=total_days,
            baselines=baselines,
        )

        # Create DB record
        with get_db_connection() as conn:
            conn.execute(
                """INSERT INTO simulation_runs (run_id, trial_id, status, total_days, started_at)
                   VALUES (?, ?, 'RUNNING', ?, ?)""",
                (run_id, trial_id, total_days, datetime.now().isoformat()),
            )
            conn.commit()

        _active_feeds[run_id] = state
        return run_id

    @staticmethod
    def step(run_id: str) -> dict:
        """Advance one day: feed hospital data → Kalman update → POMDP evaluate."""

        state = _active_feeds.get(run_id)
        if not state:
            raise ValueError(f"No active live feed for run_id: {run_id}")

        state.current_day += 1
        day = state.current_day
        N = len(state.patient_ids)
        M = len(METRIC_ORDER)

        if day > state.total_days:
            # Simulation complete
            results_data = {
                "step_history": state.step_history,
                "action_summary_total": state.action_summary_total,
                "total_patients": N,
                "halted_patients": list(state.halted_patients)
            }
            results_json = json.dumps(results_data)
            with get_db_connection() as conn:
                conn.execute(
                    "UPDATE simulation_runs SET status = 'COMPLETED', completed_at = ? WHERE run_id = ?",
                    (datetime.now().isoformat(), run_id),
                )
                conn.execute(
                    "INSERT INTO simulation_results (run_id, trial_id, results_json, created_at) VALUES (?, ?, ?, ?)",
                    (run_id, state.trial_id, results_json, datetime.now().isoformat()),
                )
                conn.commit()
            _active_feeds.pop(run_id, None)
            raise ValueError(f"Live feed {run_id} completed (Day {day}/{state.total_days}).")

        # ── 1. Load or Generate "incoming hospital data" for this day ────────────
        observations = np.zeros((N, M), dtype=np.float64)
        
        if state.trajectory_df is not None:
            day_df = state.trajectory_df[state.trajectory_df["day"] == day].set_index("patient_id")
            for i, pid in enumerate(state.patient_ids):
                if pid in day_df.index:
                    for j, m in enumerate(METRIC_ORDER):
                        observations[i, j] = float(day_df.loc[pid, m])
                else:
                    observations[i, :] = state.tracker.x_hat[i, :]
        else:
            # Dynamically generate stream: baselines + (day * slope) + realistic random noise
            noise = np.zeros((N, M), dtype=np.float64)
            for j, m in enumerate(METRIC_ORDER):
                scale = _rules.get("lab_noise_std", {}).get(m, 1.0)
                noise[:, j] = np.random.normal(loc=0.0, scale=scale, size=N)
            observations = state.baselines + (state.slopes * day) + noise

        # ── 2. Save what we previously forecasted for comparison ─────
        prev_forecast_dict = {}
        if state.previous_forecast is not None:
            for i, pid in enumerate(state.patient_ids):
                if pid not in state.halted_patients:
                    prev_forecast_dict[pid] = {
                        m: round(float(state.previous_forecast[i, j]), 2)
                        for j, m in enumerate(METRIC_ORDER)
                    }

        # ── 3. Kalman predict (using adaptive slopes) ─────────────────
        if day > 0:
            state.tracker.predict(state.adaptive_slopes, dt_days=1.0)

        # ── 4. Kalman update with the "hospital data" ────────────────
        x_hat, P = state.tracker.update(observations)

        # ── 5. Adaptively learn slopes from observed deltas ───────────
        SLOPE_ALPHA = 0.4  # How fast to adapt (0=never, 1=instant)
        if state.prev_observations is not None:
            observed_delta = observations - state.prev_observations  # (N, M) actual change per day
            for i in range(N):
                if state.tracker.active[i]:
                    state.adaptive_slopes[i] = (
                        SLOPE_ALPHA * observed_delta[i] +
                        (1.0 - SLOPE_ALPHA) * state.adaptive_slopes[i]
                    )
        state.prev_observations = observations.copy()

        # ── 6. Forecast NEXT day's values (using adaptive slopes) ─────
        next_forecast = state.tracker.forecast(state.adaptive_slopes, dt_days=1.0)
        state.previous_forecast = next_forecast.copy()

        # ── 6. Compute tracking error (forecast vs actual) ───────────
        forecast_errors = {}
        ROLLING_WINDOW = 5  # Only use last 5 days of errors for MAPE
        if prev_forecast_dict:
            for i, pid in enumerate(state.patient_ids):
                if pid in prev_forecast_dict and pid not in state.halted_patients:
                    for j, m in enumerate(METRIC_ORDER):
                        actual = observations[i, j]
                        predicted = prev_forecast_dict[pid][m]
                        if abs(actual) > 1e-6:
                            pct_error = abs(predicted - actual) / abs(actual) * 100
                            state.cumulative_errors[m].append(pct_error)

            for m in METRIC_ORDER:
                errs = state.cumulative_errors[m]
                # Use rolling window so MAPE reflects recent accuracy, not all-time
                recent = errs[-ROLLING_WINDOW * len(state.patient_ids):] if errs else []
                forecast_errors[m] = round(np.mean(recent), 2) if recent else 0.0

        # ── 7. POMDP Agent evaluation ────────────────────────────────
        arm_ids = [state.arm_allocations[pid] for pid in state.patient_ids]

        # Compute control arm means for divergence check
        control_indices = [
            i for i in range(N)
            if arm_ids[i] == "ARM_CONTROL"
            and state.tracker.active[i]
        ]
        ctrl_mean = x_hat[control_indices].mean(axis=0) if control_indices else None
        ctrl_var = P[control_indices].mean(axis=0) if control_indices else None

        all_logs, alerts = state.agent.evaluate_policy_vectorized(
            day=day,
            active_mask=state.tracker.active,
            patient_ids=state.patient_ids,
            arm_ids=arm_ids,
            x_hat=x_hat,
            P=P,
            forecasted=next_forecast,
            observed=observations,
            control_mean=ctrl_mean,
            control_var=ctrl_var,
            metric_names=METRIC_ORDER,
            trial_id=state.trial_id,
            run_id=run_id,
        )

        # Apply HALT actions
        from core.schemas import ClinicalAction
        for log in all_logs:
            if log.action == ClinicalAction.HALT_PATIENT:
                idx = state.patient_ids.index(log.patient_id)
                state.tracker.halt_patient(idx)
                state.halted_patients.add(log.patient_id)

        # ── 8. Build per-arm aggregated response ─────────────────────
        arm_reality = {}
        arm_forecast = {}
        for arm in ["ARM_CONTROL", "ARM_VACCINE_A", "ARM_VACCINE_B"]:
            indices = [i for i, a in enumerate(arm_ids) if a == arm and state.tracker.active[i]]
            if indices:
                arm_obs = observations[indices]
                arm_fcast = next_forecast[indices]
                arm_belief = x_hat[indices]
                arm_reality[arm] = {
                    m: round(float(arm_obs[:, j].mean()), 2) for j, m in enumerate(METRIC_ORDER)
                }
                arm_forecast[arm] = {
                    m: round(float(arm_fcast[:, j].mean()), 2) for j, m in enumerate(METRIC_ORDER)
                }

        # Agent action summary
        action_counts = {"CONTINUE": 0, "HOLD_DOSE": 0, "HALT_PATIENT": 0}
        for log in all_logs:
            action_val = log.action.value if hasattr(log.action, "value") else log.action
            if action_val in action_counts:
                action_counts[action_val] += 1
                state.action_summary_total[action_val] += 1

        # Build step response
        step_response = {
            "current_day": day,
            "total_days": state.total_days,
            "active_patients": state.tracker.get_active_count(),
            "total_patients": N,
            "ground_truth": arm_reality,
            "model_forecast": arm_forecast,
            "tracking_error": forecast_errors,
            "overall_mape": round(float(np.median(list(forecast_errors.values()))), 2) if forecast_errors else 0.0,
            "action_summary": action_counts,
            "alerts": [
                {
                    "alert_id": a.alert_id,
                    "patient_id": a.patient_id,
                    "day": a.day,
                    "severity": a.severity,
                    "message": a.message,
                    "metric": a.metric,
                    "forecasted_value": a.forecasted_value,
                    "threshold": a.threshold,
                }
                for a in alerts
            ],
            "agent_decisions": [
                {
                    "patient_id": log.patient_id,
                    "arm_id": log.arm_id,
                    "action": log.action.value if hasattr(log.action, "value") else log.action,
                    "rationale": log.rationale,
                    "hard_override": log.hard_override_triggered,
                }
                for log in all_logs
                if log.action.value != "CONTINUE"  # Only send non-trivial decisions
            ],
        }

        state.step_history.append({
            "day": day,
            "ground_truth": arm_reality,
            "model_forecast": arm_forecast,
            "overall_mape": step_response["overall_mape"],
            "active_patients": step_response["active_patients"],
            "total_patients": step_response["total_patients"],
        })

        # Update DB
        with get_db_connection() as conn:
            conn.execute(
                "UPDATE simulation_runs SET current_day = ?, history_json = ? WHERE run_id = ?",
                (day, json.dumps(state.step_history), run_id),
            )
            conn.commit()

        return step_response

    @staticmethod
    def get_status(run_id: str) -> dict:
        state = _active_feeds.get(run_id)
        if state:
            return {
                "run_id": run_id,
                "status": "RUNNING",
                "current_day": state.current_day,
                "total_days": state.total_days,
                "active_patients": state.tracker.get_active_count(),
            }
        # Check DB
        with get_db_connection() as conn:
            row = conn.execute(
                "SELECT status, current_day, total_days FROM simulation_runs WHERE run_id = ?",
                (run_id,),
            ).fetchone()
            if row:
                return {
                    "run_id": run_id,
                    "status": row["status"],
                    "current_day": row["current_day"],
                    "total_days": row["total_days"],
                }
        raise ValueError(f"No feed found for run_id: {run_id}")

    @staticmethod
    def get_history(run_id: str) -> list:
        state = _active_feeds.get(run_id)
        if state:
            return state.step_history
        return []
