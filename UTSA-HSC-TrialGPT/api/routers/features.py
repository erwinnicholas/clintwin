import os
from fastapi import APIRouter
from core.schemas import FeatureFlagResponse

router = APIRouter()

@router.get("/features", response_model=FeatureFlagResponse)
def get_features():
    """Returns the backend capabilities for graceful UI fallback."""
    has_gemini = bool(os.environ.get("GEMINI_API_KEY"))
    return FeatureFlagResponse(
        rag_search_enabled=has_gemini,
        gemini_explanations_enabled=has_gemini
    )
