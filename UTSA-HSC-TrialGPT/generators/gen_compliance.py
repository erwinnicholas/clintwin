import pandas as pd
import argparse
import os

COMPLIANCE = {
    "NSCLC": [
        {"trial_id": "TRIAL_SIM_001", "rule_text": "Requires valid signed IRB consent form dated prior to any procedures.", "uploaded_at": "2024-01-01"},
        {"trial_id": "TRIAL_SIM_001", "rule_text": "Requires HIPAA authorization for disclosure of PHI.", "uploaded_at": "2024-01-01"},
    ],
    "RA": [
        {"trial_id": "TRIAL_SIM_RA_01", "rule_text": "Requires valid signed IRB consent form dated prior to any procedures.", "uploaded_at": "2024-01-01"},
        {"trial_id": "TRIAL_SIM_RA_01", "rule_text": "Requires HIPAA authorization for disclosure of PHI.", "uploaded_at": "2024-01-01"},
    ]
}

def generate_compliance(disease_template="NSCLC", out_dir="."):
    os.makedirs(out_dir, exist_ok=True)
    data = COMPLIANCE.get(disease_template.upper(), COMPLIANCE["NSCLC"])
    out_path_txt = os.path.join(out_dir, "trial_compliance_rules.txt")
    with open(out_path_txt, "w") as f:
        f.write(f"Compliance Rules for {disease_template}\n")
        f.write("="*40 + "\n\n")
        for item in data:
            f.write(f"Trial ID: {item['trial_id']}\n")
            f.write(f"Rule: {item['rule_text']}\n")
            f.write(f"Uploaded At: {item['uploaded_at']}\n")
            f.write("-" * 20 + "\n")
            
    out_path_csv = os.path.join(out_dir, "trial_compliance_rules.csv")
    df = pd.DataFrame(data)
    df.to_csv(out_path_csv, index=False)
    
    print(f"Generated {out_path_txt} and {out_path_csv} for {disease_template}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--disease", type=str, default="NSCLC", choices=["NSCLC", "RA", "MIXED"])
    parser.add_argument("--out_dir", type=str, default=".", help="Output directory")
    args = parser.parse_args()
    
    template = "NSCLC" if args.disease == "MIXED" else args.disease
    generate_compliance(disease_template=template, out_dir=args.out_dir)
