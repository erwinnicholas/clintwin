from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from datetime import datetime
from core.database import get_db_connection
from core.schemas import (
    TrialCreateRequest, TrialResponse, ComplianceRuleRequest, TextCriteriaRequest,
    TrialCriteriaPreviewResponse, TrialCriterionRow, TrialCriteriaResponse, TrialTextCriterion
)
import uuid
import pandas as pd
import math

router = APIRouter()

@router.post("/", response_model=TrialResponse)
async def create_trial(request: TrialCreateRequest):
    trial_id = f"TRIAL_{uuid.uuid4().hex[:6].upper()}"
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO trials (trial_id, title, description, status, pipeline_stage, created_at) VALUES (?, ?, ?, 'CREATED', 'NONE', ?)",
            (trial_id, request.title, request.description, datetime.now().isoformat())
        )
        conn.commit()
    return TrialResponse(
        trial_id=trial_id, title=request.title, description=request.description,
        status="CREATED", pipeline_stage="NONE", created_at=datetime.now().isoformat()
    )

@router.get("/", response_model=List[TrialResponse])
async def list_trials():
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM trials").fetchall()
        return [TrialResponse(**dict(r)) for r in rows]

@router.get("/{trial_id}/criteria", response_model=TrialCriteriaResponse)
async def get_trial_criteria(trial_id: str):
    with get_db_connection() as conn:
        tabular_rows = conn.execute(
            "SELECT * FROM trial_criteria WHERE trial_id = ?", (trial_id,)
        ).fetchall()
        
        text_rows = conn.execute(
            "SELECT * FROM trial_text_criteria WHERE trial_id = ?", (trial_id,)
        ).fetchall()
        
        tabular_criteria = [TrialCriterionRow(**dict(r)) for r in tabular_rows]
        text_criteria = [TrialTextCriterion(**dict(r)) for r in text_rows]
        
    return TrialCriteriaResponse(
        trial_id=trial_id,
        tabular_criteria=tabular_criteria,
        text_criteria=text_criteria
    )

@router.post("/{trial_id}/criteria/tabular/preview", response_model=TrialCriteriaPreviewResponse)
async def preview_tabular_criteria(trial_id: str, file: UploadFile = File(...)):
    import shutil
    import os
    
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(400, "Must be CSV or XLSX")
    
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        df = pd.read_csv(temp_path) if file.filename.endswith(".csv") else pd.read_excel(temp_path)
        
        criteria = []
        error_rows = 0
        valid_rows = 0
        
        for i, row in df.iterrows():
            validation_errors = []
            
            rule_type = str(row.get("rule_type", "")).strip().upper()
            if rule_type not in ["INCLUSION", "EXCLUSION"]:
                validation_errors.append(f"Invalid rule_type: {rule_type}")
                
            field_name = str(row.get("field_name", "")).strip()
            if not field_name:
                validation_errors.append("field_name is required")
                
            operator = str(row.get("operator", "")).strip()
            if not operator:
                validation_errors.append("operator is required")
                
            value_min = row.get("value_min")
            if pd.isna(value_min):
                value_min = None
                
            value_max = row.get("value_max")
            if pd.isna(value_max):
                value_max = None
                
            is_valid = len(validation_errors) == 0
            if is_valid:
                valid_rows += 1
            else:
                error_rows += 1
                
            criteria.append(TrialCriterionRow(
                criterion_id=str(row.get("criterion_id", uuid.uuid4().hex[:8])),
                rule_type=rule_type,
                field_name=field_name,
                operator=operator,
                value_min=value_min,
                value_max=value_max,
                is_valid=is_valid,
                validation_errors=validation_errors,
                row_index=i
            ))
            
        return TrialCriteriaPreviewResponse(
            total_rows=len(df),
            valid_rows=valid_rows,
            error_rows=error_rows,
            criteria=criteria
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

from pydantic import BaseModel
class TrialCriteriaConfirmRequest(BaseModel):
    criteria: List[TrialCriterionRow]

@router.post("/{trial_id}/criteria/tabular/confirm")
async def confirm_tabular_criteria(trial_id: str, request: TrialCriteriaConfirmRequest):
    with get_db_connection() as conn:
        for criteria_row in request.criteria:
            if not criteria_row.is_valid:
                continue
            conn.execute(
                "INSERT INTO trial_criteria (trial_id, criterion_id, rule_type, field_name, operator, value_min, value_max) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (trial_id, criteria_row.criterion_id or uuid.uuid4().hex[:8], criteria_row.rule_type, criteria_row.field_name, criteria_row.operator, criteria_row.value_min, criteria_row.value_max)
            )
        conn.commit()
    return {"status": "success", "message": "Tabular criteria confirmed and saved."}

class TrialStatusUpdateRequest(BaseModel):
    status: str

@router.put("/{trial_id}/status")
async def update_trial_status(trial_id: str, request: TrialStatusUpdateRequest):
    with get_db_connection() as conn:
        conn.execute("UPDATE trials SET status = ? WHERE trial_id = ?", (request.status, trial_id))
        conn.commit()
    return {"status": "success", "message": f"Trial status updated to {request.status}"}

@router.get("/{trial_id}/patients")
async def get_trial_patients(trial_id: str):
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT patient_id, filter_stage, arm_id FROM trial_patients WHERE trial_id = ?",
            (trial_id,)
        ).fetchall()
        return [dict(r) for r in rows]

@router.post("/{trial_id}/criteria/text")
async def upload_text_criteria(trial_id: str, request: TextCriteriaRequest):
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO trial_text_criteria (trial_id, criteria_text, uploaded_at) VALUES (?, ?, ?)",
            (trial_id, request.criteria_text, datetime.now().isoformat())
        )
        conn.commit()
    return {"status": "success", "message": "Text criteria saved."}

@router.post("/{trial_id}/compliance")
async def upload_compliance(trial_id: str, request: ComplianceRuleRequest):
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO trial_compliance_rules (trial_id, rule_text, uploaded_at) VALUES (?, ?, ?)",
            (trial_id, request.rule_text, datetime.now().isoformat())
        )
        conn.commit()
    return {"status": "success", "message": "Compliance rules saved."}

@router.get("/{trial_id}/compliance")
async def get_compliance(trial_id: str):
    with get_db_connection() as conn:
        rows = conn.execute("SELECT rule_text FROM trial_compliance_rules WHERE trial_id = ?", (trial_id,)).fetchall()
        return {"rules": [r["rule_text"] for r in rows]}
@router.post("/{trial_id}/generate-cohort")
async def generate_trial_cohort(trial_id: str):
    from core.orchestrator import PipelineOrchestrator
    # We can run this directly since it handles its own exceptions, or in background. 
    # For now, we will run it directly so the UI can wait for it.
    try:
        result = PipelineOrchestrator.run_full_pipeline(trial_id)
        if result.get("status") == "error":
            raise HTTPException(status_code=500, detail=result.get("message"))
        return {"status": "success", "message": "Cohort generated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
