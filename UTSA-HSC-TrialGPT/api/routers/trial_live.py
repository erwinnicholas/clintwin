from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse
import os
import shutil

from api.services.trial_step_service import TrialLiveService
from api.services.report_generator import ReportGenerator

router = APIRouter()

@router.post("/{trial_id}/live/start")
async def start_live_trial(trial_id: str):
    try:
        return TrialLiveService.start_trial(trial_id)
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.post("/{trial_id}/live/{run_id}/step")
async def upload_trial_step(trial_id: str, run_id: str, day: int, file: UploadFile = File(...)):
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(400, "Must be CSV or XLSX")
    
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        resp, deltas = TrialLiveService.process_step(run_id, day, temp_path)
        return {
            "step_response": resp.dict(),
            "delta_report": deltas
        }
    except ValueError as e:
        raise HTTPException(400, str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/{trial_id}/live/{run_id}/finalize")
async def finalize_live_trial(trial_id: str, run_id: str):
    TrialLiveService.finalize(run_id)
    return {"status": "success", "report_url": f"/api/trials/{trial_id}/live/{run_id}/report"}

@router.get("/{trial_id}/live/{run_id}/report", response_class=HTMLResponse)
async def get_trial_report(trial_id: str, run_id: str):
    return ReportGenerator.generate_html_report(trial_id, run_id)
