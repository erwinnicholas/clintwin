import sys
import os

# Add to path
sys.path.append("/media/nick/New Volume/projects/Hexaware_hackathon/UTSA-HSC-TrialGPT")

from api.services.explain import generate_explainability_report

# Ensure dummy keys are in environ if not loaded by dotenv
if not os.environ.get("GEMINI_API_KEY"):
    os.environ["GEMINI_API_KEY"] = "dummy"

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
    }
]

for test in test_cases:
    try:
        report = generate_explainability_report(
            test["context_type"], 
            test["action"], 
            test["rationale"], 
            test["belief_state"]
        )
        print("REPORT:", report)
    except Exception as e:
        print("Exception caught as expected with dummy key:", e)

