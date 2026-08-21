from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import subprocess
import os
import glob
from core.ingestion_engine import ClinicalIngestionPipeline
from core.database import initialize_database, get_db_connection
from core.config import DATA_DIR
from pathlib import Path

router = APIRouter()

class GenerationRequest(BaseModel):
    disease_template: str = "NSCLC"

@router.post("/run/{script_name}")
async def run_generator(script_name: str, request: GenerationRequest):
    valid_scripts = ["gen_1_baseline", "gen_1b_clinical_notes", "gen_2_history", "gen_trial_rules", "gen_compliance", "gen_3_trial_step"]
    if script_name not in valid_scripts:
        raise HTTPException(status_code=400, detail="Invalid script name")
        
    script_path = os.path.join("generators", f"{script_name}.py")
    if not os.path.exists(script_path):
        raise HTTPException(status_code=404, detail="Script not found")

    out_dir = f"test_packages/{request.disease_template}"
    os.makedirs(out_dir, exist_ok=True)

    try:
        # Run the generation script as a subprocess
        cmd = ["python3", script_path]
        if script_name in ["gen_1_baseline", "gen_1b_clinical_notes", "gen_trial_rules", "gen_compliance"]:
            cmd.extend(["--disease", request.disease_template])
            
        cmd.extend(["--out_dir", out_dir])

        if script_name == "gen_3_trial_step":
            cmd.extend([
                "--baseline_file", f"{out_dir}/1_baseline_patients.csv",
                "--metadata_file", f"{out_dir}/1_baseline_metadata.csv",
                "--duration", "180"
            ])
            
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return {"status": "success", "message": f"{script_name} completed and saved to {out_dir}", "output": result.stdout}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e.stderr}")

@router.get("/download/{disease_template}/{filename}")
async def download_file(disease_template: str, filename: str):
    out_dir = f"test_packages/{disease_template}"
    valid_files = [
        "1_baseline_patients.csv", 
        "1b_clinical_notes.csv", 
        "1b_clinical_notes.zip",
        "1b_note_assignments.csv", 
        "2_6month_history.csv",
        "trial_rules.csv",
        "trial_rules_text.csv",
        "trial_rules.txt",
        "trial_compliance_rules.csv",
        "3_trial_trajectory.csv",
        "3_arm_allocations.json"
    ]
    if filename not in valid_files:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = os.path.join(out_dir, filename)
        
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found at {file_path}. Generate it first.")
        
    if filename.endswith(".zip"):
        return FileResponse(path=file_path, filename=filename, media_type='application/zip')
    return FileResponse(path=file_path, filename=filename, media_type='text/csv')

@router.post("/ingest/{disease_template}")
async def ingest_generated_data(disease_template: str):
    """Wipes database and ingests the cleanly generated CSVs directly from disk for a specific disease."""
    out_dir = f"test_packages/{disease_template}"
    if not os.path.exists(out_dir):
        raise HTTPException(status_code=404, detail=f"Data folder {out_dir} not found. Run generators first.")

    try:
        # 1. Wipe DB and re-initialize tables
        initialize_database()
        with get_db_connection() as conn:
            tables_to_wipe = [
                "patient_vitals_baseline",
                "patient_longitudinal_records",
                "patient_clinical_notes",
                "clinical_text_spans",
                "trial_patients",
                "digital_twins",
                "simulation_runs",
                "simulation_alerts",
                "simulation_decision_log",
                "trial_criteria",
                "trial_compliance_rules"
            ]
            for table in tables_to_wipe:
                conn.execute(f"DELETE FROM {table}")
            conn.commit()

        # 2. Ingest structured baseline & history
        pipeline = ClinicalIngestionPipeline()
        baseline_path = os.path.join(out_dir, "1_baseline_patients.csv")
        if os.path.exists(baseline_path):
            pipeline.ingest_tabular_patient_data(baseline_path)
            
        history_path = os.path.join(out_dir, "2_6month_history.csv")
        if os.path.exists(history_path):
            pipeline.ingest_longitudinal_data(history_path)

        # 3. Ingest unstructured clinical notes
        notes_path = os.path.join(out_dir, "1b_clinical_notes.csv")
        if os.path.exists(notes_path):
            import pandas as pd
            df_notes = pd.read_csv(notes_path)
            for _, row in df_notes.iterrows():
                pipeline.ingest_unstructured_note(
                    note_id=row["note_id"],
                    patient_id=row["patient_id"],
                    note_date=row["note_date"],
                    note_type=row["note_type"],
                    raw_text=row["raw_text"]
                )
                
        # 4. Ingest rules and compliance
        import pandas as pd
        rules_path = os.path.join(out_dir, "trial_rules.csv")
        if os.path.exists(rules_path):
            df_rules = pd.read_csv(rules_path)
            with get_db_connection() as conn:
                df_rules.to_sql("trial_criteria", conn, if_exists="append", index=False)
                conn.commit()
                
        compliance_path = os.path.join(out_dir, "trial_compliance_rules.csv")
        if os.path.exists(compliance_path):
            df_comp = pd.read_csv(compliance_path)
            with get_db_connection() as conn:
                df_comp.to_sql("trial_compliance_rules", conn, if_exists="append", index=False)
                conn.commit()

        return {"status": "success", "message": f"Database wiped and data from {out_dir} successfully ingested."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
