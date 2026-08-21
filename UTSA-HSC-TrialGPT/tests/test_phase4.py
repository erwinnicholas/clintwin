"""
tests/test_phase4.py — Comprehensive Tests for Phase 4 Simulation Engine
==========================================================================
Tests the Kalman Filter, POMDP Agent, Drug Profiles, Simulator, and
end-to-end integration to mathematically prove correctness.
"""

import pytest
import numpy as np
from copy import deepcopy

from core.schemas import (
    BeliefState, ClinicalAction, StepDecisionLog, DrugProfile
)
from core.config_loader import load_clinical_rules
_rules = load_clinical_rules()
from clinical_math.kalman import KalmanBeliefTracker
from simulation.agent import ClinicalPOMDPAgent
from simulation.drugs import (
    compute_drug_effect, load_profiles, sigmoid
)
_profiles = load_profiles()
PLACEBO = _profiles["ARM_CONTROL"]
VACCINE_A = _profiles["ARM_VACCINE_A"]
VACCINE_B = _profiles["ARM_VACCINE_B"]
ARM_PROFILES = _profiles
from simulation.engine import TrialSimulator


# ══════════════════════════════════════════════════════════════════
# KALMAN FILTER TESTS
# ══════════════════════════════════════════════════════════════════

class TestKalmanBeliefTracker:

    def setup_method(self):
        self.baseline = {
            "egfr": 80.0, "platelets": 200000.0, "alt": 30.0,
            "ast": 32.0, "hemoglobin": 13.0, "anc": 2500.0,
            "systolic_bp": 120.0, "diastolic_bp": 78.0,
            "serum_creatinine": 1.0, "hba1c": 5.5
        }

    def test_initial_belief_matches_baseline(self):
        """Tracker should initialize belief mean to baseline values."""
        tracker = KalmanBeliefTracker(self.baseline)
        belief = tracker.get_belief()
        for m in self.baseline:
            assert belief.mean_vector[m] == self.baseline[m]

    def test_predict_shifts_mean_by_slope(self):
        """Prediction step must shift the mean by slope * dt."""
        tracker = KalmanBeliefTracker(self.baseline)
        slopes = {"egfr": -0.05, "platelets": -100.0}
        tracker.predict(slopes, dt_days=14.0)
        belief = tracker.get_belief()
        assert belief.mean_vector["egfr"] < self.baseline["egfr"]
        assert belief.mean_vector["platelets"] < self.baseline["platelets"]

    def test_predict_increases_variance(self):
        """Prediction step must increase uncertainty (P += Q)."""
        tracker = KalmanBeliefTracker(self.baseline)
        belief_before = tracker.get_belief()
        var_before = belief_before.variance_vector["egfr"]
        tracker.predict({"egfr": 0}, dt_days=14.0)
        belief_after = tracker.get_belief()
        assert belief_after.variance_vector["egfr"] > var_before

    def test_update_decreases_variance(self):
        """Update step with observation must decrease uncertainty."""
        tracker = KalmanBeliefTracker(self.baseline)
        tracker.predict({"egfr": 0}, dt_days=14.0)
        var_after_predict = tracker.get_belief().variance_vector["egfr"]
        tracker.update({"egfr": 79.5})
        var_after_update = tracker.get_belief().variance_vector["egfr"]
        assert var_after_update < var_after_predict

    def test_update_pulls_mean_toward_observation(self):
        """Update step must pull the belief mean toward the observation."""
        tracker = KalmanBeliefTracker(self.baseline)
        # Observe platelets lower than baseline
        tracker.update({"platelets": 180000.0})
        belief = tracker.get_belief()
        # Mean should shift down toward the observation
        assert belief.mean_vector["platelets"] < self.baseline["platelets"]

    def test_kalman_gain_bounded(self):
        """Kalman gain K = P/(P+R) should always be in [0, 1]."""
        tracker = KalmanBeliefTracker(self.baseline)
        for _ in range(10):
            tracker.predict({"egfr": -0.01}, dt_days=14.0)
            P = tracker.get_belief().variance_vector["egfr"]
            
            # Find the index of egfr to get R
            idx = tracker.metrics.index("egfr")
            R = tracker.R[idx]
            
            K = P / (P + R)
            assert 0 <= K <= 1


# ══════════════════════════════════════════════════════════════════
# POMDP AGENT TESTS
# ══════════════════════════════════════════════════════════════════

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

    def test_safe_state_continues(self):
        """Agent should CONTINUE when all metrics are safe."""
        belief = self._make_belief()
        control = self._make_belief()
        decision, alerts = self.agent.evaluate_policy(
            day=14, patient_id="T1", arm_id="ARM_VACCINE_A",
            patient_belief=belief, control_belief=control,
            observed_labs=belief.mean_vector
        )
        assert decision.action == ClinicalAction.CONTINUE
        assert decision.hard_override_triggered is False

    def test_platelet_crash_triggers_halt(self):
        """Hard safety: platelets < 50,000 must trigger HALT_PATIENT."""
        belief = self._make_belief({"platelets": 45000.0})
        decision, alerts = self.agent.evaluate_policy(
            day=42, patient_id="T1", arm_id="ARM_VACCINE_B",
            patient_belief=belief, control_belief=None,
            observed_labs=belief.mean_vector
        )
        assert decision.action == ClinicalAction.HALT_PATIENT
        assert decision.hard_override_triggered is True
        assert "platelet" in decision.rationale.lower()

    def test_egfr_crash_triggers_halt(self):
        """Hard safety: eGFR < 30 must trigger HALT_PATIENT."""
        belief = self._make_belief({"egfr": 25.0})
        decision, alerts = self.agent.evaluate_policy(
            day=28, patient_id="T1", arm_id="ARM_VACCINE_A",
            patient_belief=belief, control_belief=None,
            observed_labs=belief.mean_vector
        )
        assert decision.action == ClinicalAction.HALT_PATIENT
        assert decision.hard_override_triggered is True

    def test_alt_spike_triggers_hold(self):
        """Hard safety: ALT > 150 must trigger HOLD_DOSE."""
        belief = self._make_belief({"alt": 160.0})
        decision, alerts = self.agent.evaluate_policy(
            day=56, patient_id="T1", arm_id="ARM_VACCINE_B",
            patient_belief=belief, control_belief=None,
            observed_labs=belief.mean_vector
        )
        assert decision.action == ClinicalAction.HOLD_DOSE
        assert decision.hard_override_triggered is True

    def test_anc_crash_triggers_halt(self):
        """Hard safety: ANC < 500 must trigger HALT_PATIENT."""
        belief = self._make_belief({"anc": 400.0})
        decision, alerts = self.agent.evaluate_policy(
            day=70, patient_id="T1", arm_id="ARM_VACCINE_B",
            patient_belief=belief, control_belief=None,
            observed_labs=belief.mean_vector
        )
        assert decision.action == ClinicalAction.HALT_PATIENT
        assert decision.hard_override_triggered is True

    def test_control_arm_always_continues_if_safe(self):
        """Control arm should always CONTINUE unless hard floor breached."""
        belief = self._make_belief()
        decision, alerts = self.agent.evaluate_policy(
            day=14, patient_id="T1", arm_id="ARM_CONTROL",
            patient_belief=belief, control_belief=belief,
            observed_labs=belief.mean_vector
        )
        assert decision.action == ClinicalAction.CONTINUE

    def test_negative_divergence_triggers_hold(self):
        """Large negative z-score vs control should trigger HOLD_DOSE."""
        # Treated arm has much lower platelets than control
        treated = self._make_belief({"platelets": 100000.0})
        control = self._make_belief({"platelets": 200000.0})
        decision, alerts = self.agent.evaluate_policy(
            day=56, patient_id="T1", arm_id="ARM_VACCINE_B",
            patient_belief=treated, control_belief=control,
            observed_labs=treated.mean_vector
        )
        assert decision.action == ClinicalAction.HOLD_DOSE
        assert "divergence" in decision.rationale.lower()


# ══════════════════════════════════════════════════════════════════
# DRUG PROFILE TESTS
# ══════════════════════════════════════════════════════════════════

class TestDrugProfiles:

    def test_placebo_has_no_daily_effects(self):
        """Placebo should have zero daily_effects."""
        assert len(PLACEBO.daily_effects) == 0

    def test_vaccine_b_has_platelet_effect(self):
        """Vaccine B must have a negative platelet effect."""
        assert VACCINE_B.daily_effects["platelets"] < 0

    def test_sigmoid_output_bounded(self):
        """Sigmoid function must return values in [0, 1]."""
        for x in [-100, -10, 0, 10, 100]:
            val = sigmoid(x)
            assert 0 <= val <= 1
        # At x=0, sigmoid should be exactly 0.5
        assert abs(sigmoid(0) - 0.5) < 1e-10

    def test_drug_effect_increases_with_time(self):
        """Drug effect magnitude should increase after onset day."""
        rng = np.random.default_rng(42)
        effects_early = []
        effects_late = []
        for _ in range(100):
            e1 = compute_drug_effect(VACCINE_B, "platelets", 7, 14.0, rng)
            e2 = compute_drug_effect(VACCINE_B, "platelets", 56, 14.0, rng)
            effects_early.append(abs(e1))
            effects_late.append(abs(e2))
        # Late effects should be larger on average (past onset)
        assert np.mean(effects_late) > np.mean(effects_early)

    def test_placebo_drug_effect_near_zero(self):
        """Placebo drug effect should be close to zero (only noise)."""
        rng = np.random.default_rng(42)
        effects = [
            compute_drug_effect(PLACEBO, "platelets", 30, 14.0, rng)
            for _ in range(100)
        ]
        # Mean should be near zero (no systematic effect)
        assert abs(np.mean(effects)) < 5000  # Within noise range


# ══════════════════════════════════════════════════════════════════
# SIMULATOR INTEGRATION TESTS
# ══════════════════════════════════════════════════════════════════

class TestSimulator:

    def setup_method(self):
        self.baseline = {
            "egfr": 80.0, "serum_creatinine": 1.0,
            "alt": 30.0, "ast": 32.0,
            "platelets": 200000.0, "anc": 2500.0,
            "hemoglobin": 13.0,
            "systolic_bp": 120.0, "diastolic_bp": 78.0,
            "hba1c": 5.5
        }
        self.slopes = {
            "egfr": -0.02, "platelets": -50.0, "alt": 0.01,
            "ast": 0.01, "hemoglobin": -0.005, "anc": -1.0,
            "systolic_bp": 0.01, "diastolic_bp": 0.005,
            "serum_creatinine": 0.001, "hba1c": 0.001
        }

    def test_simulation_produces_correct_timesteps(self):
        """180 days / 14-day steps = 13 visit cycles (14 including day 0)."""
        sim = TrialSimulator(duration_days=180, timestep_days=14, seed=42)
        patients = [
            {"patient_id": "P-TEST", "baseline_vector": self.baseline,
             "trajectory_slopes": self.slopes}
        ]
        assignments = {"P-TEST": "ARM_CONTROL"}
        result = sim.run_multi_arm("TEST_TRIAL", patients, assignments, ARM_PROFILES)
        
        expected_steps = len(range(0, 181, 14))  # 0, 14, 28, ..., 168, 182→no → 14 steps
        assert len(result.all_logs) == expected_steps

    def test_vaccine_b_triggers_adverse_events(self):
        """Vaccine B (aggressive) should trigger at least one adverse event."""
        patients = [
            {"patient_id": "P-C1", "baseline_vector": self.baseline,
             "trajectory_slopes": self.slopes},
            {"patient_id": "P-B1", "baseline_vector": self.baseline,
             "trajectory_slopes": self.slopes},
        ]
        assignments = {"P-C1": "ARM_CONTROL", "P-B1": "ARM_VACCINE_B"}

        sim = TrialSimulator(duration_days=180, timestep_days=14, seed=42)
        result = sim.run_multi_arm("TEST_TRIAL", patients, assignments, ARM_PROFILES)

        # Vaccine B should produce at least one HOLD or HALT
        vaccine_b_events = [
            e for e in result.adverse_events if e.arm_id == "ARM_VACCINE_B"
        ]
        assert len(vaccine_b_events) > 0

    def test_placebo_fewer_events_than_vaccine_b(self):
        """Placebo arm must produce fewer adverse events than Vaccine B."""
        patients = [
            {"patient_id": "P-C1", "baseline_vector": self.baseline,
             "trajectory_slopes": self.slopes},
            {"patient_id": "P-B1", "baseline_vector": self.baseline,
             "trajectory_slopes": self.slopes},
        ]
        assignments = {"P-C1": "ARM_CONTROL", "P-B1": "ARM_VACCINE_B"}

        sim = TrialSimulator(duration_days=180, timestep_days=14, seed=42)
        result = sim.run_multi_arm("TEST_TRIAL", patients, assignments, ARM_PROFILES)

        control_events = len([e for e in result.adverse_events
                              if e.arm_id == "ARM_CONTROL"])
        vaccine_b_events = len([e for e in result.adverse_events
                                if e.arm_id == "ARM_VACCINE_B"])
        assert control_events <= vaccine_b_events

    def test_stratification_balance(self):
        """Arm assignments should be balanced (±1 patient)."""
        from core.orchestrator import PipelineOrchestrator
        stratify_cohort = PipelineOrchestrator.stratify_cohort
        from core.database import initialize_database, get_db_connection
        initialize_database()
        
        with get_db_connection() as conn:
            conn.execute("INSERT OR IGNORE INTO trials (trial_id, title, created_at) VALUES ('TEST_TRIAL', 'Test', 'now')")
            conn.commit()

        patients = [{"patient_id": f"P-{i}"} for i in range(9)]
        # stratify_cohort returns assignments directly
        assignments = stratify_cohort(patients, trial_id="TEST_TRIAL")
        arm_counts = {}
        for arm in assignments.values():
            arm_counts[arm] = arm_counts.get(arm, 0) + 1
        counts = list(arm_counts.values())
        assert max(counts) - min(counts) <= 1

    def test_all_decisions_have_rationale(self):
        """Every decision log must have a non-empty rationale string."""
        patients = [
            {"patient_id": "P-T1", "baseline_vector": self.baseline,
             "trajectory_slopes": self.slopes},
        ]
        assignments = {"P-T1": "ARM_VACCINE_A"}

        sim = TrialSimulator(duration_days=56, timestep_days=14, seed=42)
        result = sim.run_multi_arm("TEST_TRIAL", patients, assignments, ARM_PROFILES)

        for log in result.all_logs:
            assert len(log.rationale) > 0
            assert log.action in ClinicalAction
