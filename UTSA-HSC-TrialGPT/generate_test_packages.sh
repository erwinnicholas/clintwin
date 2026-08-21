#!/bin/bash
# generate_test_packages.sh
# Generates isolated test packages (CSVs) for different trial scenarios.
# Each package goes into test_packages/<SCENARIO>/ with a README explaining how to use it.

set -e

cd "$(dirname "$0")"

mkdir -p test_packages

DISEASES=("NSCLC" "RA" "MIXED")

for DISEASE in "${DISEASES[@]}"; do
    echo "Generating test package for scenario: $DISEASE..."
    OUT_DIR="test_packages/$DISEASE"
    mkdir -p "$OUT_DIR"

    # Run all generators pointing to this output directory
    cd generators
    python3 gen_1_baseline.py --disease "$DISEASE" --out_dir "../$OUT_DIR"
    python3 gen_1b_clinical_notes.py --disease "$DISEASE" --out_dir "../$OUT_DIR"
    python3 gen_2_history.py --out_dir "../$OUT_DIR"
    python3 gen_trial_rules.py --disease "$DISEASE" --out_dir "../$OUT_DIR"
    python3 gen_compliance.py --disease "$DISEASE" --out_dir "../$OUT_DIR"

    # Generate the FULL 180-day daily trajectory + arm allocations
    python3 gen_3_trial_step.py \
      --baseline_file "../$OUT_DIR/1_baseline_patients.csv" \
      --metadata_file "../$OUT_DIR/1_baseline_metadata.csv" \
      --out_dir "../$OUT_DIR" \
      --duration 180 \
      --seed 42

    cd ..

    # Create a README in the folder explaining what to upload
    cat <<EOF > "$OUT_DIR/README.txt"
Test Scenario: $DISEASE

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
EOF

    echo "Completed package for $DISEASE in $OUT_DIR."
    echo "---------------------------------------------------"
done

echo "All test packages have been successfully generated in test_packages/"
