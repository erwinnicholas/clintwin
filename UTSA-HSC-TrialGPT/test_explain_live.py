import sys
import os

# Add to path
sys.path.append("/media/nick/New Volume/projects/Hexaware_hackathon/UTSA-HSC-TrialGPT")

from api.services.explain import generate_explainability_report
from dotenv import load_dotenv

load_dotenv()

test_cases = [
    {
        "context_type": "PATIENT_ELIGIBILITY",
        "action": "Patient Eligibility Assessment for P-001",
        "rationale": "Evaluate patient clinical profile against standard trial inclusion/exclusion criteria.",
        "belief_state": {
            "patient_id": "P-001", "age": 45, "sex": "M", "bmi": 28.5,
            "ecog_score": 1, "egfr": 75, "platelets": 150000,
            "hemoglobin": 11.2, "alt": 45, "ast": 40,
            "systolic_bp": 120, "diastolic_bp": 80
        }
    },
    {
        "context_type": "TRIAL_PIPELINE",
        "action": "Trial Pipeline: COMPLIANCE",
        "rationale": "Explain current stage implications for trial NCT-12345.",
        "belief_state": {
            "trial_id": "NCT-12345", "title": "Oncology Phase II Trial",
            "status": "Active", "pipeline_stage": "COMPLIANCE",
            "description": "Evaluating the efficacy of drug X"
        }
    },
    {
        "context_type": "SIMULATION_DECISION",
        "action": "HALT_PATIENT",
        "rationale": "Patient P-042 drifted into high-risk zone for ALT elevation.",
        "belief_state": {
            "patient_id": "P-042", "day": 28, "alt": 180, "egfr": 50
        }
    }
]

print("USING AI PROVIDER:", os.environ.get("AI_PROVIDER"))
print("GEMINI KEY SET:", bool(os.environ.get("GEMINI_API_KEY")))

for i, test in enumerate(test_cases):
    print(f"\n--- TEST CASE {i+1}: {test['context_type']} ---")
    try:
        report = generate_explainability_report(
            test["context_type"], 
            test["action"], 
            test["rationale"], 
            test["belief_state"]
        )
        print("REPORT:\n", report)
    except Exception as e:
        print("Exception caught:", e)

