import pandas as pd
import argparse
import os

RULES = {
    "NSCLC": [
        {"criterion_id": "INC_01", "trial_id": "TRIAL_SIM_001", "rule_type": "INCLUSION", "field_name": "platelets", "operator": ">=", "value_min": 50000.0, "value_max": None},
        {"criterion_id": "INC_02", "trial_id": "TRIAL_SIM_001", "rule_type": "INCLUSION", "field_name": "egfr", "operator": ">=", "value_min": 30.0, "value_max": None},
        {"criterion_id": "INC_03", "trial_id": "TRIAL_SIM_001", "rule_type": "INCLUSION", "field_name": "irb_consent_signed", "operator": "==", "value_min": 1.0, "value_max": None},
        {"criterion_id": "INC_04", "trial_id": "TRIAL_SIM_001", "rule_type": "INCLUSION", "field_name": "hipaa_authorization", "operator": "==", "value_min": 1.0, "value_max": None},
    ],
    "RA": [
        {"criterion_id": "INC_01", "trial_id": "TRIAL_SIM_RA_01", "rule_type": "INCLUSION", "field_name": "platelets", "operator": ">=", "value_min": 100000.0, "value_max": None},
        {"criterion_id": "INC_02", "trial_id": "TRIAL_SIM_RA_01", "rule_type": "INCLUSION", "field_name": "egfr", "operator": ">=", "value_min": 45.0, "value_max": None},
        {"criterion_id": "INC_03", "trial_id": "TRIAL_SIM_RA_01", "rule_type": "INCLUSION", "field_name": "irb_consent_signed", "operator": "==", "value_min": 1.0, "value_max": None},
        {"criterion_id": "INC_04", "trial_id": "TRIAL_SIM_RA_01", "rule_type": "INCLUSION", "field_name": "hipaa_authorization", "operator": "==", "value_min": 1.0, "value_max": None},
    ]
}

EXCLUSION_TEXT = {
    "NSCLC": [
        "The patient has had prior treatment with PD-1 or PD-L1 immune checkpoint inhibitors like Pembrolizumab, Nivolumab, or Atezolizumab.",
        "The patient has an active autoimmune disease such as rheumatoid arthritis (RA), systemic lupus erythematosus (SLE), or multiple sclerosis (MS).",
        "The patient has a history of solid organ transplant requiring chronic immunosuppression like tacrolimus.",
        "The patient has active symptomatic brain metastases requiring dexamethasone or steroid therapy.",
        "The patient has an active HIV infection, latent tuberculosis (TB), or Hepatitis B/C (HBV/HCV) positive status."
    ],
    "RA": [
        "The patient has a history of solid tumor malignancy, non-small cell lung cancer (NSCLC), breast cancer, or lymphoma.",
        "The patient has an active HIV infection or CD4 count below 200.",
        "The patient has a latent or active tuberculosis (TB) infection.",
        "The patient has Hepatitis B (HBV) positive status or chronic hepatitis."
    ]
}

def generate_rules(disease_template="NSCLC", out_dir="."):
    os.makedirs(out_dir, exist_ok=True)
    data = RULES.get(disease_template.upper(), RULES["NSCLC"])
    df = pd.DataFrame(data)
    out_path_csv = os.path.join(out_dir, "trial_rules.csv")
    df.to_csv(out_path_csv, index=False)
    
    # Generate text format
    out_path_txt = os.path.join(out_dir, "trial_rules.txt")
    with open(out_path_txt, "w") as f:
        f.write(f"Trial Rules for {disease_template}\n")
        f.write("="*40 + "\n\n")
        for item in data:
            f.write(f"- {item['rule_type']}: {item['field_name']} {item['operator']} {item['value_min']}\n")
            
    # Generate alternative CSV with a text column
    text_data = [{"trial_id": item["trial_id"], "rule_text": f"{item['rule_type']}: {item['field_name']} {item['operator']} {item['value_min']}"} for item in data]
    out_path_text_csv = os.path.join(out_dir, "trial_rules_text.csv")
    pd.DataFrame(text_data).to_csv(out_path_text_csv, index=False)
    
    # Generate proper NLI exclusion text
    out_path_exclusion_txt = os.path.join(out_dir, "trial_exclusion_text.txt")
    exclusion_data = EXCLUSION_TEXT.get(disease_template.upper(), EXCLUSION_TEXT["NSCLC"])
    with open(out_path_exclusion_txt, "w") as f:
        f.write(f"Trial Text Rules for {disease_template}\n")
        f.write("="*40 + "\n\n")
        for ex_rule in exclusion_data:
            f.write(f"EXCLUSION: {ex_rule}\n")
            
    print(f"Generated {out_path_csv}, {out_path_txt}, {out_path_text_csv}, and {out_path_exclusion_txt} for {disease_template}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--disease", type=str, default="NSCLC", choices=["NSCLC", "RA", "MIXED"])
    parser.add_argument("--out_dir", type=str, default=".", help="Output directory")
    args = parser.parse_args()
    
    # MIXED will just use NSCLC trial rules for now as the default target trial
    template = "NSCLC" if args.disease == "MIXED" else args.disease
    generate_rules(disease_template=template, out_dir=args.out_dir)
