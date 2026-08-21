import os
import shutil
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import List
from core.database import get_db_connection
from core.schemas import PatientListItem, NoteUploadRequest, PatientPreviewRow, PatientPreviewResponse, PatientConfirmRequest, PatientConfirmResponse
from core.ingestion_engine import ClinicalIngestionPipeline
from core.config import DB_PATH

router = APIRouter()

@router.get("/", response_model=List[PatientListItem])
async def list_patients(trial_id: str = Query(None, description="Filter by trial ID and determine eligibility")):
    with get_db_connection() as conn:
        if trial_id:
            query = """
                SELECT p.patient_id, p.age, p.sex, p.bmi, p.ecog_score, p.systolic_bp, 
                       p.diastolic_bp, p.egfr, p.platelets, p.hemoglobin, p.alt, p.ast,
                       tp.filter_stage as filter_stage
                FROM patient_vitals_baseline p
                LEFT JOIN trial_patients tp ON p.patient_id = tp.patient_id AND tp.trial_id = ?
            """
            rows = conn.execute(query, (trial_id,)).fetchall()
        else:
            query = "SELECT patient_id, age, sex, bmi, ecog_score, systolic_bp, diastolic_bp, egfr, platelets, hemoglobin, alt, ast, NULL as filter_stage FROM patient_vitals_baseline"
            rows = conn.execute(query).fetchall()
        
        return [PatientListItem(**dict(r)) for r in rows]

@router.delete("/reset")
async def reset_patients():
    tables = [
        "patient_vitals_baseline", "patient_longitudinal_records", 
        "patient_clinical_notes", "clinical_text_spans", 
        "trial_patients", "digital_twins", "simulation_runs", 
        "simulation_alerts", "simulation_decision_log", 
        "trial_criteria", "trial_compliance_rules", "trials"
    ]
    with get_db_connection() as conn:
        for t in tables:
            conn.execute(f"DELETE FROM {t}")
        conn.commit()
    return {"status": "success", "message": "All database tables truncated successfully."}

@router.post("/upload/tabular/preview", response_model=PatientPreviewResponse)
async def upload_tabular_preview(file: UploadFile = File(...)):
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(400, "Must be CSV or XLSX")
    
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(temp_path)
        else:
            df = pd.read_excel(temp_path)
            
        patients = []
        valid_rows = 0
        error_rows = 0
        
        for index, row in df.iterrows():
            errors = []
            
            try: age = int(row.get('age', 0))
            except: age = 0; errors.append("Invalid age")
            
            try: bmi = float(row.get('bmi', 0.0))
            except: bmi = 0.0; errors.append("Invalid bmi")
            
            try: ecog_score = int(row.get('ecog_score', 0))
            except: ecog_score = 0; errors.append("Invalid ecog_score")
            
            # Numeric labs
            try: systolic_bp = float(row.get('systolic_bp', 0.0))
            except: systolic_bp = 0.0; errors.append("Invalid systolic_bp")
            
            try: diastolic_bp = float(row.get('diastolic_bp', 0.0))
            except: diastolic_bp = 0.0; errors.append("Invalid diastolic_bp")
            
            try: egfr = float(row.get('egfr', 0.0))
            except: egfr = 0.0; errors.append("Invalid egfr")
            
            try: platelets = float(row.get('platelets', 0.0))
            except: platelets = 0.0; errors.append("Invalid platelets")
            
            try: hemoglobin = float(row.get('hemoglobin', 0.0))
            except: hemoglobin = 0.0; errors.append("Invalid hemoglobin")
            
            try: alt = float(row.get('alt', 0.0))
            except: alt = 0.0; errors.append("Invalid alt")
            
            try: ast = float(row.get('ast', 0.0))
            except: ast = 0.0; errors.append("Invalid ast")
            
            is_valid = len(errors) == 0
            if is_valid: valid_rows += 1
            else: error_rows += 1
            
            patients.append(PatientPreviewRow(
                row_index=index,
                patient_id=str(row.get('patient_id', '')), 
                age=age,
                sex=str(row.get('sex', 'Unknown')),
                bmi=bmi,
                ecog_score=ecog_score,
                systolic_bp=systolic_bp,
                diastolic_bp=diastolic_bp,
                egfr=egfr,
                platelets=platelets,
                hemoglobin=hemoglobin,
                alt=alt,
                ast=ast,
                is_valid=is_valid,
                validation_errors=errors
            ))
            
        return PatientPreviewResponse(
            total_rows=len(patients),
            valid_rows=valid_rows,
            error_rows=error_rows,
            patients=patients
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/upload/tabular/confirm", response_model=PatientConfirmResponse)
async def upload_tabular_confirm(request: PatientConfirmRequest):
    inserted_count = 0
    skipped_count = 0
    patient_ids = []
    
    with get_db_connection() as conn:
        for p in request.patients:
            if not p.is_valid:
                skipped_count += 1
                continue
                
            if p.patient_id and str(p.patient_id).strip():
                new_id = str(p.patient_id).strip()
            else:
                row = conn.execute("SELECT patient_id FROM patient_vitals_baseline WHERE patient_id LIKE 'PID_%' ORDER BY rowid DESC LIMIT 1").fetchone()
                if row:
                    try:
                        last_num = int(row['patient_id'].split('_')[1])
                        new_id = f"PID_{last_num + 1:04d}"
                    except:
                        new_id = f"PID_0001"
                else:
                    new_id = f"PID_0001"
                
            conn.execute(
                """INSERT INTO patient_vitals_baseline 
                   (patient_id, age, sex, bmi, ecog_score, systolic_bp, diastolic_bp, egfr, platelets, hemoglobin, alt, ast, irb_consent_signed, hipaa_authorization)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)""",
                (new_id, p.age, p.sex, p.bmi, p.ecog_score, p.systolic_bp, p.diastolic_bp, p.egfr, p.platelets, p.hemoglobin, p.alt, p.ast)
            )
            patient_ids.append(new_id)
            inserted_count += 1
            
        conn.commit()
        
    return PatientConfirmResponse(
        inserted_count=inserted_count,
        skipped_count=skipped_count,
        patient_ids=patient_ids
    )

@router.post("/upload/tabular")
async def upload_tabular(file: UploadFile = File(...)):
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(400, "Must be CSV or XLSX")
    
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        pipeline = ClinicalIngestionPipeline(str(DB_PATH))
        pipeline.ingest_tabular_patient_data(temp_path)
        return {"status": "success", "message": "Tabular baseline data ingested."}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/upload/notes")
async def upload_notes(request: NoteUploadRequest):
    pipeline = ClinicalIngestionPipeline(str(DB_PATH))
    pipeline.ingest_unstructured_note(
        note_id=request.note_id,
        patient_id=request.patient_id,
        note_date=request.note_date,
        note_type=request.note_type,
        raw_text=request.raw_text
    )
    return {"status": "success", "message": "Clinical note ingested and text chunks indexed."}

import zipfile
from pypdf import PdfReader
import uuid
from datetime import datetime

@router.post("/upload/notes-csv")
async def upload_notes_csv(file: UploadFile = File(...)):
    """Bulk upload clinical notes from a CSV."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "Must be CSV")
    
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        df = pd.read_csv(temp_path)
        required = {"note_id", "patient_id", "note_date", "note_type", "raw_text"}
        if not required.issubset(set(df.columns)):
            raise HTTPException(400, f"CSV must contain columns: {required}")
        
        pipeline = ClinicalIngestionPipeline(str(DB_PATH))
        count = 0
        for _, row in df.iterrows():
            pipeline.ingest_unstructured_note(
                note_id=str(row["note_id"]),
                patient_id=str(row["patient_id"]),
                note_date=str(row["note_date"]),
                note_type=str(row["note_type"]),
                raw_text=str(row["raw_text"])
            )
            count += 1
        
        return {"status": "success", "message": f"Ingested {count} clinical notes with span indexing."}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/upload/notes-zip")
async def upload_notes_zip(file: UploadFile = File(...)):
    """Upload clinical notes from ZIP, PDF, or TXT."""
    if not file.filename.endswith(('.zip', '.pdf', '.txt')):
        raise HTTPException(400, "Must be ZIP, PDF, or TXT")
    
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    pipeline = ClinicalIngestionPipeline(str(DB_PATH))
    count = 0
    
    try:
        if file.filename.endswith('.zip'):
            with zipfile.ZipFile(temp_path, 'r') as zip_ref:
                for zip_info in zip_ref.infolist():
                    if zip_info.filename.endswith('.pdf'):
                        with zip_ref.open(zip_info) as pdf_file:
                            reader = PdfReader(pdf_file)
                            text = "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])
                            patient_id = zip_info.filename.split('_')[0] if '_' in zip_info.filename else f"PT-UNKNOWN"
                            pipeline.ingest_unstructured_note(
                                note_id=f"NOTE-{uuid.uuid4().hex[:8]}",
                                patient_id=patient_id,
                                note_date=datetime.today().strftime('%Y-%m-%d'),
                                note_type="CLINICAL_NOTE",
                                raw_text=text
                            )
                            count += 1
                    elif zip_info.filename.endswith('.txt'):
                        with zip_ref.open(zip_info) as txt_file:
                            text = txt_file.read().decode('utf-8', errors='ignore')
                            patient_id = zip_info.filename.split('_')[0] if '_' in zip_info.filename else f"PT-UNKNOWN"
                            pipeline.ingest_unstructured_note(
                                note_id=f"NOTE-{uuid.uuid4().hex[:8]}",
                                patient_id=patient_id,
                                note_date=datetime.today().strftime('%Y-%m-%d'),
                                note_type="CLINICAL_NOTE",
                                raw_text=text
                            )
                            count += 1
                            
        elif file.filename.endswith('.pdf'):
            reader = PdfReader(temp_path)
            text = "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])
            patient_id = file.filename.split('_')[0] if '_' in file.filename else f"PT-UNKNOWN"
            pipeline.ingest_unstructured_note(
                note_id=f"NOTE-{uuid.uuid4().hex[:8]}",
                patient_id=patient_id,
                note_date=datetime.today().strftime('%Y-%m-%d'),
                note_type="CLINICAL_NOTE",
                raw_text=text
            )
            count = 1
            
        elif file.filename.endswith('.txt'):
            with open(temp_path, 'r') as txt_file:
                text = txt_file.read()
                patient_id = file.filename.split('_')[0] if '_' in file.filename else f"PT-UNKNOWN"
                pipeline.ingest_unstructured_note(
                    note_id=f"NOTE-{uuid.uuid4().hex[:8]}",
                    patient_id=patient_id,
                    note_date=datetime.today().strftime('%Y-%m-%d'),
                    note_type="CLINICAL_NOTE",
                    raw_text=text
                )
                count = 1
                
        return {"status": "success", "message": f"Ingested {count} clinical notes."}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/upload/longitudinal")
async def upload_longitudinal(file: UploadFile = File(...)):
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(400, "Must be CSV or XLSX")
    
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        pipeline = ClinicalIngestionPipeline(str(DB_PATH))
        pipeline.ingest_longitudinal_data(temp_path)
        return {"status": "success", "message": "Longitudinal history ingested."}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.get("/upload/longitudinal/check")
async def check_longitudinal_data():
    """Checks if any 6-month longitudinal data has been uploaded to the database."""
    with get_db_connection() as conn:
        count = conn.execute("SELECT COUNT(*) FROM patient_longitudinal_records").fetchone()[0]
        return {"has_data": count > 0, "record_count": count}

@router.get("/{patient_id}/notes")
async def get_patient_notes(patient_id: str):
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT note_id, note_date, note_type, raw_text FROM patient_clinical_notes WHERE patient_id = ? ORDER BY note_date DESC",
            (patient_id,)
        ).fetchall()
        
        if not rows:
            return []
            
        return [dict(r) for r in rows]
