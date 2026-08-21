# Neuro-Symbolic Clinical Trial Simulator — Architecture Documentation

This document provides a comprehensive, module-level overview of the entire `UTSA-HSC-TrialGPT` codebase. The system is designed using a **Domain-Driven Architecture**, cleanly separating configurations, clinical math, and simulation engines to ensure a highly modular, performant, and clinically sound pipeline.

---

## 1. Core Module (`core/`)

The `core` module acts as the foundational backbone of the application. It centralizes all configurations, database management, and data structures.

### `core/config.py`
**Purpose:** The single source of truth for all application settings.
- **Paths:** Defines constants like `DB_PATH`, `RESULTS_DIR`, and `RULES_CSV_PATH`.
- **Simulation Constants:** Defines the `SimulationConfig` class (180-day duration, 14-day timestep) and biological/lab noise scalar arrays.
- **Safety Thresholds:** Defines `CTCAE_THRESHOLDS` mapping lab metrics (e.g., Platelets < 50,000) to deterministic `HALT_PATIENT` or `HOLD_DOSE` overrides.
- **POMDP Constants:** Defines `POMDPConfig` (e.g., `Z_HOLD_THRESHOLD = -2.5`).

### `core/database.py`
**Purpose:** Handles SQLite schema generation and connection pooling.
- Consolidates the SQL definitions for Phase 1 (Demographics), Phase 3 (Longitudinal History), and Phase 4 (Simulation Logs) into a single execution step.
- Provides the `get_db_connection()` context manager to safely yield and close `sqlite3.Connection` instances, preventing database locks.

### `core/schemas.py`
**Purpose:** Unifies all data structures across the pipeline using `pydantic` and `dataclass`.
- **Enums:** `ClinicalAction` (CONTINUE, HOLD_DOSE, HALT_PATIENT).
- **Pydantic Models:** `PatientBaseline`, `MetricSnapshot`, `DigitalTwinState`.
- **Simulation Classes:** `BeliefState`, `StepDecisionLog`, `DrugProfile`, `SimulationResult`.

---

## 2. Clinical Math Module (`clinical_math/`)

This module houses the highly optimized, `numpy`-vectorized mathematical operations required for extracting signal from biological noise.

### `clinical_math/denoising.py`
**Purpose:** Filters historical lab data to construct the baseline Digital Twin.
- `ema_denoise()`: Applies a 1D Exponential Moving Average to smooth out analytical lab errors and expose the true biological state.
- `compute_ols_slope()`: Calculates the Ordinary Least Squares (linear regression) trajectory slope (units/day) across the 180-day pre-trial window.

### `clinical_math/kalman.py`
**Purpose:** Maintains the latent physiological state of the patient during the simulation.
- `KalmanBeliefTracker`: An Extended Kalman Filter (EKF) implementation operating on `numpy` arrays. 
- Calculates the true state Gaussian distribution $b(s_t) = \mathcal{N}(\hat{x}_t, P_t)$ by predicting state drift using historical slopes and updating upon receiving noisy simulated lab draws.

---

## 3. Simulation Module (`simulation/`)

This module contains the Reinforcement Learning / POMDP logic and the in silico trial engine.

### `simulation/agent.py`
**Purpose:** The POMDP Belief-Space Clinical Decision Agent.
- `ClinicalPOMDPAgent`: Evaluates the Kalman-filtered belief states every 14 days.
- **Gate 1 (Hard Deterministic Override):** Immediately halts the patient if the Kalman mean breaches a Grade 3/4 CTCAE safety floor.
- **Gate 2 (Soft Divergence Policy):** Computes a Mahalanobis/z-score distance against the Synthetic Control Arm. Triggers a dose hold if the patient degrades significantly faster than placebo ($z < -2.5$).

### `simulation/drugs.py`
**Purpose:** Defines the stochastic perturbation profiles for the trial arms.
- `compute_drug_effect()`: Calculates the daily lab shift caused by a drug. Integrates a numerically stable `sigmoid()` onset curve and Brownian stochastic noise ($\sqrt{\Delta t}$).
- Defines the constants `PLACEBO`, `VACCINE_A`, and `VACCINE_B` mapping to standard `DrugProfile` schemas.

### `simulation/engine.py`
**Purpose:** Orchestrates the multi-arm trial over the 180-day timeline.
- `TrialSimulator`: Handles cohort stratification, executes the time-step loop, injects biological and lab noise, updates the Kalman trackers, queries the POMDP Agent, and aggregates the `StepDecisionLog` results.

---

## 4. Filters Module (`filters/`)

This module contains the inclusion/exclusion pre-processing layers (Phases 1 and 2).

### `filters/deterministic.py`
**Purpose:** Phase 1 deterministic rule processing.
- `build_sql_from_rules()`: Parses a CSV of standard clinical trial criteria and dynamically compiles it into an executable SQLite `WHERE` clause.
- `execute_filter()`: Queries the DB and returns the cohort of patients who pass the physical and baseline demographic requirements.

### `filters/semantic.py`
**Purpose:** Phase 2 Semantic LLM processing.
- A wrapper module designed to interface with the TrialGPT LLM pipeline.
- `extract_fit_patients_from_json()`: Scans unstructured FHIR output JSONs produced by the LLM and extracts patients deemed medically fit for the trial based on semantic unstructured notes.

---

## 5. Orchestration & Utilities

### `run_pipeline.py`
**Purpose:** The primary execution entry point located in the root directory.
- Sequentially executes Phase 1 (Deterministic), Phase 2 (Semantic), Phase 3 (Twin Builder), and Phase 4 (Simulation & Persistence).
- Imports from the domain modules to run the entire data engineering and simulation pipeline end-to-end, acting as the controller for the overall hackathon demonstration.

### `tests/`
**Purpose:** The testing suite guaranteeing 100% architectural and mathematical integrity.
- `test_math.py`: Validates EMA, OLS slopes, and adversarial noise handling in the Kalman Filter.
- `test_simulation.py`: Validates the POMDP 2-gate logic, z-score divergence rules, and stochastic drug generation.
- `test_filters.py`: Validates the dynamic SQL compilation engine.
