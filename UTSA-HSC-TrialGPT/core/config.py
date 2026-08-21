"""
core/config.py — Centralized Configuration & Settings
=====================================================
Single source of truth for database paths, simulation constants,
and deterministic safety thresholds.
"""

import os
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data"
RESULTS_DIR = BASE_DIR / "results"

DB_PATH = DATA_DIR / "clinical_trial.db"
RULES_CSV_PATH = DATA_DIR / "trial_rules.csv"

# Pre-computed paths for intermediate JSONs
TWINS_JSON_PATH = RESULTS_DIR / "digital_twins.json"
FLAGS_JSON_PATH = RESULTS_DIR / "simulation_flags.json"
SUMMARY_JSON_PATH = RESULTS_DIR / "simulation_summary.json"


from core.config_loader import load_clinical_rules

_rules = load_clinical_rules()

# ── Simulation Constants (Phase 4) ───────────────────────────────
class SimulationConfig:
    DURATION_DAYS: int = _rules["simulation_defaults"]["duration_days"]
    TIMESTEP_DAYS: int = _rules["simulation_defaults"]["timestep_days"]
    RANDOM_SEED: int = _rules["simulation_defaults"]["seed"]

    # Noise parameters for the true biological process and lab errors
    BIO_NOISE_SCALE = _rules["simulation_defaults"]["bio_noise_scale"]
    LAB_NOISE_STD = _rules["lab_noise_std"]


# ── Safety Thresholds (CTCAE Grade 3/4) ──────────────────────────
# Used by the deterministic POMDP safety override.
CTCAE_THRESHOLDS = _rules["ctcae_thresholds"]

# ── Metric Order (canonical ordering for vectorized ops) ─────────
METRIC_ORDER = _rules["metric_order"]

# ── POMDP Agent Thresholds ───────────────────────────────────────
class POMDPConfig:
    Z_HOLD_THRESHOLD = _rules["pomdp_policy"]["z_hold_threshold"]
    Z_POSITIVE_THRESHOLD = _rules["pomdp_policy"]["z_positive_threshold"]


def ensure_directories():
    """Create data/ and results/ directories if they don't exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
