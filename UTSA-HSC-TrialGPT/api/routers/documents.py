from fastapi import APIRouter
from core.schemas import DocumentResponse
from api.services.templates import generate_pi_signature_form, generate_sms_outreach

router = APIRouter()

@router.get("/pi_form", response_model=DocumentResponse)
def get_pi_form(patient_id: str):
    return DocumentResponse(markdown=generate_pi_signature_form(patient_id))

@router.get("/sms", response_model=DocumentResponse)
def get_sms(patient_id: str):
    return DocumentResponse(text=generate_sms_outreach(patient_id))
