"""
tests/test_math.py — Tests for Clinical Math Engine
===================================================
Tests EMA denoising, OLS slopes, and the numpy Kalman Filter.
"""

import numpy as np
from clinical_math.denoising import ema_denoise, compute_ols_slope
from clinical_math.kalman import KalmanBeliefTracker


def test_ema_denoise():
    """Verify EMA smoothing reduces high-frequency noise."""
    series = np.array([100.0, 150.0, 100.0, 150.0])
    smoothed = ema_denoise(series, alpha=0.5)
    # 100
    # 0.5(150) + 0.5(100) = 125
    # 0.5(100) + 0.5(125) = 112.5
    # 0.5(150) + 0.5(112.5) = 131.25
    np.testing.assert_allclose(smoothed, [100.0, 125.0, 112.5, 131.25])


def test_compute_ols_slope():
    """Verify OLS computes correct linear slope over 180 days."""
    days_ago = np.array([180, 90, 0])
    values = np.array([100.0, 190.0, 280.0])
    # Delta Y = 180 over 180 days -> slope = +1.0
    slope = compute_ols_slope(days_ago, values)
    assert np.isclose(slope, 1.0)


class TestKalmanBeliefTracker:

    def setup_method(self):
        self.baseline = {
            "egfr": 80.0, "platelets": 200000.0, "alt": 30.0,
            "ast": 32.0, "hemoglobin": 13.0, "anc": 2500.0,
            "systolic_bp": 120.0, "diastolic_bp": 78.0,
            "serum_creatinine": 1.0, "hba1c": 5.5
        }

    def test_predict_shifts_mean_by_slope(self):
        tracker = KalmanBeliefTracker(self.baseline)
        slopes = {"egfr": -0.05, "platelets": -100.0}
        tracker.predict(slopes, dt_days=14.0)
        belief = tracker.get_belief()
        assert belief.mean_vector["egfr"] < self.baseline["egfr"]
        assert belief.mean_vector["platelets"] < self.baseline["platelets"]

    def test_update_decreases_variance(self):
        tracker = KalmanBeliefTracker(self.baseline)
        tracker.predict({"egfr": 0}, dt_days=14.0)
        var_before = tracker.get_belief().variance_vector["egfr"]
        tracker.update({"egfr": 79.5})
        var_after = tracker.get_belief().variance_vector["egfr"]
        assert var_after < var_before

    def test_kalman_adversarial_noise(self):
        """Adversarial Test: Ensure massive outlier is dampened by variance bounds."""
        tracker = KalmanBeliefTracker(self.baseline, initial_variance_scale=0.02, measurement_noise_std=10.0)
        
        # Predict stable trajectory
        tracker.predict({"egfr": 0.0}, dt_days=14.0)
        # So a huge outlier should barely move the mean.
        tracker.update({"alt": 1000.0})
        belief = tracker.get_belief()
        
        # ALT should NOT shoot up to 1000. Should stay very close to 30.0.
        assert belief.mean_vector["alt"] < 40.0
