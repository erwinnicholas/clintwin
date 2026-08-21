import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from core.schemas import ExplainResponse
from api.services.explain import generate_explainability_report

router = APIRouter()

class ExplainRequest(BaseModel):
    context_type: str = "SIMULATION_DECISION"
    action: str
    rationale: str
    belief_state: Dict[str, Any]

@router.post("", response_model=ExplainResponse)
def explain_decision(req: ExplainRequest):
    """
    Calls the AI Provider to translate a clinical/POMDP decision 
    into a human-readable report.
    """
    if not os.environ.get("GEMINI_API_KEY") and not os.environ.get("GROQ_API_KEY"):
        # Fallback if no API key is provided
        return ExplainResponse(report=f"[MOCK GENAI] The agent triggered an {req.action} because: {req.rationale}")
        
    try:
        report = generate_explainability_report(req.context_type, req.action, req.rationale, req.belief_state)
        return ExplainResponse(report=report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
