"""
tests/test_phase3.py — Unit Tests for the Digital Twin Builder
===============================================================
Mathematically proves that:
  1. Stable patients pass trajectory validation
  2. Declining patients are rejected with correct reasons
  3. The sampling floor (< 3 observations) is enforced
  4. Stale data (> 30 days) triggers rejection
  5. EMA denoising produces smoother output than raw input
  6. OLS slope calculation is directionally correct
"""

import pytest
import numpy as np
from core.schemas import PatientBaseline, MetricSnapshot
from core.twin_builder import DigitalTwinBuilder


# ── Shared Fixtures ──────────────────────────────────────────────

def _make_baseline(patient_id: str = "T-100") -> PatientBaseline:
    return PatientBaseline(
        patient_id=patient_id, age=45, sex="F", bmi=24.0,
        is_pregnant=0, ecog_score=0, hiv_status=0,
        hepb_status=0, hepc_status=0, irb_consent_signed=1
    )


def _make_stable_history() -> list[MetricSnapshot]:
    """3 encounters, stable across all metrics."""
    return [
        MetricSnapshot(days_ago=180, egfr=85.0, serum_creatinine=0.9, alt=25.0,
                       ast=28.0, platelets=240000, anc=3000, hemoglobin=13.5,
                       systolic_bp=120, diastolic_bp=78, hba1c=5.4),
        MetricSnapshot(days_ago=90, egfr=83.0, serum_creatinine=0.92, alt=27.0,
                       ast=29.0, platelets=235000, anc=2950, hemoglobin=13.2,
                       systolic_bp=122, diastolic_bp=79, hba1c=5.5),
        MetricSnapshot(days_ago=10, egfr=82.0, serum_creatinine=0.91, alt=26.0,
                       ast=27.0, platelets=232000, anc=3020, hemoglobin=13.4,
                       systolic_bp=121, diastolic_bp=77, hba1c=5.4),
    ]


def _make_declining_renal_history() -> list[MetricSnapshot]:
    """eGFR crashes from 88 → 68 → 52 over 6 months."""
    return [
        MetricSnapshot(days_ago=180, egfr=88.0, serum_creatinine=1.0, alt=30.0,
                       ast=32.0, platelets=210000, anc=2800, hemoglobin=12.8,
                       systolic_bp=130, diastolic_bp=84, hba1c=5.8),
        MetricSnapshot(days_ago=90, egfr=68.0, serum_creatinine=1.4, alt=32.0,
                       ast=34.0, platelets=205000, anc=2750, hemoglobin=12.5,
                       systolic_bp=135, diastolic_bp=86, hba1c=5.9),
        MetricSnapshot(days_ago=5, egfr=52.0, serum_creatinine=1.9, alt=34.0,
                       ast=35.0, platelets=198000, anc=2700, hemoglobin=12.2,
                       systolic_bp=138, diastolic_bp=88, hba1c=6.0),
    ]


def _make_declining_liver_history() -> list[MetricSnapshot]:
    """ALT/AST spike: +0%, +40%, +80% over 6 months."""
    return [
        MetricSnapshot(days_ago=180, egfr=82.0, serum_creatinine=1.1, alt=28.0,
                       ast=30.0, platelets=220000, anc=3200, hemoglobin=13.0,
                       systolic_bp=125, diastolic_bp=78, hba1c=5.6),
        MetricSnapshot(days_ago=90, egfr=80.0, serum_creatinine=1.12, alt=39.2,
                       ast=42.0, platelets=218000, anc=3150, hemoglobin=12.9,
                       systolic_bp=126, diastolic_bp=79, hba1c=5.7),
        MetricSnapshot(days_ago=10, egfr=81.0, serum_creatinine=1.1, alt=50.4,
                       ast=54.0, platelets=215000, anc=3100, hemoglobin=12.8,
                       systolic_bp=127, diastolic_bp=80, hba1c=5.6),
    ]


# ── Tests ────────────────────────────────────────────────────────

class TestDigitalTwinBuilder:

    def setup_method(self):
        self.builder = DigitalTwinBuilder()
        self.baseline = _make_baseline()

    # 1. Stable patient passes
    def test_stable_patient_passes(self):
        twin = self.builder.build_twin(
            self.baseline, _make_stable_history(), is_diseased=False
        )
        assert twin.is_fit is True
        assert twin.rejection_reasons == []
        assert twin.synthetic_disease_state == "HEALTHY_CONTROL"
        assert len(twin.baseline_vector) == 10  # all 10 dynamic fields
        assert len(twin.trajectory_slopes) == 10

    # 2. Declining renal patient is rejected
    def test_declining_renal_rejected(self):
        twin = self.builder.build_twin(
            self.baseline, _make_declining_renal_history(), is_diseased=True
        )
        assert twin.is_fit is False
        assert any("renal" in r.lower() for r in twin.rejection_reasons)
        assert twin.synthetic_disease_state == "DISEASED"

    # 3. Declining liver patient is rejected
    def test_declining_liver_rejected(self):
        twin = self.builder.build_twin(
            self.baseline, _make_declining_liver_history(), is_diseased=False
        )
        assert twin.is_fit is False
        assert any("hepatotoxicity" in r.lower() or "alt" in r.upper()
                    for r in twin.rejection_reasons)

    # 4. Sampling floor: fewer than 3 observations → rejected
    def test_insufficient_observations(self):
        short_history = _make_stable_history()[:2]  # only 2 encounters
        twin = self.builder.build_twin(
            self.baseline, short_history, is_diseased=False
        )
        assert twin.is_fit is False
        assert any("insufficient" in r.lower() for r in twin.rejection_reasons)
        assert twin.baseline_vector == {}  # Early exit, no processing

    # 5. Stale data: most recent record > 30 days old
    def test_stale_data_rejected(self):
        stale_history = [
            MetricSnapshot(days_ago=180, egfr=85, serum_creatinine=0.9,
                           alt=25, ast=28, platelets=240000, anc=3000,
                           hemoglobin=13.5, systolic_bp=120, diastolic_bp=78,
                           hba1c=5.4),
            MetricSnapshot(days_ago=120, egfr=84, serum_creatinine=0.91,
                           alt=26, ast=27, platelets=238000, anc=2980,
                           hemoglobin=13.4, systolic_bp=121, diastolic_bp=77,
                           hba1c=5.5),
            MetricSnapshot(days_ago=60, egfr=83, serum_creatinine=0.92,
                           alt=27, ast=29, platelets=235000, anc=2960,
                           hemoglobin=13.3, systolic_bp=122, diastolic_bp=79,
                           hba1c=5.4),
        ]
        twin = self.builder.build_twin(
            self.baseline, stale_history, is_diseased=False
        )
        assert any("stale" in r.lower() for r in twin.rejection_reasons)

    # 6. EMA denoising smooths noisy input
    def test_ema_denoising(self):
        noisy = np.array([100.0, 120.0, 80.0, 110.0, 90.0])
        smoothed = self.builder.denoise_metric(noisy)
        # Smoothed variance should be less than raw variance
        assert np.var(smoothed) < np.var(noisy)

    # 7. OLS slope is directionally correct
    def test_slope_positive_trend(self):
        days = np.array([180, 90, 10])   # oldest to newest
        values = np.array([100.0, 110.0, 120.0])  # increasing
        slope = self.builder.compute_slope(days, values)
        assert slope > 0  # Positive trend

    def test_slope_negative_trend(self):
        days = np.array([180, 90, 10])
        values = np.array([120.0, 110.0, 100.0])  # decreasing
        slope = self.builder.compute_slope(days, values)
        assert slope < 0  # Negative trend
