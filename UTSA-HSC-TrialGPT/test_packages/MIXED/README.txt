Test Scenario: MIXED

HOW TO UPLOAD THIS DATA IN THE UI
---------------------------------
1. Baseline Patients (1_baseline_patients.csv)
   - Go to the Dashboard page.
   - Click "+ Baseline Patients" in the top right.
   - This populates the foundational patient demographic and vitals data.

2. 6-Month History (2_6month_history.csv)
   - Go to the Dashboard page.
   - Click "+ 6-Month History".
   - This populates the longitudinal trajectory of lab values used to calculate drift.
   - The Kalman Filter uses this to learn per-patient trajectory slopes.

3. Clinical Notes (1b_clinical_notes.csv)
   - Go to the Dashboard page.
   - Click "+ Notes (CSV)".
   - This runs the pipeline to parse unstructured clinical history via the NLP service.

4. Trial Rules / Inclusion Criteria (trial_rules.csv)
   - Go to the Clinical Trials page.
   - Select the active trial.
   - Under "Criteria" -> click "Upload as Excel / CSV" and select this file.
   - This sets up the deterministic Hard Filter constraints.

5. Compliance Rules (trial_compliance_rules.csv)
   - Go to the Compliance page.
   - Use the designated upload tool to ingest these rules.

LIVE MONITORING (after pipeline runs eligibility + twin building)
-----------------------------------------------------------------
6. Trial Trajectory (3_trial_trajectory.csv) — DO NOT UPLOAD MANUALLY
   - This file contains 180 days of DAILY lab results for all patients.
   - It is loaded automatically by the Live Monitor backend when you click
     "Start Live Monitor" on the Eligibility page.
   - The POMDP Agent receives this data one day at a time (simulating live
     hospital data streaming in) and forecasts the next day's values.
   - Charts show: incoming reality vs. model forecast, tracking accuracy, alerts.

7. Arm Allocations (3_arm_allocations.json) — DO NOT UPLOAD MANUALLY
   - Maps each patient to their trial arm (Control / Vaccine A / Vaccine B).
   - Loaded automatically alongside the trajectory.

DEBUG FILES (do NOT upload):
  - 1_baseline_metadata.csv — Contains demo group labels. For verification only.
  - 1b_note_assignments.csv — Shows which note template was assigned. Debug only.
