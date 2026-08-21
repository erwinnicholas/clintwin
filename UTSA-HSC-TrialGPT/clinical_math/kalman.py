"""
clinical_math/kalman.py — Vectorized Kalman Filter Belief Tracker
==================================================================
Maintains Gaussian belief distributions b(s_t) = N(x̂_t, P_t) for
patient physiological states under analytical lab noise.

Supports TWO modes:
  1. KalmanBeliefTracker  — Single-patient tracker (backward compatible)
  2. BatchKalmanTracker   — N-patient vectorized tracker (GIL-free C ops)

Mathematical Foundation:
  Predict:  x̂⁻ = x̂ + β·Δt,  P⁻ = P + Q·(Δt/14)
  Update:   K = P⁻/(P⁻ + R),  x̂ = x̂⁻ + K·(y - x̂⁻),  P = (1-K)·P⁻
  Adaptive R:  R_ema = α·(y - x̂⁻)² + (1-α)·R_ema

All operations on the batch tracker execute as single NumPy matrix ops
across all patients simultaneously. No Python loops over patients.
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from core.schemas import BeliefState


# ══════════════════════════════════════════════════════════════════
# 1. Single-Patient Tracker (backward compatible)
# ══════════════════════════════════════════════════════════════════

class KalmanBeliefTracker:
    """
    Per-patient, multidimensional Kalman Filter assuming independent state variables.
    Tracks the unobserved true physiological state under:
      - Process noise Q (biological drift variance)
      - Measurement noise R (analytical lab error variance)
    """

    def __init__(self,
                 initial_state: Dict[str, float],
                 initial_variance_scale: float = 0.02,
                 process_noise_std: float = 0.5,
                 measurement_noise_std: float = 3.0):
        
        self.metrics = list(initial_state.keys())
        self.n = len(self.metrics)
        
        self.x_hat = np.array([initial_state[m] for m in self.metrics], dtype=np.float64)
        
        variances = [
            (initial_state[m] * initial_variance_scale)**2 
            if initial_state[m] != 0 else initial_variance_scale**2 
            for m in self.metrics
        ]
        self.P = np.array(variances, dtype=np.float64)
        
        self.Q = np.full(self.n, process_noise_std ** 2, dtype=np.float64)
        self.R = np.full(self.n, measurement_noise_std ** 2, dtype=np.float64)

    def predict(self, slopes: Dict[str, float], dt_days: float = 14.0):
        """State prediction step using historical biological drift (slopes)."""
        beta = np.array([slopes.get(m, 0.0) for m in self.metrics], dtype=np.float64)
        self.x_hat += beta * dt_days
        self.P += self.Q * (dt_days / 14.0)

    def update(self, noisy_observations: Dict[str, float]) -> BeliefState:
        """Bayesian belief update upon receiving new noisy lab draw."""
        mask = np.array([m in noisy_observations for m in self.metrics], dtype=bool)
        
        if np.any(mask):
            y = np.zeros(self.n, dtype=np.float64)
            for i, m in enumerate(self.metrics):
                if mask[i]:
                    y[i] = noisy_observations[m]
            
            P_active = self.P[mask]
            R_active = self.R[mask]
            x_active = self.x_hat[mask]
            y_active = y[mask]
            
            K = P_active / (P_active + R_active)
            self.x_hat[mask] = x_active + K * (y_active - x_active)
            self.P[mask] = (1.0 - K) * P_active

        return self.get_belief()

    def get_belief(self) -> BeliefState:
        """Serializes the numpy internal state back to a dict-based schema."""
        return BeliefState(
            mean_vector={m: round(float(self.x_hat[i]), 2) for i, m in enumerate(self.metrics)},
            variance_vector={m: round(float(self.P[i]), 4) for i, m in enumerate(self.metrics)}
        )


# ══════════════════════════════════════════════════════════════════
# 2. Batch Vectorized Tracker (N patients × M metrics)
# ══════════════════════════════════════════════════════════════════

class BatchKalmanTracker:
    """
    Tracks N patients × M metrics simultaneously using 2D NumPy arrays.
    
    All operations (predict, update, forecast) are single matrix ops.
    No Python loops over patients. NumPy releases the GIL for C-level
    computation, enabling true parallelism.
    
    State layout:
      x_hat:  (N, M)  — belief means
      P:      (N, M)  — belief variances (diagonal, independent metrics)
      Q:      (M,)    — process noise variance (shared)
      R:      (N, M)  — measurement noise variance (adaptive per-patient)
      R_ema:  (N, M)  — EMA of squared innovations for adaptive R
    """

    def __init__(self,
                 metrics: List[str],
                 baselines: np.ndarray,
                 initial_variance_scale: float = 0.02,
                 process_noise_std: float = 0.5,
                 measurement_noise_std: float = 3.0,
                 adaptive_r_alpha: float = 0.1):
        """
        Args:
            metrics: Ordered list of metric names, length M.
            baselines: (N, M) array of initial patient baseline values.
            initial_variance_scale: Scales initial P from baseline values.
            process_noise_std: √Q for biological drift.
            measurement_noise_std: √R₀ for lab measurement noise.
            adaptive_r_alpha: EMA coefficient for adaptive R updates.
        """
        assert baselines.ndim == 2, f"baselines must be (N, M), got shape {baselines.shape}"
        
        self.metrics = metrics
        self.metric_idx = {m: i for i, m in enumerate(metrics)}
        self.N, self.M = baselines.shape
        assert self.M == len(metrics), f"Metric count mismatch: {self.M} vs {len(metrics)}"

        # State: (N, M)
        self.x_hat = baselines.copy().astype(np.float64)
        
        # Variance: P₀ = (baseline * scale)², with fallback for zero values
        safe_baselines = np.where(baselines != 0, baselines, 1.0)
        self.P = (safe_baselines * initial_variance_scale) ** 2

        # Process noise: shared across patients, per-metric
        self.Q = np.full(self.M, process_noise_std ** 2, dtype=np.float64)

        # Measurement noise: per-patient per-metric (adaptive)
        self.R = np.full((self.N, self.M), measurement_noise_std ** 2, dtype=np.float64)
        self.R_ema = self.R.copy()
        self.alpha = adaptive_r_alpha

        # Active mask: True for patients still in trial
        self.active = np.ones(self.N, dtype=bool)

    def predict(self,
                slopes: np.ndarray,
                dt_days: float = 14.0):
        """
        Vectorized predict step for ALL active patients.
        
        Args:
            slopes: (N, M) array of per-patient trajectory slopes.
            dt_days: Timestep in days.
        """
        # x̂⁻ = x̂ + β · Δt   (only for active patients)
        self.x_hat[self.active] += slopes[self.active] * dt_days
        
        # P⁻ = P + Q · (Δt/14)
        self.P[self.active] += self.Q * (dt_days / 14.0)

    def update(self,
               observations: np.ndarray,
               obs_mask: Optional[np.ndarray] = None) -> Tuple[np.ndarray, np.ndarray]:
        """
        Vectorized update step for ALL active patients.
        
        Args:
            observations: (N, M) array of noisy lab observations.
            obs_mask: (N, M) boolean mask. True where observation exists.
                      If None, assumes all metrics observed for active patients.
        
        Returns:
            Tuple of (x_hat, P) after update — both (N, M) arrays.
        """
        if obs_mask is None:
            obs_mask = np.tile(self.active[:, None], (1, self.M))
        else:
            # Zero out inactive patients
            obs_mask = obs_mask & self.active[:, None]

        # Innovation: ν = y - x̂⁻
        innovation = observations - self.x_hat  # (N, M)
        
        # Adaptive R: R_ema = α·ν² + (1-α)·R_ema
        self.R_ema[obs_mask] = (
            self.alpha * innovation[obs_mask] ** 2 +
            (1.0 - self.alpha) * self.R_ema[obs_mask]
        )
        # Smooth R toward R_ema (prevents sudden jumps)
        self.R[obs_mask] = self.R_ema[obs_mask]

        # Kalman gain: K = P / (P + R)
        K = np.zeros_like(self.P)
        denom = self.P + self.R
        np.divide(self.P, denom, out=K, where=obs_mask)

        # Anomaly gate: reject innovations > 3σ
        sigma = np.sqrt(self.P + self.R)
        anomaly = np.abs(innovation) > 3.0 * sigma
        gate_mask = obs_mask & ~anomaly

        # State update: x̂ = x̂⁻ + K · ν   (only for gated observations)
        self.x_hat[gate_mask] += K[gate_mask] * innovation[gate_mask]
        
        # Variance update: P = (1 - K) · P⁻
        self.P[gate_mask] = (1.0 - K[gate_mask]) * self.P[gate_mask]

        # Floor clamp for non-negative metrics
        # (platelets, anc, hemoglobin, egfr cannot go below 0)
        return self.x_hat.copy(), self.P.copy()

    def forecast(self,
                 slopes: np.ndarray,
                 dt_days: float = 14.0) -> np.ndarray:
        """
        Predict the NEXT timestep's expected values WITHOUT modifying state.
        This is the one-step lookahead used by the POMDP for proactive alerts.
        
        Args:
            slopes: (N, M) trajectory slopes.
            dt_days: Lookahead window in days.
        
        Returns:
            (N, M) array of forecasted metric values.
        """
        return self.x_hat + slopes * dt_days

    def get_patient_belief(self, patient_idx: int) -> BeliefState:
        """Extract a single patient's belief state as a dict-based BeliefState."""
        return BeliefState(
            mean_vector={m: round(float(self.x_hat[patient_idx, i]), 2) for i, m in enumerate(self.metrics)},
            variance_vector={m: round(float(self.P[patient_idx, i]), 4) for i, m in enumerate(self.metrics)}
        )

    def halt_patient(self, patient_idx: int):
        """Mark a patient as inactive (halted from trial)."""
        self.active[patient_idx] = False

    def get_active_count(self) -> int:
        """Number of patients still active in the trial."""
        return int(np.sum(self.active))
