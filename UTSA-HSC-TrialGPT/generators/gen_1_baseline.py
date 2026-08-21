"""
gen_1_baseline.py — Disease-Specific Baseline Patient Generator
================================================================
Generates 100 patients across 4 demo-optimized cohorts:
  Group A (30%): NSCLC patients — elevated tumor markers, smoker profiles
  Group B (30%): RA patients — elevated inflammatory markers
  Group C (20%): Poison Pills — look healthy but have hidden exclusions
  Group D (20%): Noise/Decoys — irrelevant conditions, clean vitals

All vitals are tuned to PASS the hard deterministic filter (age 18-75,
platelets >= 50000, eGFR >= 30) so the semantic filter gets the chance
to demonstrate its value.
"""

import pandas as pd
import numpy as np
import uuid
import os

# Disease-specific vital generation profiles
DISEASE_PROFILES = {
    "NSCLC": {
        "egfr": (55, 10),        # Lower renal function (chemo history)
        "serum_creatinine": (1.2, 0.15),
        "alt": (35, 8),          # Slightly elevated liver
        "ast": (30, 7),
        "platelets": (180000, 30000),
        "anc": (3500, 800),
        "hemoglobin": (11.5, 1.2),  # Mild anemia (cancer-related)
        "systolic_bp": (130, 12),
        "diastolic_bp": (82, 8),
        "hba1c": (5.6, 0.4),
        "ecog_weights": [0.3, 0.5, 0.2],  # More ECOG 1
        "age_range": (45, 72),
        "bmi_mean": 23,
    },
    "RA": {
        "egfr": (75, 12),        # Normal renal
        "serum_creatinine": (0.9, 0.15),
        "alt": (28, 6),
        "ast": (24, 5),
        "platelets": (280000, 50000),  # Reactive thrombocytosis (RA hallmark)
        "anc": (4500, 900),
        "hemoglobin": (12.0, 1.0),  # Mild anemia of chronic disease
        "systolic_bp": (125, 10),
        "diastolic_bp": (78, 7),
        "hba1c": (5.4, 0.3),
        "ecog_weights": [0.4, 0.4, 0.2],
        "age_range": (30, 65),
        "bmi_mean": 26,
    },
    "POISON": {
        "egfr": (80, 10),        # Perfect vitals — the trap is in the notes
        "serum_creatinine": (0.85, 0.1),
        "alt": (22, 5),
        "ast": (20, 4),
        "platelets": (250000, 30000),
        "anc": (5000, 600),
        "hemoglobin": (14.0, 0.8),
        "systolic_bp": (118, 8),
        "diastolic_bp": (76, 6),
        "hba1c": (5.2, 0.2),
        "ecog_weights": [0.7, 0.2, 0.1],
        "age_range": (25, 60),
        "bmi_mean": 24,
    },
    "NOISE": {
        "egfr": (85, 8),
        "serum_creatinine": (0.8, 0.1),
        "alt": (20, 4),
        "ast": (18, 3),
        "platelets": (230000, 25000),
        "anc": (4800, 500),
        "hemoglobin": (14.5, 0.7),
        "systolic_bp": (115, 8),
        "diastolic_bp": (74, 5),
        "hba1c": (5.3, 0.2),
        "ecog_weights": [0.8, 0.15, 0.05],
        "age_range": (20, 55),
        "bmi_mean": 25,
    },
    "HARD_FAIL": {
        "egfr": (20, 5),           # Intentionally fail eGFR >= 30
        "serum_creatinine": (2.5, 0.5),
        "alt": (200, 20),          # Intentionally fail ALT
        "ast": (210, 20),
        "platelets": (25000, 5000), # Intentionally fail platelets >= 50k
        "anc": (400, 100),
        "hemoglobin": (6.5, 0.5),
        "systolic_bp": (150, 15),
        "diastolic_bp": (90, 10),
        "hba1c": (6.0, 0.5),
        "ecog_weights": [0.1, 0.2, 0.7],
        "age_range": (40, 70),
        "bmi_mean": 25,
    }
}

def _clamp(val, low, high):
    return max(low, min(high, val))


def generate_baseline(n=100, disease_template="NSCLC", out_dir="."):
    os.makedirs(out_dir, exist_ok=True)
    np.random.seed(42)
    data = []

    if disease_template.upper() == "NSCLC":
        nsclc_count, ra_count = 60, 5
    elif disease_template.upper() == "RA":
        nsclc_count, ra_count = 5, 60
    else:
        nsclc_count, ra_count = 35, 30

    group_assignments = (
        ["NSCLC"] * nsclc_count +
        ["RA"] * ra_count +
        ["POISON"] * 15 +
        ["NOISE"] * 10 +
        ["HARD_FAIL"] * 10
    )

    for i in range(n):
        group = group_assignments[i]
        profile = DISEASE_PROFILES[group]

        age_lo, age_hi = profile["age_range"]
        age = np.random.randint(age_lo, age_hi)
        sex = np.random.choice(["M", "F"])

        # Generate immutable UUID based on synthetic PII
        pid = str(uuid.uuid5(uuid.NAMESPACE_OID, f"PATIENT_{i}_{age}_{sex}"))[:8].upper()

        # Generate vitals from the disease-specific distribution
        if group == "HARD_FAIL":
            # Don't clamp strictly so they fail
            egfr = round(np.random.normal(*profile["egfr"]), 1)
            platelets = round(np.random.normal(*profile["platelets"]), 0)
            hemoglobin = round(np.random.normal(*profile["hemoglobin"]), 1)
        else:
            egfr = _clamp(round(np.random.normal(*profile["egfr"]), 1), 31.0, 120.0)
            platelets = _clamp(round(np.random.normal(*profile["platelets"]), 0), 55000, 500000)
            hemoglobin = _clamp(round(np.random.normal(*profile["hemoglobin"]), 1), 7.5, 18.0)
            
        # Healthcare Compliance Flags
        # 95% chance of having signed HIPAA. Intentionally fail 5% of patients for compliance demonstration.
        hipaa_authorization = 1 if np.random.rand() > 0.05 else 0

        data.append({
            "patient_id": f"PT-{pid}",
            "age": age,
            "sex": sex,
            "bmi": round(np.random.normal(profile["bmi_mean"], 3), 1),
            "ecog_score": int(np.random.choice([0, 1, 2], p=profile["ecog_weights"])),
            "is_pregnant": 0,
            "hiv_status": 0,      # 0 = Negative (INTEGER in DB schema)
            "hepb_status": 0,
            "hepc_status": 0,
            "irb_consent_signed": 1,
            "hipaa_authorization": hipaa_authorization,

            # The Metrics
            "egfr": egfr,
            "serum_creatinine": round(np.random.normal(*profile["serum_creatinine"]), 2),
            "alt": round(np.random.normal(*profile["alt"]), 1) if group == "HARD_FAIL" else _clamp(round(np.random.normal(*profile["alt"]), 1), 5, 145),
            "ast": round(np.random.normal(*profile["ast"]), 1) if group == "HARD_FAIL" else _clamp(round(np.random.normal(*profile["ast"]), 1), 5, 145),
            "platelets": platelets,
            "anc": round(np.random.normal(*profile["anc"]), 0) if group == "HARD_FAIL" else _clamp(round(np.random.normal(*profile["anc"]), 0), 600, 10000),
            "hemoglobin": hemoglobin,
            "systolic_bp": round(np.random.normal(*profile["systolic_bp"]), 0),
            "diastolic_bp": round(np.random.normal(*profile["diastolic_bp"]), 0),
            "hba1c": round(np.random.normal(*profile["hba1c"]), 1),

            # Metadata for downstream generators (not ingested into DB)
            "_demo_group": group,
        })

    df = pd.DataFrame(data)
    
    # Save metadata separately so we don't leak groups to the agent
    metadata_df = df[["patient_id", "_demo_group"]].copy()
    metadata_path = os.path.join(out_dir, "1_baseline_metadata.csv")
    metadata_df.to_csv(metadata_path, index=False)
    
    # Drop the cheat column from the actual patient data
    df = df.drop(columns=["_demo_group"])
    patients_path = os.path.join(out_dir, "1_baseline_patients.csv")
    df.to_csv(patients_path, index=False)
    print(f"Generated {patients_path} — {n} patients")
    print(f"  Group A (NSCLC):      {len([d for d in data if d['_demo_group']=='NSCLC'])}")
    print(f"  Group B (RA):         {len([d for d in data if d['_demo_group']=='RA'])}")
    print(f"  Group C (Poison):     {len([d for d in data if d['_demo_group']=='POISON'])}")
    print(f"  Group D (Noise):      {len([d for d in data if d['_demo_group']=='NOISE'])}")
    print(f"  Group E (Hard Fail):  {len([d for d in data if d['_demo_group']=='HARD_FAIL'])}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate Baseline Patients")
    parser.add_argument("--n", type=int, default=100, help="Number of patients to generate")
    parser.add_argument("--disease", type=str, default="NSCLC", choices=["NSCLC", "RA", "MIXED"], help="Primary disease template")
    parser.add_argument("--out_dir", type=str, default=".", help="Output directory")
    args = parser.parse_args()
    
    generate_baseline(n=args.n, disease_template=args.disease, out_dir=args.out_dir)
