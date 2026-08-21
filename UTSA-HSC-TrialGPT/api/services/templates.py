"""
api/services/templates.py
=========================
Generates deterministic documentation (PI signatures, SMS) without LLM hallucinations.
"""

from datetime import datetime
from core.database import get_db_connection

def generate_pi_signature_form(patient_id: str, trial_id: str = "TRIAL_123", consent_version: str = "1.2") -> str:
    """Generates a standard FDA PI-Signature Form for a cohort enrollee."""
    with get_db_connection() as conn:
        patient = conn.execute(
            "SELECT * FROM patient_vitals_baseline WHERE patient_id = ?", 
            (patient_id,)
        ).fetchone()
        
    if not patient:
        return "Error: Patient not found."
        
    date_str = datetime.now().strftime("%Y-%m-%d")
    
    return f"""
# Principal Investigator Authorization Form
**Trial ID:** {trial_id}
**Date:** {date_str}

## Patient Summary
- **Subject ID:** {patient_id}
- **Age:** {patient['age']} | **Sex:** {patient['sex']}
- **Baseline eGFR:** {patient['egfr']} mL/min
- **Baseline Platelets:** {patient['platelets']} /mcL

## Certification
I, the Principal Investigator, certify that the subject described above meets all
Phase 1 deterministic gating rules and Phase 2 semantic matching criteria.
The subject's digital twin baseline indicates organ stability sufficient for 
initial dosing.

- [x] Protocol Inclusion/Exclusion Criteria Met
- [x] Informed Consent Version {consent_version} Verified

**PI Signature:** _____________________________
**Date:** ___________________________________
"""


def generate_sms_outreach(patient_id: str, clinic_name: str = "UTSA Health Science Center") -> str:
    """Generates a deterministic SMS outreach template."""
    return (
        f"URGENT: Hello, this is {clinic_name}. "
        f"Patient {patient_id} has been successfully pre-screened for a new clinical trial. "
        f"Please reply 'YES' to schedule an onboarding consultation or call 555-0199."
    )
