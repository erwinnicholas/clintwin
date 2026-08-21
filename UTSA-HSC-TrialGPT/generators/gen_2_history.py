"""
gen_2_history.py — Disease-Specific 6-Month Longitudinal History Generator
===========================================================================
Reads 1_baseline_patients.csv, generates 3 historical observations per patient
at days_ago = [180, 90, 14]. Uses the _demo_group column to apply biologically
accurate trajectory slopes:

  NSCLC: Declining eGFR, declining platelets (chemo effect), rising ALT
  RA:    Rising platelets (reactive thrombocytosis), stable/declining hemoglobin
  POISON/NOISE: Stable vitals with minimal drift
"""

import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta

# Disease-specific biological drift slopes (per day)
SLOPE_PROFILES = {
    "NSCLC": {
        "egfr": -0.04,            # Gradual renal decline
        "serum_creatinine": 0.002,
        "alt": 0.03,              # Mild hepatotoxicity from chemo
        "ast": 0.02,
        "platelets": -80,         # Myelosuppression
        "anc": -3.0,
        "hemoglobin": -0.008,     # Anemia progression
        "systolic_bp": 0.02,
        "diastolic_bp": 0.01,
        "hba1c": 0.001,
    },
    "RA": {
        "egfr": -0.01,
        "serum_creatinine": 0.001,
        "alt": 0.01,
        "ast": 0.01,
        "platelets": 50,          # Reactive thrombocytosis (worsening)
        "anc": 2.0,
        "hemoglobin": -0.005,     # Anemia of chronic disease
        "systolic_bp": 0.03,
        "diastolic_bp": 0.02,
        "hba1c": 0.0005,
    },
    "POISON": {
        "egfr": 0.0,
        "serum_creatinine": 0.0,
        "alt": 0.005,
        "ast": 0.005,
        "platelets": -10,
        "anc": 0.5,
        "hemoglobin": 0.0,
        "systolic_bp": 0.0,
        "diastolic_bp": 0.0,
        "hba1c": 0.0,
    },
    "NOISE": {
        "egfr": 0.0,
        "serum_creatinine": 0.0,
        "alt": 0.003,
        "ast": 0.003,
        "platelets": -5,
        "anc": 0.0,
        "hemoglobin": 0.0,
        "systolic_bp": 0.0,
        "diastolic_bp": 0.0,
        "hba1c": 0.0,
    },
}

# Lab noise (1 SD) per metric
LAB_NOISE = {
    "egfr": 2.0,
    "serum_creatinine": 0.05,
    "alt": 3.0,
    "ast": 3.0,
    "platelets": 5000,
    "anc": 100,
    "hemoglobin": 0.3,
    "systolic_bp": 4.0,
    "diastolic_bp": 3.0,
    "hba1c": 0.1,
}

METRICS = list(LAB_NOISE.keys())


def generate_6m_history(out_dir="."):
    os.makedirs(out_dir, exist_ok=True)
    np.random.seed(42)

    baseline_path = os.path.join(out_dir, "1_baseline_patients.csv")
    metadata_path = os.path.join(out_dir, "1_baseline_metadata.csv")

    try:
        baseline_df = pd.read_csv(baseline_path)
        metadata_df = pd.read_csv(metadata_path)
        # Merge them to have access to _demo_group
        baseline_df = baseline_df.merge(metadata_df, on="patient_id", how="left")
    except FileNotFoundError:
        print(f"Error: {baseline_path} or {metadata_path} not found. Run gen_1_baseline.py first.")
        return

    today = datetime.today()
    intervals = [180, 90, 14]  # Days ago
    history_data = []

    for _, row in baseline_df.iterrows():
        pid = row["patient_id"]
        group = row.get("_demo_group", "NOISE")
        slopes = SLOPE_PROFILES.get(group, SLOPE_PROFILES["NOISE"])

        for days_ago in intervals:
            observation_date = (today - timedelta(days=days_ago)).strftime("%Y-%m-%d")

            record = {
                "patient_id": pid,
                "days_ago": days_ago,
                "observation_date": observation_date,
            }

            for m in METRICS:
                baseline_val = row[m]
                # Back-calculate: historical value = baseline - (slope * days_ago) + noise
                # (If slope is negative, baseline was higher in the past)
                historical = baseline_val - (slopes[m] * days_ago) + np.random.normal(0, LAB_NOISE[m])
                record[m] = round(historical, 2 if m == "serum_creatinine" else 1)

            history_data.append(record)

    df = pd.DataFrame(history_data)
    history_path = os.path.join(out_dir, "2_6month_history.csv")
    df.to_csv(history_path, index=False)
    print(f"Generated {history_path} — {len(df)} records ({len(baseline_df)} patients × {len(intervals)} time points)")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--out_dir", type=str, default=".", help="Output directory")
    args = parser.parse_args()
    generate_6m_history(out_dir=args.out_dir)
