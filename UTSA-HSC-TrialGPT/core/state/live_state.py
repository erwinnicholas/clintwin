from typing import Dict
from clinical_math.kalman import BatchKalmanTracker
from simulation.agent import ClinicalPOMDPAgent
from core.config import _rules

class TrialLiveState:
    def __init__(self, run_id: str, trial_id: str):
        self.run_id = run_id
        self.trial_id = trial_id
        self.current_day = 0
        self.tracker: BatchKalmanTracker = None
        self.agent = ClinicalPOMDPAgent(_rules)
        self.patient_ids = []
        self.arm_assignments = {}
        self.drug_profiles = {}
        # Stores the forecast made at Day N-14 for Day N, to calculate Deltas
        self.previous_forecast = {} # pid -> {metric -> val}

# Global state dictionary for tracking active trials in memory
active_live_trials: Dict[str, TrialLiveState] = {}
