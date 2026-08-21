"""
simulation/engine.py — Vectorized Multi-Arm In Silico Trial Simulator
=====================================================================
Runs the time-step loop using the BatchKalmanTracker for GIL-free
matrix operations across all patients simultaneously. Integrates
biological noise, drug perturbations, vectorized Kalman filtering,
forecast-embedded POMDP agent, and per-step yielding for SSE streaming.
"""

import numpy as np
from typing import Dict, List, Optional, Generator

from core.schemas import (
    BeliefState, ClinicalAction, StepDecisionLog,
    DrugProfile, SimulationResult, AlertEvent
)
from core.config import SimulationConfig
from core.config_loader import load_clinical_rules
from clinical_math.kalman import BatchKalmanTracker, KalmanBeliefTracker
from simulation.agent import ClinicalPOMDPAgent
from simulation.drugs import compute_drug_effect

# ── Ordered metrics used in the vectorized state matrix ──────────
_rules = load_clinical_rules()
METRIC_ORDER = _rules["metric_order"]


class TrialSimulator:
    """Orchestrates the multi-arm in silico simulation."""

    def __init__(self,
                 duration_days: int = SimulationConfig.DURATION_DAYS,
                 timestep_days: int = SimulationConfig.TIMESTEP_DAYS,
                 seed: int = SimulationConfig.RANDOM_SEED):
        
        self.duration_days = duration_days
        self.timestep_days = timestep_days
        self.agent = ClinicalPOMDPAgent(_rules)
        self.rng = np.random.default_rng(seed)

    def _build_state_matrices(self, patients: List[dict]) -> tuple:
        """
        Stack all patient baselines and slopes into (N, M) NumPy matrices.
        Returns (baselines_matrix, slopes_matrix, patient_ids, arm_ids).
        """
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
        
        return baselines, slopes

    def run_multi_arm(self,
                      trial_id: str,
                      patients: List[dict],
                      arm_assignments: Dict[str, str],
                      drug_profiles: Dict[str, DrugProfile],
                      run_id: str = "SIM_001"
                      ) -> SimulationResult:
        """
        Batch simulation. Returns a complete SimulationResult.
        For SSE streaming, use run_multi_arm_streaming() instead.
        """
        all_logs: List[StepDecisionLog] = []
        adverse_events: List[StepDecisionLog] = []

        for step_data in self.run_multi_arm_streaming(
            trial_id, patients, arm_assignments, drug_profiles, run_id
        ):
            all_logs.extend(step_data["logs"])
            adverse_events.extend(step_data["adverse_events"])

        return SimulationResult(
            run_id=run_id,
            duration_days=self.duration_days,
            timestep_days=self.timestep_days,
            arms=list(set(arm_assignments.values())),
            total_decisions=len(all_logs),
            adverse_events=adverse_events,
            all_logs=all_logs
        )

    def run_multi_arm_streaming(self,
                                 trial_id: str,
                                 patients: List[dict],
                                 arm_assignments: Dict[str, str],
                                 drug_profiles: Dict[str, DrugProfile],
                                 run_id: str = "SIM_001"
                                 ) -> Generator[dict, None, None]:
        """
        Generator that yields one dict per timestep for SSE streaming.
        
        Each yielded dict contains:
          - day: int
          - logs: List[StepDecisionLog]
          - adverse_events: List[StepDecisionLog]
          - alerts: List[AlertEvent]
          - patient_states: List[dict]  (per-patient summary for UI)
        """
        N = len(patients)
        M = len(METRIC_ORDER)
        
        # Build state matrices
        baselines, slopes_matrix = self._build_state_matrices(patients)
        
        # Patient ID and arm ID arrays
        patient_ids = [p["patient_id"] for p in patients]
        arm_ids = [arm_assignments[pid] for pid in patient_ids]
        
        # Initialize the vectorized Kalman tracker
        batch_tracker = BatchKalmanTracker(
            metrics=METRIC_ORDER,
            baselines=baselines,
            initial_variance_scale=0.02,
            process_noise_std=0.5,
            measurement_noise_std=3.0,
            adaptive_r_alpha=0.1
        )
        
        # True biological state: (N, M) — starts at baseline
        true_state = baselines.copy()
        
        # Drug profile per patient
        patient_profiles = [drug_profiles[arm_id] for arm_id in arm_ids]
        
        # Build noise std array: (M,) from SimulationConfig.LAB_NOISE_STD
        lab_noise_std = np.array([
            SimulationConfig.LAB_NOISE_STD.get(m, 1.0) for m in METRIC_ORDER
        ], dtype=np.float64)
        
        # Non-negative metric indices
        non_neg_indices = [
            METRIC_ORDER.index(m) for m in ["platelets", "anc", "hemoglobin", "egfr"]
            if m in METRIC_ORDER
        ]
        
        days = list(range(0, self.duration_days + 1, self.timestep_days))

        for day in days:
            step_logs: List[StepDecisionLog] = []
            step_adverse: List[StepDecisionLog] = []
            step_alerts: List[AlertEvent] = []
            
            # Using dicts keyed by arm_id to group patients automatically
            step_reality = {arm: [] for arm in list(set(arm_ids))}
            step_forecast = {arm: [] for arm in list(set(arm_ids))}
            step_actions = []

            if day > 0:
                # ── Vectorized biological state transition ────────────
                # Drift: true += slopes * dt
                true_state[batch_tracker.active] += slopes_matrix[batch_tracker.active] * self.timestep_days
                
                # Drug effects (per-patient, must loop due to different profiles)
                for i in range(N):
                    if not batch_tracker.active[i]:
                        continue
                    for j, m in enumerate(METRIC_ORDER):
                        drug_delta = compute_drug_effect(
                            patient_profiles[i], m, day, self.timestep_days, self.rng
                        )
                        true_state[i, j] += drug_delta
                
                # Bio noise: vectorized (N, M) Gaussian
                bio_noise = self.rng.normal(
                    0, lab_noise_std * SimulationConfig.BIO_NOISE_SCALE,
                    size=(N, M)
                )
                true_state[batch_tracker.active] += bio_noise[batch_tracker.active]
                
                # Floor clamp non-negative metrics
                true_state[:, non_neg_indices] = np.maximum(0.0, true_state[:, non_neg_indices])
                
                # Kalman predict (vectorized — single matrix op for ALL patients)
                batch_tracker.predict(slopes_matrix, dt_days=self.timestep_days)

            # ── Vectorized observation generation ────────────────────
            noise = self.rng.normal(0, lab_noise_std, size=(N, M))
            observations = np.round(true_state + noise, 2)

            # ── Vectorized Kalman update (single matrix op) ──────────
            x_hat, P = batch_tracker.update(observations)

            # ── Vectorized forecast for next session ─────────────────
            forecasted = batch_tracker.forecast(slopes_matrix, dt_days=self.timestep_days)

            # ── Compute control arm mean belief ──────────────────────
            control_indices = [i for i in range(N) if arm_ids[i] == "ARM_CONTROL" and batch_tracker.active[i]]
            ctrl_means = None
            ctrl_vars = None
            if control_indices:
                ctrl_means = x_hat[control_indices].mean(axis=0)
                ctrl_vars = P[control_indices].mean(axis=0)

            # ── Agent evaluation (Vectorized POMDP) ──────────────────
            all_logs, step_alerts = self.agent.evaluate_policy_vectorized(
                day=day,
                active_mask=batch_tracker.active,
                patient_ids=patient_ids,
                arm_ids=arm_ids,
                x_hat=x_hat,
                P=P,
                forecasted=forecasted,
                observed=observations,
                control_mean=ctrl_means,
                control_var=ctrl_vars,
                metric_names=METRIC_ORDER,
                trial_id=trial_id,
                run_id=run_id
            )

            # Map logs to a dictionary for O(1) lookup during UI packaging
            log_map = {log.patient_id: log for log in all_logs}
            
            # Extract active logs that represent adverse events
            step_logs = all_logs
            step_adverse = [log for log in all_logs if log.action != ClinicalAction.CONTINUE]
            
            # Apply HALT actions to the batch tracker
            for i, p_id in enumerate(patient_ids):
                if batch_tracker.active[i] and p_id in log_map and log_map[p_id].action == ClinicalAction.HALT_PATIENT:
                    batch_tracker.halt_patient(i)

            # ── Output Separation (Stream A vs Stream B)
            for i in range(N):
                p_id = patient_ids[i]
                if not batch_tracker.active[i]:
                    # Need to check if they were active AT THE START of this step!
                    # Wait, if they were halted in this step, they should still be logged for this step
                    if p_id not in log_map:
                        continue # Was already inactive before this step
                        
                if p_id not in log_map:
                    continue
                    
                log = log_map[p_id]
                arm = arm_ids[i]
                
                # We pull these back out from the log objects (or we could extract from arrays, but log has them)
                obs_dict = log.observed_labs
                p_belief = log.belief_state
                forecast_dict = {m: float(forecasted[i, j]) for j, m in enumerate(METRIC_ORDER)}

                step_reality[arm].append({
                    "patient_id": p_id,
                    "arm_id": arm,
                    "observed_labs": obs_dict,
                    "belief_mean": p_belief.mean_vector,
                    "belief_variance": p_belief.variance_vector
                })

                ci_dict = {}
                for j, m in enumerate(METRIC_ORDER):
                    v = p_belief.variance_vector.get(m, 0.0)
                    sd = float(np.sqrt(v))
                    ci_dict[m] = {
                        "lower": round(forecast_dict[m] - 1.96 * sd, 2),
                        "upper": round(forecast_dict[m] + 1.96 * sd, 2)
                    }

                risk_level = "LOW"
                # To assign medium risk, we need to know if this patient had alerts
                patient_has_alert = any(a.patient_id == p_id for a in step_alerts)
                if log.action == ClinicalAction.HALT_PATIENT: risk_level = "CRITICAL"
                elif log.action == ClinicalAction.HOLD_DOSE: risk_level = "HIGH"
                elif patient_has_alert: risk_level = "MEDIUM"

                step_forecast[arm].append({
                    "patient_id": p_id,
                    "forecasted_day": day + self.timestep_days,
                    "predicted_values": forecast_dict,
                    "confidence_interval": ci_dict,
                    "risk_level": risk_level
                })

                step_actions.append({
                    "patient_id": p_id,
                    "action": log.action.value if hasattr(log.action, 'value') else log.action,
                    "rationale": log.rationale,
                    "hard_override": log.hard_override_triggered
                })

            yield {
                "day": day,
                "reality": step_reality,
                "forecast": step_forecast,
                "agent_actions": step_actions,
                "logs": step_logs,
                "adverse_events": step_adverse,
                "alerts": step_alerts,
                "active_patients": batch_tracker.get_active_count()
            }
