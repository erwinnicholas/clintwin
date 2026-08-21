from fastapi import APIRouter
from core.schemas import FilterResultResponse
from api.services.pipeline_executor import PipelineExecutorService

router = APIRouter()

@router.post("/{trial_id}/pipeline/hard-filter", response_model=FilterResultResponse)
async def run_hard_filter(trial_id: str):
    return PipelineExecutorService.run_hard_filter(trial_id)

@router.post("/{trial_id}/pipeline/semantic-filter", response_model=FilterResultResponse)
async def run_semantic_filter(trial_id: str):
    return PipelineExecutorService.run_semantic_filter(trial_id)

@router.post("/{trial_id}/pipeline/compliance-check", response_model=FilterResultResponse)
async def run_compliance_check(trial_id: str):
    return PipelineExecutorService.run_compliance_check(trial_id)

@router.post("/{trial_id}/pipeline/build-twins", response_model=FilterResultResponse)
async def build_twins(trial_id: str):
    return PipelineExecutorService.build_digital_twins(trial_id)
