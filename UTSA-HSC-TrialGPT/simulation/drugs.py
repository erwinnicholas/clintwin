"""
simulation/drugs.py — Stochastic Drug Perturbation Profiles
===========================================================
Defines per-metric daily effect rates with stochastic noise components
for each trial arm.
"""

import numpy as np
from typing import Dict
from core.schemas import DrugProfile


def sigmoid(x: float) -> float:
    """Numerically stable sigmoid for drug onset curves."""
    return 1.0 / (1.0 + np.exp(-np.clip(x, -500, 500)))


def compute_drug_effect(profile: DrugProfile, metric: str,
                        current_day: int, dt_days: float,
                        rng: np.random.Generator) -> float:
    """
    Computes the stochastic drug perturbation for a single metric
    at a given simulation day.
    """
    if metric not in profile.daily_effects:
        return 0.0

    # Sigmoidal onset: effect ramps up over ~14 days after onset_day
    ramp_rate = 7.0
    onset_factor = sigmoid((current_day - profile.onset_day) / ramp_rate)

    # Mean daily effect scaled by onset and timestep
    mean_effect = profile.daily_effects[metric] * onset_factor * dt_days

    # Stochastic noise component (scaled by √Δt for Brownian motion)
    noise_std = profile.noise_scales.get(metric, 0.0) * np.sqrt(dt_days)
    noise = rng.normal(0, noise_std) if noise_std > 0 else 0.0

    return mean_effect + noise


def load_profiles() -> Dict[str, DrugProfile]:
    from core.config_loader import load_drug_profiles
    return load_drug_profiles()

def generate_random_drug_profile(arm_id: str, seed: int = None) -> DrugProfile:
    """Generates a random disease progression / drug profile."""
    if seed is not None:
        np.random.seed(seed)
    
    # Pick random subsets of metrics to affect
    all_metrics = ["platelets", "alt", "ast", "egfr", "hemoglobin", "anc", "systolic_bp", "diastolic_bp", "serum_creatinine", "hba1c"]
    num_affected = np.random.randint(1, 5)
    affected_metrics = np.random.choice(all_metrics, size=num_affected, replace=False)
    
    daily_effects = {}
    for m in affected_metrics:
        # Generate some random drift. We scale by typical ranges.
        scale = 1.0
        if m == "platelets": scale = 100.0
        elif m == "anc": scale = 10.0
        elif m in ["alt", "ast"]: scale = 2.0
        elif m in ["egfr", "systolic_bp", "diastolic_bp"]: scale = 0.5
        elif m in ["hemoglobin", "serum_creatinine", "hba1c"]: scale = 0.05
        
        daily_effects[m] = float(np.random.normal(0, scale))

    # Base noise scales
    noise_scales = {
        "egfr": 1.0, "platelets": 1000.0, "alt": 2.0, "ast": 2.0,
        "hemoglobin": 0.1, "anc": 50.0, "systolic_bp": 1.0,
        "diastolic_bp": 0.8, "serum_creatinine": 0.02, "hba1c": 0.02
    }
    
    return DrugProfile(
        name=f"Custom Profile ({arm_id})",
        daily_effects=daily_effects,
        noise_scales=noise_scales,
        onset_day=int(np.random.randint(0, 21)),
        description="Randomly generated disease progression profile."
    )

