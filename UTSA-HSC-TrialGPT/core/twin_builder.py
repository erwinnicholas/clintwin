import numpy as np
from typing import List, Dict, Optional
from core.schemas import PatientBaseline, MetricSnapshot, DigitalTwinState
from clinical_math.denoising import ema_denoise, compute_ols_slope

class DigitalTwinBuilder:
    """
    Validates longitudinal history and builds a DigitalTwinState.
    """
    def __init__(self):
        self.dynamic_fields = [
            "egfr", "serum_creatinine", "alt", "ast", "platelets", 
            "anc", "hemoglobin", "systolic_bp", "diastolic_bp", "hba1c"
        ]

    def denoise_metric(self, values: np.ndarray) -> np.ndarray:
        return ema_denoise(values, alpha=0.6)

    def compute_slope(self, days: np.ndarray, values: np.ndarray) -> float:
        return compute_ols_slope(days, values, max_days=180.0)

    def build_twin(self, baseline: PatientBaseline, history: List[MetricSnapshot], is_diseased: bool = False) -> DigitalTwinState:
        reasons = []
        is_fit = True
        
        if len(history) < 3:
            reasons.append("Insufficient observations: requires at least 3 records.")
            is_fit = False
            return DigitalTwinState(
                patient_id=baseline.patient_id,
                static_profile=baseline,
                is_fit=is_fit,
                rejection_reasons=reasons,
                baseline_vector={},
                trajectory_slopes={},
                synthetic_disease_state="UNKNOWN"
            )

        # Sort history by days_ago descending (oldest to newest)
        history = sorted(history, key=lambda x: x.days_ago, reverse=True)
        
        if history[-1].days_ago > 30:
            reasons.append("Stale data: most recent record is older than 30 days.")
            is_fit = False

        days = np.array([h.days_ago for h in history])
        
        baseline_vector = {}
        trajectory_slopes = {}
        
        for field in self.dynamic_fields:
            raw_vals = np.array([getattr(h, field) for h in history])
            denoised = self.denoise_metric(raw_vals)
            slope = self.compute_slope(days, denoised)
            
            baseline_vector[field] = float(denoised[-1])
            trajectory_slopes[field] = float(slope)

        # Check for declining renal function
        if trajectory_slopes.get("egfr", 0) < -0.05: # Arbitrary threshold for decline
            reasons.append("Declining renal function: eGFR trajectory is significantly negative.")
            is_fit = False

        # Check for declining liver function (increasing ALT/AST)
        if trajectory_slopes.get("alt", 0) > 0.05 or trajectory_slopes.get("ast", 0) > 0.05:
            reasons.append("Hepatotoxicity risk: ALT/AST trajectory is significantly positive.")
            is_fit = False

        state_label = "HEALTHY_CONTROL" if not is_diseased else "DISEASED"
        if not is_fit and not is_diseased:
             state_label = "UNSTABLE_CONTROL"

        return DigitalTwinState(
            patient_id=baseline.patient_id,
            static_profile=baseline,
            is_fit=is_fit,
            rejection_reasons=reasons,
            baseline_vector=baseline_vector,
            trajectory_slopes=trajectory_slopes,
            synthetic_disease_state=state_label
        )
