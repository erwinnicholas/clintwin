"""
gen_1b_clinical_notes.py — Semantic Template Clinical Note Generator
=====================================================================
Generates 1b_clinical_notes.csv with one clinical note per patient,
deterministically assigned from 20 disease-specific templates.

The 4 Groups:
  A (NSCLC Matches):  Pass NSCLC trial, Fail RA trial
  B (RA Matches):     Pass RA trial, Fail NSCLC trial
  C (Poison Pills):   Look healthy but contain hidden exclusion phrases
  D (Noise/Decoys):   Irrelevant conditions, should not trigger any exclusion

This script also generates 1b_note_assignments.csv showing which template
was assigned to each patient, useful for debugging and demo narration.
"""

import pandas as pd
import random
import os
import zipfile
from datetime import datetime
from fpdf import FPDF

# =====================================================================
# THE 20 DETERMINISTIC SEMANTIC TEMPLATES
# =====================================================================

TEMPLATES = {
    # --- GROUP A: GOLDEN NSCLC MATCHES (indices 0-29) ---
    "nsclc_match_1": (
        "Patient presents with Stage IIIA Non-Small Cell Lung Cancer (Adenocarcinoma). "
        "Molecular profiling confirms EGFR Exon 19 deletion. PD-L1 TPS is 60%. "
        "ECOG Performance Status is 1. No prior treatment with immune checkpoint inhibitors. "
        "No history of autoimmune disease. Hepatitis B and C serologies are negative."
    ),
    "nsclc_match_2": (
        "Confirmed Stage IIIB NSCLC, squamous cell histology. Patient is treatment-naive. "
        "Imaging shows no brain metastases. No history of autoimmune disease. "
        "No active chronic infections. Quantiferon-TB Gold test negative. "
        "Patient is eligible for targeted immunotherapy evaluation."
    ),
    "nsclc_match_3": (
        "Newly diagnosed NSCLC, Stage IIA. Biopsy confirms ALK rearrangement positive. "
        "Patient has completed 4 cycles of platinum-based chemotherapy (Carboplatin/Pemetrexed) "
        "with partial response. No prior PD-1/PD-L1 exposure. No autoimmune conditions. "
        "HIV, Hepatitis B and C screening all negative."
    ),
    "nsclc_match_4": (
        "Stage II Non-Small Cell Lung Cancer diagnosed via CT-guided biopsy. Adenocarcinoma subtype. "
        "Patient is a 58-year-old former smoker with 30 pack-year history. ECOG PS 1. "
        "No prior immunotherapy. No history of organ transplantation or autoimmune disease. "
        "Renal and hepatic function within normal limits."
    ),
    "nsclc_match_5": (
        "Right upper lobe mass confirmed as NSCLC on pathology. PD-L1 expression 45%. "
        "No EGFR or ALK mutations detected. Patient has stable COPD managed with inhalers. "
        "No contraindications to immunotherapy identified. No autoimmune history."
    ),

    # --- GROUP B: GOLDEN RA MATCHES (indices 30-59) ---
    "ra_match_1": (
        "Patient has severe seropositive Rheumatoid Arthritis for 5 years. "
        "Currently on Methotrexate 15mg weekly but experiencing active flare-ups. "
        "DAS28-CRP score is 5.2. No history of malignancy. "
        "Hepatitis B and C serologies are negative. Quantiferon-TB Gold test strictly negative."
    ),
    "ra_match_2": (
        "Active RA diagnosis confirmed by rheumatology. Patient failed primary "
        "TNF-inhibitor therapy (Adalimumab) 6 months ago. Joint count shows 8 tender "
        "and 6 swollen joints. No history of solid tumors or lymphoma. "
        "Chest X-ray clear. TB screening negative."
    ),
    "ra_match_3": (
        "Long-standing Rheumatoid Arthritis with radiographic evidence of joint erosion. "
        "Currently managed with low-dose prednisone 5mg daily and Leflunomide. "
        "Patient has no history of solid tumors or active chronic infections. "
        "Latest cancer screening (mammogram, colonoscopy) all negative."
    ),
    "ra_match_4": (
        "Seropositive RA with anti-CCP antibodies > 200 U/mL. Disease duration 8 years. "
        "Failed two conventional DMARDs (Methotrexate and Sulfasalazine). "
        "Seeking biologic escalation. No malignancy history. TB and Hepatitis screening negative. "
        "Cardiac risk assessment unremarkable."
    ),
    "ra_match_5": (
        "Erosive Rheumatoid Arthritis affecting bilateral MCPs and wrists. "
        "DAS28 score 4.8 indicating moderate-to-high disease activity. "
        "No prior biologic exposure. No history of cancer, active infections, "
        "or demyelinating disease. Ready for JAK inhibitor trial enrollment."
    ),

    # --- GROUP C: POISON PILLS (indices 60-79) ---
    "exclusion_nsclc_prior_pd1": (
        "Patient has Stage IV NSCLC. Notably, patient received 6 cycles of Pembrolizumab "
        "(PD-1 inhibitor) last year, which was discontinued due to disease progression. "
        "Currently seeking second-line therapy options."
    ),
    "exclusion_nsclc_autoimmune": (
        "Stage IIIA NSCLC diagnosed 3 months ago. However, patient has a known history "
        "of severe Rheumatoid Arthritis requiring active immunosuppression with Methotrexate. "
        "Immunotherapy carries risk of fatal autoimmune flare-up."
    ),
    "exclusion_nsclc_organ_transplant": (
        "NSCLC, Stage IIB. Patient is a renal transplant recipient on chronic immunosuppression "
        "(Tacrolimus, Mycophenolate). Immune checkpoint inhibitors are absolutely contraindicated "
        "due to risk of graft rejection."
    ),
    "exclusion_ra_cancer_history": (
        "Rheumatoid Arthritis patient seeking biologic therapy. Chart notes a history of "
        "Stage II Breast Cancer treated with lumpectomy and radiation 2 years ago. "
        "Immunosuppressive biologics may accelerate cancer recurrence."
    ),
    "exclusion_ra_tb": (
        "Patient with active Rheumatoid Arthritis. Routine screening revealed latent "
        "Tuberculosis (TB) infection with positive Quantiferon-TB Gold test. "
        "Awaiting infectious disease clearance before initiating biologic therapy."
    ),
    "exclusion_hiv_active": (
        "Routine consultation. Patient has active HIV infection with CD4 count of 250. "
        "Currently on antiretroviral therapy (Biktarvy). This is a universal exclusion "
        "for most immunomodulatory clinical trials."
    ),
    "exclusion_ra_hepb": (
        "RA patient with chronic Hepatitis B carrier status (HBsAg positive). "
        "Biologic therapy carries significant risk of viral reactivation. "
        "Hepatology consultation recommended prior to any immunosuppressive escalation."
    ),
    "exclusion_nsclc_brain_mets": (
        "Stage IV NSCLC with active, symptomatic brain metastases requiring ongoing "
        "dexamethasone therapy. Patient is not eligible for immunotherapy trials "
        "requiring steroid-free baseline."
    ),

    # --- GROUP D: NOISE / DECOYS (indices 80-99) ---
    "noise_hypertension": (
        "Patient follows up for routine management of primary hypertension and mild "
        "hyperlipidemia. Currently well-controlled on Lisinopril 10mg and Atorvastatin 20mg. "
        "No acute complaints. No history of malignancy or autoimmune disease."
    ),
    "noise_osteoarthritis": (
        "Evaluation for mild osteoarthritis of the right knee. Recommended physical therapy "
        "and over-the-counter NSAIDs. No history of inflammatory arthritis, malignancy, "
        "or chronic infections. General health is excellent."
    ),
    "noise_asthma": (
        "Patient seen for seasonal allergic rhinitis and mild intermittent asthma. "
        "Uses Albuterol inhaler as needed. Lungs clear to auscultation bilaterally. "
        "No systemic disease. No prior surgeries or hospitalizations."
    ),
    "noise_appendectomy": (
        "Routine post-operative follow-up for uncomplicated appendectomy performed 2 months ago. "
        "Surgical site healed well. No active medical conditions. Returns to normal activity."
    ),
    "noise_diabetes_controlled": (
        "Patient with diet-controlled Type 2 Diabetes. Latest HbA1c is 6.4%. "
        "No neuropathy or nephropathy noted. No history of cancer, autoimmune conditions, "
        "or chronic infections. Cleared for general exercise program."
    ),
}

# Pre-sorted key lists for deterministic assignment
_NSCLC_KEYS = [k for k in TEMPLATES if k.startswith("nsclc_match")]
_RA_KEYS    = [k for k in TEMPLATES if k.startswith("ra_match")]
_POISON_KEYS = [k for k in TEMPLATES if k.startswith("exclusion_")]
_NOISE_KEYS  = [k for k in TEMPLATES if k.startswith("noise_")]

def assign_template(index: int, disease_template: str = "NSCLC") -> str:
    """Deterministically assigns templates based on patient index to match the group layout."""
    
    if disease_template.upper() == "NSCLC":
        nsclc_count, ra_count = 60, 5
    elif disease_template.upper() == "RA":
        nsclc_count, ra_count = 5, 60
    else:
        nsclc_count, ra_count = 35, 30

    if index < nsclc_count:
        return _NSCLC_KEYS[index % len(_NSCLC_KEYS)]
    elif index < nsclc_count + ra_count:
        return _RA_KEYS[(index - nsclc_count) % len(_RA_KEYS)]
    elif index < nsclc_count + ra_count + 15:
        return _POISON_KEYS[(index - (nsclc_count + ra_count)) % len(_POISON_KEYS)]
    else:
        # The remaining 25 patients (Noise + Hard Fail) get noise notes
        return _NOISE_KEYS[(index - (nsclc_count + ra_count + 15)) % len(_NOISE_KEYS)]


def generate_notes(disease_template="NSCLC", out_dir="."):
    os.makedirs(out_dir, exist_ok=True)
    baseline_path = os.path.join(out_dir, "1_baseline_patients.csv")
    try:
        baseline_df = pd.read_csv(baseline_path)
    except FileNotFoundError:
        print(f"Error: {baseline_path} not found. Please run gen_1_baseline.py first.")
        return

    notes_data = []
    assignments_data = []
    
    # Generate notes tracking determinism via index
    for idx, row in baseline_df.iterrows():
        pid = row["patient_id"]
        template_key = assign_template(idx, disease_template)
        raw_text = TEMPLATES[template_key]

        # Determine the demo category (group label)
        if template_key.startswith("nsclc_match"):
            category = "GROUP_A_NSCLC_MATCH"
        elif template_key.startswith("ra_match"):
            category = "GROUP_B_RA_MATCH"
        elif template_key.startswith("exclusion_"):
            category = "GROUP_C_POISON_PILL"
        else:
            category = "GROUP_D_NOISE"

        notes_data.append({
            "note_id": f"NOTE-{pid.replace('PT-','')}-01",
            "patient_id": pid,
            "note_date": datetime.today().strftime('%Y-%m-%d'),
            "note_type": "CLINICAL_PROGRESS_NOTE",
            "raw_text": raw_text,
            "template_key": template_key,
            "demo_category": category,
        })

    df = pd.DataFrame(notes_data)
    
    # Write the assignment manifest for demo debugging BEFORE dropping columns
    manifest = df[["patient_id", "template_key", "demo_category"]].copy()
    manifest_path = os.path.join(out_dir, "1b_note_assignments.csv")
    manifest.to_csv(manifest_path, index=False)
    print(f"Generated {manifest_path} (debug manifest)")
    
    # Drop the cheat columns so the agent actually has to read the note
    df = df.drop(columns=["template_key", "demo_category"])
    notes_csv_path = os.path.join(out_dir, "1b_clinical_notes.csv")
    df.to_csv(notes_csv_path, index=False)
    
    # Generate PDFs and ZIP
    zip_path = os.path.join(out_dir, "1b_clinical_notes.zip")
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for note in notes_data:
            pdf = FPDF()
            pdf.add_page()
            pdf.set_font("Helvetica", size=12)
            pdf.cell(200, 10, text=f"Clinical Note ID: {note['note_id']}", new_x="LMARGIN", new_y="NEXT", align='C')
            pdf.cell(200, 10, text=f"Patient ID: {note['patient_id']}", new_x="LMARGIN", new_y="NEXT", align='C')
            pdf.cell(200, 10, text=f"Date: {note['note_date']}", new_x="LMARGIN", new_y="NEXT", align='C')
            pdf.ln(10)
            pdf.multi_cell(0, 10, text=note['raw_text'])
            
            pdf_filename = f"{note['patient_id']}_clinical_note.pdf"
            pdf_filepath = os.path.join(out_dir, pdf_filename)
            pdf.output(pdf_filepath)
            zipf.write(pdf_filepath, arcname=pdf_filename)
            os.remove(pdf_filepath) # clean up individual PDFs

    # Print summary
    print(f"Generated {notes_csv_path} and {zip_path} — {len(df)} notes")
    for cat in ["GROUP_A_NSCLC_MATCH", "GROUP_B_RA_MATCH", "GROUP_C_POISON_PILL", "GROUP_D_NOISE"]:
        count = len([d for d in notes_data if d["demo_category"] == cat])
        print(f"  {cat}: {count}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--disease", type=str, default="NSCLC", choices=["NSCLC", "RA", "MIXED"])
    parser.add_argument("--out_dir", type=str, default=".", help="Output directory")
    args = parser.parse_args()
    generate_notes(disease_template=args.disease, out_dir=args.out_dir)
