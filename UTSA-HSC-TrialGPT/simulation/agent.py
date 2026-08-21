"""
simulation/agent.py — POMDP Belief-Space Clinical Decision Agent
================================================================
Evaluates Kalman-filtered belief states, computes divergence from the
synthetic control arm, enforces deterministic hard safety overrides,
and selects conservative clinical actions.

The agent IS the forecaster: after each timestep update, it runs a
1-step Kalman predict lookahead to proactively detect threshold
breaches BEFORE they occur. Alerts are generated inline.
"""

import uuid
import numpy as np
from typing import Dict, Optional, List, Tuple
from datetime import datetime

from core.schemas import (
    BeliefState, ClinicalAction, StepDecisionLog, AlertEvent
)


class ClinicalPOMDPAgent:
    """
    POMDP belief-space agent with three-gate architecture:
      1. Hard deterministic safety floors (CTCAE Grade 3/4 thresholds)
      2. Proactive forecast: 1-step Kalman lookahead checks next session
      3. Soft z-score divergence policy vs synthetic control arm
    """

    def __init__(self, rules: dict, learning_rate: float = 0.05):
        self.hard_floors = rules.get("ctcae_thresholds", {})
        self.z_hold_threshold = rules.get("pomdp_policy", {}).get("z_hold_threshold", -2.5)
        self.z_positive_threshold = rules.get("pomdp_policy", {}).get("z_positive_threshold", 1.0)
        self.learning_rate = learning_rate

    def _check_hard_safety(self, means: Dict[str, float]) -> Optional[tuple]:
        """Checks all hard safety floors against CTCAE thresholds."""
        for metric, rule in self.hard_floors.items():
            if metric not in means:
                continue
            val = means[metric]
            
            action_enum = ClinicalAction(rule["action"]) if isinstance(rule["action"], str) else rule["action"]
            
            if rule["direction"] == "below" and val < rule["threshold"]:
                return (
                    action_enum,
                    f"{rule['severity']}: {metric} < {rule['threshold']} — "
                    f"Belief mean {metric}={val:.1f}"
                )
            elif rule["direction"] == "above" and val > rule["threshold"]:
                return (
                    action_enum,
                    f"{rule['severity']}: {metric} > {rule['threshold']} — "
                    f"Belief mean {metric}={val:.1f}"
                )
        return None

    def _check_forecast_safety(self,
                                forecasted_values: Dict[str, float],
                                trial_id: str,
                                run_id: str,
                                patient_id: str,
                                day: int) -> List[AlertEvent]:
        """
        Checks the forecasted next-session values against CTCAE thresholds.
        Generates AlertEvent objects for any predicted breaches.
        This is the POMDP acting as the forecaster — no separate agent needed.
        """
        alerts = []
        for metric, rule in self.hard_floors.items():
            if metric not in forecasted_values:
                continue
            val = forecasted_values[metric]
            
            breached = False
            if rule["direction"] == "below" and val < rule["threshold"]:
                breached = True
            elif rule["direction"] == "above" and val > rule["threshold"]:
                breached = True

            if breached:
                alerts.append(AlertEvent(
                    alert_id=str(uuid.uuid4())[:8],
                    trial_id=trial_id,
                    run_id=run_id,
                    patient_id=patient_id,
                    day=day,
                    severity=rule["severity"],
                    message=(
                        f"FORECAST ALERT: {metric} predicted to reach {val:.1f} "
                        f"by next session (threshold: {rule['threshold']}). "
                        f"Pre-emptive {rule['action']} recommended."
                    ),
                    metric=metric,
                    forecasted_value=round(val, 2),
                    threshold=rule["threshold"]
                ))
        return alerts

    def _compute_divergence(self,
                            patient_belief: BeliefState,
                            control_belief: BeliefState,
                            metric: str = "platelets") -> float:
        """Computes z-score divergence between treated and control arm."""
        mu_t = patient_belief.mean_vector.get(metric, 0)
        mu_c = control_belief.mean_vector.get(metric, 0)
        var_t = patient_belief.variance_vector.get(metric, 1.0)
        var_c = control_belief.variance_vector.get(metric, 1.0)

        combined_std = np.sqrt(var_t + var_c + 1e-6)
        return (mu_t - mu_c) / combined_std

    def evaluate_policy(self,
                        day: int,
                        patient_id: str,
                        arm_id: str,
                        patient_belief: BeliefState,
                        control_belief: Optional[BeliefState],
                        observed_labs: Dict[str, float],
                        forecasted_values: Optional[Dict[str, float]] = None,
                        trial_id: str = "",
                        run_id: str = "") -> tuple:
        """
        Three-gate POMDP decision process.
        
        Returns:
            (StepDecisionLog, List[AlertEvent]) — decision + any forecast alerts.
        """
        means = patient_belief.mean_vector
        alerts: List[AlertEvent] = []

        # ── Gate 1: Deterministic Hard Safety ────────────────────────
        override = self._check_hard_safety(means)
        if override:
            action, rationale = override
            log = StepDecisionLog(
                day=day, patient_id=patient_id, arm_id=arm_id,
                observed_labs=observed_labs, belief_state=patient_belief,
                action=action, rationale=rationale,
                hard_override_triggered=True
            )
            return log, alerts

        # ── Gate 2: Proactive Forecast (POMDP IS the forecaster) ─────
        if forecasted_values:
            forecast_alerts = self._check_forecast_safety(
                forecasted_values, trial_id, run_id, patient_id, day
            )
            alerts.extend(forecast_alerts)
            
            # If forecast predicts CRITICAL breach, pre-emptively HOLD
            critical_forecasts = [a for a in forecast_alerts if a.severity == "CRITICAL"]
            if critical_forecasts:
                rationale = (
                    f"PROACTIVE HOLD: Forecast predicts critical threshold breach at next session. "
                    f"{critical_forecasts[0].message}"
                )
                log = StepDecisionLog(
                    day=day, patient_id=patient_id, arm_id=arm_id,
                    observed_labs=observed_labs, belief_state=patient_belief,
                    action=ClinicalAction.HOLD_DOSE, rationale=rationale,
                    hard_override_triggered=False
                )
                return log, alerts

        # ── Gate 3: Belief Divergence vs Control ─────────────────────
        if control_belief is None or arm_id == "ARM_CONTROL":
            log = StepDecisionLog(
                day=day, patient_id=patient_id, arm_id=arm_id,
                observed_labs=observed_labs, belief_state=patient_belief,
                action=ClinicalAction.CONTINUE,
                rationale="Control Arm: Baseline tracking within allowable variance.",
                hard_override_triggered=False
            )
            return log, alerts

        z_platelets = self._compute_divergence(patient_belief, control_belief, "platelets")
        z_egfr = self._compute_divergence(patient_belief, control_belief, "egfr")
        z_alt = self._compute_divergence(patient_belief, control_belief, "alt")

        worst_z = min(z_platelets, z_egfr, -z_alt)

        if worst_z < self.z_hold_threshold:
            metric_label = "platelets" if worst_z == z_platelets else (
                "egfr" if worst_z == z_egfr else "alt"
            )
            log = StepDecisionLog(
                day=day, patient_id=patient_id, arm_id=arm_id,
                observed_labs=observed_labs, belief_state=patient_belief,
                action=ClinicalAction.HOLD_DOSE,
                rationale=(
                    f"Negative divergence: {metric_label} degrading significantly "
                    f"faster than Synthetic Control (z={worst_z:.2f})."
                ),
                hard_override_triggered=False
            )
            return log, alerts

        if max(z_platelets, z_egfr) > self.z_positive_threshold:
            log = StepDecisionLog(
                day=day, patient_id=patient_id, arm_id=arm_id,
                observed_labs=observed_labs, belief_state=patient_belief,
                action=ClinicalAction.CONTINUE,
                rationale=(
                    f"Positive response: Vitals superior to Synthetic Control "
                    f"(z_plt={z_platelets:.2f}, z_egfr={z_egfr:.2f})."
                ),
                hard_override_triggered=False
            )
            return log, alerts

        log = StepDecisionLog(
            day=day, patient_id=patient_id, arm_id=arm_id,
            observed_labs=observed_labs, belief_state=patient_belief,
            action=ClinicalAction.CONTINUE,
            rationale=(
                f"Stable trajectory: Within acceptable control variance "
                f"(z_plt={z_platelets:.2f}, z_egfr={z_egfr:.2f}, z_alt={z_alt:.2f})."
            ),
            hard_override_triggered=False
        )
        return log, alerts

    def evaluate_policy_vectorized(self,
                                   day: int,
                                   active_mask: np.ndarray,
                                   patient_ids: List[str],
                                   arm_ids: List[str],
                                   x_hat: np.ndarray,
                                   P: np.ndarray,
                                   forecasted: np.ndarray,
                                   observed: np.ndarray,
                                   control_mean: Optional[np.ndarray],
                                   control_var: Optional[np.ndarray],
                                   metric_names: List[str],
                                   trial_id: str = "",
                                   run_id: str = "") -> Tuple[List[StepDecisionLog], List[AlertEvent]]:
        """
        Vectorized evaluation of the POMDP policy for the entire cohort.
        Returns a list of logs (one per active patient) and a list of all alerts.
        """
        N, M = x_hat.shape
        actions = np.full(N, ClinicalAction.CONTINUE.value, dtype=object)
        rationales = np.full(N, "", dtype=object)
        hard_overrides = np.zeros(N, dtype=bool)
        
        all_alerts: List[AlertEvent] = []

        # Convert list to array for fast indexing
        arm_ids_arr = np.array(arm_ids)

        # ── Gate 1: Deterministic Hard Safety ────────────────────────
        for metric, rule in self.hard_floors.items():
            if metric not in metric_names:
                continue
            m_idx = metric_names.index(metric)
            val = x_hat[:, m_idx]
            
            action_val = ClinicalAction(rule["action"]).value if isinstance(rule["action"], str) else rule["action"].value
            
            if rule["direction"] == "below":
                breach_mask = active_mask & (val < rule["threshold"]) & ~hard_overrides
            else:
                breach_mask = active_mask & (val > rule["threshold"]) & ~hard_overrides
                
            if np.any(breach_mask):
                actions[breach_mask] = action_val
                hard_overrides[breach_mask] = True
                
                # Build rationales (we have to do this in python for the specific strings)
                breached_indices = np.where(breach_mask)[0]
                for idx in breached_indices:
                    rationales[idx] = f"{rule['severity']}: {metric} {'<' if rule['direction']=='below' else '>'} {rule['threshold']} — Belief mean {metric}={val[idx]:.1f}"

        # ── Gate 2: Proactive Forecast ───────────────────────────────
        for metric, rule in self.hard_floors.items():
            if metric not in metric_names:
                continue
            m_idx = metric_names.index(metric)
            val = forecasted[:, m_idx]
            
            if rule["direction"] == "below":
                breach_mask = active_mask & (val < rule["threshold"])
            else:
                breach_mask = active_mask & (val > rule["threshold"])
                
            breached_indices = np.where(breach_mask)[0]
            for idx in breached_indices:
                all_alerts.append(AlertEvent(
                    alert_id=str(uuid.uuid4())[:8],
                    trial_id=trial_id, run_id=run_id, patient_id=patient_ids[idx], day=day,
                    severity=rule["severity"],
                    message=(
                        f"FORECAST ALERT: {metric} predicted to reach {val[idx]:.1f} "
                        f"by next session (threshold: {rule['threshold']}). "
                        f"Pre-emptive {rule['action']} recommended."
                    ),
                    metric=metric, forecasted_value=round(val[idx], 2), threshold=rule["threshold"]
                ))
                
                # If CRITICAL and not already hard overridden, apply HOLD
                if rule["severity"] == "CRITICAL" and not hard_overrides[idx]:
                    actions[idx] = ClinicalAction.HOLD_DOSE.value
                    rationales[idx] = (
                        f"PROACTIVE HOLD: Forecast predicts critical threshold breach at next session. "
                        f"FORECAST ALERT: {metric} predicted to reach {val[idx]:.1f} "
                        f"by next session (threshold: {rule['threshold']}). Pre-emptive {rule['action']} recommended."
                    )
                    hard_overrides[idx] = True # Mark as dealt with for the divergence gate

        # ── Gate 3: Belief Divergence vs Control ─────────────────────
        # Only evaluate patients who are NOT control, AND not overridden
        eval_mask = active_mask & (arm_ids_arr != "ARM_CONTROL") & ~hard_overrides
        
        if control_mean is None:
            # If there is no control arm, everyone not overridden gets the default rationale
            default_mask = active_mask & ~hard_overrides
            if np.any(default_mask):
                rationales[default_mask] = "Control Arm: Baseline tracking within allowable variance."
            eval_mask = np.zeros(N, dtype=bool)
        else:
            # Default rationale for control
            ctrl_mask = active_mask & (arm_ids_arr == "ARM_CONTROL") & ~hard_overrides
            if np.any(ctrl_mask):
                rationales[ctrl_mask] = "Control Arm: Baseline tracking within allowable variance."
            
        if np.any(eval_mask):
            z_scores = {}
            for metric in ["platelets", "egfr", "alt"]:
                if metric in metric_names:
                    m_idx = metric_names.index(metric)
                    mu_t = x_hat[:, m_idx]
                    var_t = P[:, m_idx]
                    mu_c = control_mean[m_idx]
                    var_c = control_var[m_idx]
                    combined_std = np.sqrt(var_t + var_c + 1e-6)
                    z_scores[metric] = (mu_t - mu_c) / combined_std
                else:
                    z_scores[metric] = np.zeros(N)
                    
            z_plt = z_scores["platelets"]
            z_eg = z_scores["egfr"]
            z_alt = z_scores["alt"]
            
            # worst_z is min(z_plt, z_eg, -z_alt)
            worst_z = np.minimum(np.minimum(z_plt, z_eg), -z_alt)
            max_pos_z = np.maximum(z_plt, z_eg)
            
            # Condition 1: Hold threshold
            hold_mask = eval_mask & (worst_z < self.z_hold_threshold)
            if np.any(hold_mask):
                actions[hold_mask] = ClinicalAction.HOLD_DOSE.value
                for idx in np.where(hold_mask)[0]:
                    w = worst_z[idx]
                    mlab = "platelets" if w == z_plt[idx] else ("egfr" if w == z_eg[idx] else "alt")
                    rationales[idx] = f"Negative divergence: {mlab} degrading significantly faster than Synthetic Control (z={w:.2f})."
            
            # Condition 2: Positive threshold
            eval_mask_2 = eval_mask & ~hold_mask
            pos_mask = eval_mask_2 & (max_pos_z > self.z_positive_threshold)
            if np.any(pos_mask):
                for idx in np.where(pos_mask)[0]:
                    rationales[idx] = f"Positive response: Vitals superior to Synthetic Control (z_plt={z_plt[idx]:.2f}, z_egfr={z_eg[idx]:.2f})."
                    
            # Condition 3: Stable
            stable_mask = eval_mask_2 & ~pos_mask
            if np.any(stable_mask):
                for idx in np.where(stable_mask)[0]:
                    rationales[idx] = f"Stable trajectory: Within acceptable control variance (z_plt={z_plt[idx]:.2f}, z_egfr={z_eg[idx]:.2f}, z_alt={z_alt[idx]:.2f})."

        # Build final logs
        all_logs: List[StepDecisionLog] = []
        for i in range(N):
            if active_mask[i]:
                # Build dicts for Pydantic models (we can't avoid this, but we avoided the math loops)
                p_belief = BeliefState(
                    mean_vector={m: round(float(x_hat[i, j]), 2) for j, m in enumerate(metric_names)},
                    variance_vector={m: round(float(P[i, j]), 4) for j, m in enumerate(metric_names)}
                )
                obs_dict = {m: float(observed[i, j]) for j, m in enumerate(metric_names)}
                
                log = StepDecisionLog(
                    day=day, patient_id=patient_ids[i], arm_id=arm_ids[i],
                    observed_labs=obs_dict, belief_state=p_belief,
                    action=ClinicalAction(actions[i]), rationale=rationales[i],
                    hard_override_triggered=bool(hard_overrides[i])
                )
                all_logs.append(log)

        return all_logs, all_alerts
