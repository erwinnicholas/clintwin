
# Full Pipeline Simulation Report

**Generated**: 2026-08-16 18:27:34

**Patients**: 100 (30 NSCLC + 30 RA + 20 Poison + 20 Noise)

**Trial Type**: NSCLC Immunotherapy


---


## Phase 0: Data Generation & Ingestion

✅ Generated and ingested **100** baseline patients.

| Group | Count | Patient IDs (sample) |
| --- | --- | --- |
| NSCLC | 30 | PT-001, PT-002, PT-003, PT-004, PT-005... |
| RA | 30 | PT-031, PT-032, PT-033, PT-034, PT-035... |
| POISON | 20 | PT-061, PT-062, PT-063, PT-064, PT-065... |
| NOISE | 20 | PT-081, PT-082, PT-083, PT-084, PT-085... |

✅ Generated **600** longitudinal records (6 per patient).

✅ Ingested **100** clinical notes → **323** indexed text chunks.

Average chunk size: ~78 chars/chunk


---


## Phase 1: Deterministic SQL Filter

**Input**: 100 patients

**Output**: 100 passed, 0 rejected

**Time**: 0.00s



**Rejection Breakdown by Group:**

- **NSCLC**: 0/30 rejected
- **RA**: 0/30 rejected
- **POISON**: 0/20 rejected
- **NOISE**: 0/20 rejected


**Sample Passed Patients (first 10):**

| Patient ID | Age | ECOG | eGFR | Platelets |
| --- | --- | --- | --- | --- |
| PT-001 | 47 | 2 | 42.0 | 203334 |
| PT-002 | 57 | 0 | 53.2 | 195969 |
| PT-003 | 69 | 1 | 66.3 | 196295 |
| PT-004 | 69 | 0 | 57.9 | 171746 |
| PT-005 | 68 | 1 | 62.9 | 146001 |
| PT-006 | 56 | 1 | 59.6 | 165918 |
| PT-007 | 58 | 1 | 40.5 | 218977 |
| PT-008 | 64 | 2 | 59.3 | 186980 |
| PT-009 | 61 | 0 | 58.6 | 138699 |
| PT-010 | 56 | 0 | 59.1 | 161637 |


---


## Phase 2: Semantic NLI Filter (3-Tier Deterministic Pipeline)

Running ColBERT + DeBERTa NLI across all exclusion criteria...

**Input**: 100 patients from Phase 1

**Output**: 56 passed, 44 excluded

**Time**: 11.5s



**Excluded Patients (Semantic NLI):**

| Patient | Group | Reason |
| --- | --- | --- |
| PT-001 | NSCLC | NLI ENTAILMENT (99.0%) for 'The patient has had prior treatment with...' via: "Patient presents with |
| PT-002 | NSCLC | NLI ENTAILMENT (99.0%) for 'The patient has a history of solid organ...' via: "Patient is eligible f |
| PT-003 | NSCLC | NLI ENTAILMENT (99.0%) for 'The patient has had prior treatment with...' via: "Patient has completed |
| PT-006 | NSCLC | NLI ENTAILMENT (99.0%) for 'The patient has had prior treatment with...' via: "Patient presents with |
| PT-007 | NSCLC | NLI ENTAILMENT (99.0%) for 'The patient has a history of solid organ...' via: "Patient is eligible f |
| PT-008 | NSCLC | NLI ENTAILMENT (99.0%) for 'The patient has had prior treatment with...' via: "Patient has completed |
| PT-011 | NSCLC | NLI ENTAILMENT (99.0%) for 'The patient has active symptomatic brain...' via: "Patient presents with |
| PT-012 | NSCLC | NLI ENTAILMENT (99.0%) for 'The patient has a history of solid organ...' via: "Patient is eligible f |
| PT-013 | NSCLC | NLI ENTAILMENT (99.0%) for 'The patient has had prior treatment with...' via: "Patient has completed |
| PT-016 | NSCLC | NLI ENTAILMENT (99.0%) for 'The patient has active symptomatic brain...' via: "Patient presents with |
| PT-018 | NSCLC | NLI ENTAILMENT (99.0%) for 'The patient has had prior treatment with...' via: "Patient has completed |
| PT-021 | NSCLC | NLI ENTAILMENT (99.0%) for 'The patient has active symptomatic brain...' via: "Patient presents with |
| PT-023 | NSCLC | NLI ENTAILMENT (99.0%) for 'The patient has had prior treatment with...' via: "Patient has completed |
| PT-026 | NSCLC | NLI ENTAILMENT (99.0%) for 'The patient has active symptomatic brain...' via: "Patient presents with |
| PT-028 | NSCLC | NLI ENTAILMENT (99.0%) for 'The patient has had prior treatment with...' via: "Patient has completed |
| PT-031 | RA | NLI ENTAILMENT (99.0%) for 'The patient has active symptomatic brain...' via: "Patient presents with |
| PT-032 | RA | NLI ENTAILMENT (99.0%) for 'The patient has a history of solid organ...' via: "Patient is eligible f |
| PT-033 | RA | NLI ENTAILMENT (99.0%) for 'The patient has had prior treatment with...' via: "Patient has completed |
| PT-036 | RA | NLI ENTAILMENT (99.0%) for 'The patient has had prior treatment with...' via: "Patient presents with |
| PT-038 | RA | NLI ENTAILMENT (99.0%) for 'The patient has had prior treatment with...' via: "Patient has completed |



**Passed Patients by Group:**

- **NSCLC**: 15/30 passed
- **RA**: 17/30 passed
- **POISON**: 4/20 passed
- **NOISE**: 20/20 passed

---


## Phase 3: Digital Twin Construction

**Input**: 56 patients from Phase 2

**Output**: 56 fit twins, 0 rejected

**Time**: 0.51s



**Sample Fit Twins (first 10):**

| Patient | eGFR | Platelets | Hgb | ALT |
| --- | --- | --- | --- | --- |
| PT-040 | 66.3 | 197113.0 | 10.4 | 37.6 |
| PT-090 | 100.5 | 259947.0 | 14.8 | 23.1 |
| PT-081 | 81.6 | 227552.0 | 13.8 | 21.5 |
| PT-099 | 90.1 | 309282.0 | 13.5 | 19.1 |
| PT-049 | 48.0 | 212846.0 | 11.1 | 22.1 |
| PT-085 | 97.5 | 230888.0 | 15.1 | 23.2 |
| PT-020 | 54.1 | 195056.0 | 11.7 | 36.1 |
| PT-059 | 75.2 | 276166.0 | 12.1 | 31.7 |
| PT-009 | 60.7 | 133401.0 | 12.0 | 25.2 |
| PT-092 | 90.7 | 268391.0 | 14.4 | 25.6 |


---


## Phase 4: POMDP Multi-Arm Simulation

**Input**: 56 fit digital twins



**Arm Assignments:**

- **ARM_CONTROL**: 21 patients
- **ARM_VACCINE_A**: 18 patients
- **ARM_VACCINE_B**: 17 patients


**Cohort Balance (Table 1):**

| Variable | Test | p-value | Balanced? |
| --- | --- | --- | --- |
| age | ANOVA | 0.4688 | ✅ |
| bmi | ANOVA | 0.2128 | ✅ |
| sex | Chi-Square | 0.9239 | ✅ |
| ecog_score | Chi-Square | 0.9987 | ✅ |
| age_bracket | Chi-Square | 0.1776 | ✅ |



**Simulation**: 180 days, 14-day timesteps, seed=42

**Run ID**: `RUN_TEST_20260816_182749`

**Time**: 0.04s

**Total Decisions**: 725

**Adverse Events**: 264



**Simulation Timeline (every 28 days):**

| Day | Active | Decisions | Holds | Halts | Alerts |
| --- | --- | --- | --- | --- | --- |
| 0 | 56 | 56 | 21 | 0 | 0 |
| 28 | 56 | 56 | 20 | 0 | 0 |
| 56 | 56 | 56 | 21 | 0 | 0 |
| 84 | 56 | 56 | 21 | 0 | 0 |
| 112 | 56 | 56 | 21 | 0 | 0 |
| 140 | 55 | 55 | 19 | 0 | 0 |
| 168 | 55 | 55 | 19 | 0 | 0 |



**Adverse Events (first 15):**

| Day | Patient | Arm | Action | Rationale |
| --- | --- | --- | --- | --- |
| 0 | PT-081 | ARM_VACCINE_A | HOLD_DOSE | Negative divergence: platelets degrading significantly faste... |
| 0 | PT-049 | ARM_VACCINE_B | HOLD_DOSE | Negative divergence: egfr degrading significantly faster tha... |
| 0 | PT-085 | ARM_VACCINE_A | HOLD_DOSE | Negative divergence: platelets degrading significantly faste... |
| 0 | PT-020 | ARM_VACCINE_B | HOLD_DOSE | Negative divergence: platelets degrading significantly faste... |
| 0 | PT-059 | ARM_VACCINE_B | HOLD_DOSE | Negative divergence: alt degrading significantly faster than... |
| 0 | PT-009 | ARM_VACCINE_B | HOLD_DOSE | Negative divergence: platelets degrading significantly faste... |
| 0 | PT-017 | ARM_VACCINE_A | HOLD_DOSE | Negative divergence: platelets degrading significantly faste... |
| 0 | PT-057 | ARM_VACCINE_A | HOLD_DOSE | Negative divergence: alt degrading significantly faster than... |
| 0 | PT-010 | ARM_VACCINE_B | HOLD_DOSE | Negative divergence: platelets degrading significantly faste... |
| 0 | PT-034 | ARM_VACCINE_B | HOLD_DOSE | Negative divergence: platelets degrading significantly faste... |
| 0 | PT-042 | ARM_VACCINE_B | HOLD_DOSE | Negative divergence: alt degrading significantly faster than... |
| 0 | PT-054 | ARM_VACCINE_A | HOLD_DOSE | Negative divergence: alt degrading significantly faster than... |
| 0 | PT-086 | ARM_VACCINE_A | HOLD_DOSE | Negative divergence: platelets degrading significantly faste... |
| 0 | PT-024 | ARM_VACCINE_A | HOLD_DOSE | Negative divergence: platelets degrading significantly faste... |
| 0 | PT-029 | ARM_VACCINE_A | HOLD_DOSE | Negative divergence: platelets degrading significantly faste... |


---


## Phase 5: Pipeline Analytics Summary

**Funnel Summary:**

| Stage | Input | Output | Dropout |
| --- | --- | --- | --- |
| Phase 1: Deterministic Filter | 100 | 100 | 0 |
| Phase 2: Semantic NLI Filter | 100 | 56 | 44 |
| Phase 3: Digital Twin Fitness | 56 | 56 | 0 |
| Phase 4: Simulation Enrolled | 56 | 56 | 0 |



**Total Pipeline Time**: 14.9s



**Final Arm-Level Statistics:**

| Arm | Enrolled | Total Decisions | Adverse Events | Halted |
| --- | --- | --- | --- | --- |
| ARM_CONTROL | 21 | 273 | 0 | 0 |
| ARM_VACCINE_A | 18 | 234 | 137 | 0 |
| ARM_VACCINE_B | 17 | 218 | 127 | 1 |



**Digital Twin Progression (sample):**

| Patient | Arm | Last Day | eGFR (belief) | PLT (belief) | Hgb (belief) | Last Action |
| --- | --- | --- | --- | --- | --- | --- |
| PT-040 | ARM_CONTROL | 168 | 66.3 | 190722.0 | 10.4 | CONTINUE |
| PT-090 | ARM_VACCINE_B | 168 | 88.9 | 276542.0 | 12.8 | CONTINUE |
| PT-081 | ARM_VACCINE_A | 168 | 86.6 | 217712.0 | 14.8 | HOLD_DOSE |
| PT-099 | ARM_VACCINE_A | 168 | 89.0 | 313818.0 | 15.1 | CONTINUE |
| PT-049 | ARM_VACCINE_B | 168 | 43.4 | 198934.0 | 8.3 | HOLD_DOSE |
