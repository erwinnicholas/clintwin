"""
tests/test_simulation.py — Tests for POMDP Agent & Engine
=========================================================
Tests the simulation decision logic and engine orchestration.
"""

from core.schemas import BeliefState, ClinicalAction
from core.config import CTCAE_THRESHOLDS
from core.config_loader import load_clinical_rules
_rules = load_clinical_rules()
from simulation.agent import ClinicalPOMDPAgent
from simulation.drugs import load_profiles, sigmoid, compute_drug_effect

_profiles = load_profiles()
PLACEBO = _profiles["ARM_CONTROL"]
VACCINE_A = _profiles["ARM_VACCINE_A"]
VACCINE_B = _profiles["ARM_VACCINE_B"]
import numpy as np


class TestPOMDPAgent:
    
    def setup_method(self):
        self.agent = ClinicalPOMDPAgent(_rules)

    def _make_belief(self, overrides=None) -> BeliefState:
        means = {
            "egfr": 80.0, "platelets": 200000.0, "alt": 30.0,
            "ast": 32.0, "hemoglobin": 13.0, "anc": 2500.0,
            "systolic_bp": 120.0, "diastolic_bp": 78.0,
        }
        variances = {m: 4.0 for m in means}
        if overrides:
            means.update(overrides)
        return BeliefState(mean_vector=means, variance_vector=variances)

    def test_hard_safety_platelets(self):
        belief = self._make_belief({"platelets": 45000.0})
        decision, alerts = self.agent.evaluate_policy(
            day=14, patient_id="T1", arm_id="ARM_VACCINE_A",
            patient_belief=belief, control_belief=None, observed_labs={}
        )
        assert decision.action == ClinicalAction.HALT_PATIENT
        assert decision.hard_override_triggered is True

    def test_hard_safety_alt(self):
        belief = self._make_belief({"alt": 160.0})
        decision, alerts = self.agent.evaluate_policy(
            day=14, patient_id="T1", arm_id="ARM_VACCINE_A",
            patient_belief=belief, control_belief=None, observed_labs={}
        )
        assert decision.action == ClinicalAction.HOLD_DOSE
        assert decision.hard_override_triggered is True

    def test_negative_divergence_zscore(self):
        treated = self._make_belief({"platelets": 100000.0})
        control = self._make_belief({"platelets": 200000.0})
        decision, alerts = self.agent.evaluate_policy(
            day=14, patient_id="T1", arm_id="ARM_VACCINE_A",
            patient_belief=treated, control_belief=control, observed_labs={}
        )
        assert decision.action == ClinicalAction.HOLD_DOSE
        assert "Negative divergence" in decision.rationale

    def test_adversarial_control_divergence(self):
        """Adversarial Test: What if the control arm is crashing faster than treated?"""
        treated = self._make_belief({"egfr": 50.0}) # Bad
        control = self._make_belief({"egfr": 31.0}) # Much worse
        decision, alerts = self.agent.evaluate_policy(
            day=14, patient_id="T1", arm_id="ARM_VACCINE_A",
            patient_belief=treated, control_belief=control, observed_labs={}
        )
        # Treated is actually doing better than control (positive z-score)
        # So action should be CONTINUE
        assert decision.action == ClinicalAction.CONTINUE
        assert "Positive response" in decision.rationale


def test_drug_effect_sigmoid():
    assert 0.0 <= sigmoid(-100) <= 0.1
    assert 0.9 <= sigmoid(100) <= 1.0
    assert np.isclose(sigmoid(0), 0.5)
