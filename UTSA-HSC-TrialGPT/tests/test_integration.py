"""
tests/test_integration.py — End-to-End Pipeline Integration Tests
===================================================================
Tests the interaction between Phase 1 (Deterministic Filtering) and
Phase 3 (Digital Twin Baseline Generation).

Ensures that:
1. Data ingested in Phase 1 is correctly accessible in Phase 3.
2. Patients who fail Phase 1 never make it to Phase 3.
3. Patients who pass Phase 1 but have declining trajectories are rejected in Phase 3.
4. Patients who pass Phase 1 and have stable trajectories pass Phase 3.
"""

import os
import sqlite3
import pytest
import pandas as pd
import json

from core.ingestion_engine import ClinicalIngestionPipeline
from filters.deterministic import execute_filter
from core.schemas import PatientBaseline, MetricSnapshot
from core.twin_builder import DigitalTwinBuilder
from core.database import initialize_database, get_db_connection
import core.config

# ── Shared Test Paths ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_DB = os.path.join(BASE_DIR, 'tests', 'integration_test.db')
TEST_STATIC_CSV = os.path.join(BASE_DIR, 'tests', 'int_static_patients.csv')
TEST_RULES_CSV = os.path.join(BASE_DIR, 'tests', 'int_trial_rules.csv')

# ── Setup & Teardown ──────────────────────────────────────────────

@pytest.fixture(autouse=True)
def setup_integration_data():
    """
    Sets up the full data pipeline state before tests run.
    """
    # 1. Create Trial Rules (Phase 1)
    rules_df = pd.DataFrame([
        {"trial_id": "TEST_TRIAL", "criterion_id": "INC_01", "rule_type": "INCLUSION", "field_name": "age", "operator": "BETWEEN", "value_min": 18, "value_max": 80},
        {"trial_id": "TEST_TRIAL", "criterion_id": "EXC_01", "rule_type": "EXCLUSION", "field_name": "ast", "operator": ">", "value_min": 100, "value_max": None},
    ])
    rules_df.to_csv(TEST_RULES_CSV, index=False)

    # 2. Create Static Patient Data (Phase 1)
    static_df = pd.DataFrame([
        # Passes Phase 1, Passes Phase 3 (Stable)
        {"patient_id": "INT-01", "record_date": "2024-01-01", "age": 45, "sex": "F", "bmi": 24, "is_pregnant": 0, "systolic_bp": 120, "diastolic_bp": 80, "egfr": 90, "serum_creatinine": 1, "alt": 25, "ast": 25, "total_bilirubin": 1, "anc": 2000, "platelets": 200000, "hemoglobin": 13, "hba1c": 5, "inr": 1, "ecog_score": 0, "hiv_status": 0, "hepb_status": 0, "hepc_status": 0, "irb_consent_signed": 1},
        
        # Fails Phase 1 (AST > 100) -> Should never reach Phase 3
        {"patient_id": "INT-02", "record_date": "2024-01-01", "age": 50, "sex": "M", "bmi": 28, "is_pregnant": 0, "systolic_bp": 120, "diastolic_bp": 80, "egfr": 90, "serum_creatinine": 1, "alt": 150, "ast": 200, "total_bilirubin": 2, "anc": 2000, "platelets": 200000, "hemoglobin": 13, "hba1c": 5, "inr": 1, "ecog_score": 0, "hiv_status": 0, "hepb_status": 0, "hepc_status": 0, "irb_consent_signed": 1},
        
        # Passes Phase 1, but Fails Phase 3 (Declining eGFR trajectory)
        {"patient_id": "INT-03", "record_date": "2024-01-01", "age": 60, "sex": "M", "bmi": 25, "is_pregnant": 0, "systolic_bp": 120, "diastolic_bp": 80, "egfr": 90, "serum_creatinine": 1, "alt": 30, "ast": 30, "total_bilirubin": 1, "anc": 2000, "platelets": 200000, "hemoglobin": 13, "hba1c": 5, "inr": 1, "ecog_score": 0, "hiv_status": 0, "hepb_status": 0, "hepc_status": 0, "irb_consent_signed": 1},
    ])
    static_df.to_csv(TEST_STATIC_CSV, index=False)

    # Set up DB path for tests
    core.config.DB_PATH = TEST_DB
    initialize_database()

    # 3. run Phase 1 Ingestion
    pipeline = ClinicalIngestionPipeline()
    pipeline.ingest_tabular_patient_data(TEST_STATIC_CSV)

    # 5. Insert Phase 3 Longitudinal Data
    # INT-01: Stable
    long_data = [
        ("INT-01", 180, "2023-07-01", 90, 1.0, 25, 25, 200000, 2000, 13, 120, 80, 5.0),
        ("INT-01", 90,  "2023-10-01", 88, 1.0, 26, 26, 205000, 2100, 13.1, 118, 78, 5.1),
        ("INT-01", 10,  "2023-12-20", 89, 1.0, 24, 25, 198000, 2050, 12.9, 122, 82, 4.9),
        
        # INT-03: Declining eGFR (90 -> 70 -> 50)
        ("INT-03", 180, "2023-07-01", 90, 1.0, 30, 30, 200000, 2000, 13, 120, 80, 5.0),
        ("INT-03", 90,  "2023-10-01", 70, 1.5, 32, 31, 195000, 1900, 12.8, 125, 85, 5.2),
        ("INT-03", 10,  "2023-12-20", 50, 2.0, 34, 32, 190000, 1800, 12.5, 130, 88, 5.5),
    ]
    
    with get_db_connection() as conn:
        conn.execute("INSERT OR IGNORE INTO trials (trial_id, title, created_at) VALUES ('TEST_TRIAL', 'Test', 'now')")
        conn.executemany(
            """INSERT INTO patient_longitudinal_records 
               (patient_id, days_ago, observation_date, egfr, serum_creatinine, alt, ast, platelets, anc, hemoglobin, systolic_bp, diastolic_bp, hba1c)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            long_data
        )
        conn.commit()

    yield  # Run tests

    # Cleanup
    for path in [TEST_DB, TEST_STATIC_CSV, TEST_RULES_CSV]:
        if os.path.exists(path):
            os.remove(path)


# ── Integration Tests ─────────────────────────────────────────────

def test_full_pipeline_integration():
    """
    Simulates the full flow: Phase 1 Filter -> Phase 3 Twin Generation.
    """
    # ==========================================
    # PHASE 1: Run Deterministic Filter
    # ==========================================
    passed_phase1 = execute_filter(TEST_DB, TEST_RULES_CSV, "TEST_TRIAL")
    
    # INT-02 should be rejected in Phase 1 due to high AST
    assert "INT-02" not in passed_phase1
    assert "INT-01" in passed_phase1
    assert "INT-03" in passed_phase1
    assert len(passed_phase1) == 2

    # ==========================================
    # PHASE 3: Build Digital Twins
    # ==========================================
    builder = DigitalTwinBuilder()
    
    fit_twins = []
    rejected_twins = []
    
    with get_db_connection() as conn:
        for pid in passed_phase1:
            # Load Static Baseline
            row = conn.execute("SELECT * FROM patient_vitals_baseline WHERE patient_id = ?", (pid,)).fetchone()
            baseline = PatientBaseline(**{k: (v if v is not None else 0) for k, v in dict(row).items()})
            
            # Load Longitudinal History
            long_rows = conn.execute("SELECT * FROM patient_longitudinal_records WHERE patient_id = ? ORDER BY days_ago DESC", (pid,)).fetchall()
            history = [MetricSnapshot(**dict(r)) for r in long_rows]
            
            # Build Twin
            twin = builder.build_twin(baseline, history, is_diseased=False)
            
            if twin.is_fit:
                fit_twins.append(twin)
            else:
                rejected_twins.append(twin)

    # Assertions on Phase 3 output
    assert len(fit_twins) == 1
    assert fit_twins[0].patient_id == "INT-01"  # Stable patient passes
    
    assert len(rejected_twins) == 1
    assert rejected_twins[0].patient_id == "INT-03" # Declining eGFR patient is rejected
    assert any("renal" in r.lower() for r in rejected_twins[0].rejection_reasons)

