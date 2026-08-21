"""
gen_3_trial_step.py — Statistically Coherent Daily Trial Trajectory Generator
===============================================================================
Generates a FULL 180-day daily trajectory for all enrolled patients.

KEY DESIGN:
  - The generated data acts as "ground truth hospital lab results" for the demo.
  - Noise scales match clinical_rules.json → lab_noise_std EXACTLY so the
    Kalman filter can track it with <2% MAPE.
  - Drug effects use the SAME sigmoid onset model as simulation/drugs.py.
  - Each patient gets independent, per-day stochastic noise (no aggregation).

Output: 3_trial_trajectory.csv
  Columns: patient_id, day, arm, egfr, serum_creatinine, alt, ast,
           platelets, anc, hemoglobin, systolic_bp, diastolic_bp, hba1c

Output: 3_arm_allocations.json
  JSON mapping patient_id → arm_id (for the LiveFeedService to load)

Usage:
  python gen_3_trial_step.py --baseline_file 1_baseline_patients.csv \\
                             --metadata_file 1_baseline_metadata.csv \\
                             --out_dir test_packages/NSCLC \\
                             --duration 180 --seed 42
"""

import argparse
import json
import os
import numpy as np
import pandas as pd


# ── Noise parameters: MUST match clinical_rules.json exactly ─────────
LAB_NOISE_STD = {
    "egfr": 2.0,
    "serum_creatinine": 0.05,
    "alt": 3.0,
    "ast": 3.0,
    "platelets": 5000.0,
    "anc": 100.0,
    "hemoglobin": 0.3,
    "systolic_bp": 4.0,
    "diastolic_bp": 3.0,
    "hba1c": 0.1,
}

BIO_NOISE_SCALE = 0.3  # Matches clinical_rules.json → simulation_defaults.bio_noise_scale

METRIC_ORDER = [
    "egfr", "serum_creatinine", "alt", "ast", "platelets",
    "anc", "hemoglobin", "systolic_bp", "diastolic_bp", "hba1c",
]

# ── Drug profiles: MUST match config/drug_profiles.json exactly ──────
DRUG_PROFILES = {
    "ARM_CONTROL": {
        "daily_effects": {},
        "noise_scales": {
            "egfr": 0.3, "platelets": 500.0, "alt": 0.5, "ast": 0.5,
            "hemoglobin": 0.05, "anc": 30.0, "systolic_bp": 0.5,
            "diastolic_bp": 0.3, "serum_creatinine": 0.01, "hba1c": 0.01,
        },
        "onset_day": 0,
    },
    "ARM_VACCINE_A": {
        "daily_effects": {
            "platelets": -80.0,
            "alt": 0.15,
            "anc": -5.0,
            "hemoglobin": -0.005,
        },
        "noise_scales": {
            "egfr": 0.5, "platelets": 1200.0, "alt": 1.5, "ast": 1.0,
            "hemoglobin": 0.08, "anc": 50.0, "systolic_bp": 0.8,
            "diastolic_bp": 0.5, "serum_creatinine": 0.02, "hba1c": 0.02,
        },
        "onset_day": 7,
    },
    "ARM_VACCINE_B": {
        "daily_effects": {
            "platelets": -150.0,
            "alt": 3.0,
            "ast": 2.5,
            "egfr": -0.15,
            "hemoglobin": -0.02,
            "anc": -20.0,
        },
        "noise_scales": {
            "egfr": 1.0, "platelets": 500.0, "alt": 3.0, "ast": 2.5,
            "hemoglobin": 0.15, "anc": 80.0, "systolic_bp": 1.5,
            "diastolic_bp": 1.0, "serum_creatinine": 0.03, "hba1c": 0.03,
        },
        "onset_day": 14,
    },
}

NON_NEG_METRICS = {"platelets", "anc", "hemoglobin", "egfr"}


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -500, 500)))


def _compute_drug_effect(profile: dict, metric: str, day: int, rng: np.random.Generator) -> float:
    """Daily drug effect with sigmoid onset ramp — mirrors simulation/drugs.py exactly."""
    daily_effects = profile["daily_effects"]
    if metric not in daily_effects:
        return 0.0

    ramp_rate = 7.0
    onset_factor = _sigmoid((day - profile["onset_day"]) / ramp_rate)

    mean_effect = daily_effects[metric] * onset_factor  # dt=1 day

    noise_std = profile["noise_scales"].get(metric, 0.0)  # √dt = √1 = 1
    noise = rng.normal(0, noise_std) if noise_std > 0 else 0.0

    return mean_effect + noise


def _assign_arms(patient_ids: list, seed: int) -> dict:
    """Balanced 3-arm randomization: Control, Vaccine A, Vaccine B."""
    rng = np.random.default_rng(seed)
    arms = ["ARM_CONTROL", "ARM_VACCINE_A", "ARM_VACCINE_B"]
    n = len(patient_ids)
    # Block randomization: each block of 3 gets one of each arm
    full_blocks = n // 3
    remainder = n % 3
    assignments = []
    for _ in range(full_blocks):
        block = list(arms)
        rng.shuffle(block)
        assignments.extend(block)
    if remainder > 0:
        extra = list(arms[:remainder])
        rng.shuffle(extra)
        assignments.extend(extra)
    return {pid: assignments[i] for i, pid in enumerate(patient_ids)}


def generate_trajectory(
    baseline_file: str,
    metadata_file: str,
    out_dir: str = ".",
    duration_days: int = 180,
    seed: int = 42,
):
    os.makedirs(out_dir, exist_ok=True)
    rng = np.random.default_rng(seed)

    baseline_df = pd.read_csv(baseline_file)

    # Only use patients whose demo_group is NOT HARD_FAIL (they were filtered out)
    if os.path.exists(metadata_file):
        meta_df = pd.read_csv(metadata_file)
        eligible_pids = set(meta_df[meta_df["_demo_group"] != "HARD_FAIL"]["patient_id"])
        baseline_df = baseline_df[baseline_df["patient_id"].isin(eligible_pids)]

    patient_ids = baseline_df["patient_id"].tolist()
    n_patients = len(patient_ids)

    # Assign arms
    arm_alloc = _assign_arms(patient_ids, seed)

    # Save arm allocations
    alloc_path = os.path.join(out_dir, "3_arm_allocations.json")
    with open(alloc_path, "w") as f:
        json.dump(arm_alloc, f, indent=2)
    print(f"Saved arm allocations to {alloc_path} — {n_patients} patients")

    # Build initial state matrix from baseline
    state = np.zeros((n_patients, len(METRIC_ORDER)), dtype=np.float64)
    for i, (_, row) in enumerate(baseline_df.iterrows()):
        for j, m in enumerate(METRIC_ORDER):
            state[i, j] = float(row[m])

    # Lab noise std vector
    lab_noise = np.array([LAB_NOISE_STD[m] for m in METRIC_ORDER], dtype=np.float64)

    # Collect all daily records
    all_records = []

    for day in range(0, duration_days + 1):
        if day > 0:
            # ── Biological drift (process noise) ─────────────────────
            bio_noise = rng.normal(0, lab_noise * BIO_NOISE_SCALE, size=(n_patients, len(METRIC_ORDER)))
            state += bio_noise

            # ── Drug effects per patient ─────────────────────────────
            for i, pid in enumerate(patient_ids):
                arm = arm_alloc[pid]
                profile = DRUG_PROFILES[arm]
                for j, m in enumerate(METRIC_ORDER):
                    state[i, j] += _compute_drug_effect(profile, m, day, rng)

            # ── Non-negative clamping ────────────────────────────────
            for j, m in enumerate(METRIC_ORDER):
                if m in NON_NEG_METRICS:
                    state[:, j] = np.maximum(0.1, state[:, j])

        # ── Observation = true state + measurement noise ─────────
        noise = rng.normal(0, lab_noise, size=(n_patients, len(METRIC_ORDER)))
        observations = np.round(state + noise, 2)

        # Record each patient
        for i, pid in enumerate(patient_ids):
            record = {
                "patient_id": pid,
                "day": day,
                "arm": arm_alloc[pid],
            }
            for j, m in enumerate(METRIC_ORDER):
                record[m] = observations[i, j]
            all_records.append(record)

    # Save trajectory
    traj_df = pd.DataFrame(all_records)
    traj_path = os.path.join(out_dir, "3_trial_trajectory.csv")
    traj_df.to_csv(traj_path, index=False)

    # Summary
    print(f"Generated {traj_path} — {n_patients} patients × {duration_days + 1} days = {len(all_records)} records")
    for arm_name in ["ARM_CONTROL", "ARM_VACCINE_A", "ARM_VACCINE_B"]:
        arm_pids = [pid for pid, a in arm_alloc.items() if a == arm_name]
        print(f"  {arm_name}: {len(arm_pids)} patients")

    # Print day 0 vs day 180 mean for key metrics
    day0 = traj_df[traj_df["day"] == 0]
    day_end = traj_df[traj_df["day"] == duration_days]
    for m in ["egfr", "platelets", "alt", "hemoglobin"]:
        d0_mean = day0[m].mean()
        de_mean = day_end[m].mean()
        print(f"  {m}: Day 0 mean={d0_mean:.1f} → Day {duration_days} mean={de_mean:.1f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline_file", type=str, required=True, help="Path to 1_baseline_patients.csv")
    parser.add_argument("--metadata_file", type=str, required=True, help="Path to 1_baseline_metadata.csv")
    parser.add_argument("--out_dir", type=str, default=".", help="Output directory")
    parser.add_argument("--duration", type=int, default=180, help="Trial duration in days")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    generate_trajectory(
        baseline_file=args.baseline_file,
        metadata_file=args.metadata_file,
        out_dir=args.out_dir,
        duration_days=args.duration,
        seed=args.seed,
    )
