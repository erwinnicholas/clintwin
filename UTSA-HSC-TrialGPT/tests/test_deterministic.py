import os
import sqlite3
import pytest
from filters.deterministic import execute_filter, build_sql_from_rules
from core.ingestion_engine import ClinicalIngestionPipeline
from core.database import initialize_database, get_db_connection
import pandas as pd

# Define paths for test artifacts
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_DB = os.path.join(BASE_DIR, 'tests', 'test_trial.db')
TEST_CSV = os.path.join(BASE_DIR, 'tests', 'test_patients.csv')
TEST_RULES = os.path.join(BASE_DIR, 'tests', 'test_rules.csv')

@pytest.fixture(autouse=True)
def setup_and_teardown():
    # Setup: Create test CSV with edge cases
    df = pd.DataFrame([
        # Passes everything
        {"patient_id": "T-01", "record_date": "2024-01-01", "age": 45, "sex": "F", "bmi": 24, "is_pregnant": 0, "systolic_bp": 120, "diastolic_bp": 80, "egfr": 90, "serum_creatinine": 1, "alt": 25, "ast": 25, "total_bilirubin": 1, "anc": 2000, "platelets": 200000, "hemoglobin": 13, "hba1c": 5, "inr": 1, "ecog_score": 0, "hiv_status": 0, "hepb_status": 0, "hepc_status": 0, "irb_consent_signed": 1},
        # Fails age (<18)
        {"patient_id": "T-02", "record_date": "2024-01-01", "age": 16, "sex": "M", "bmi": 22, "is_pregnant": 0, "systolic_bp": 120, "diastolic_bp": 80, "egfr": 90, "serum_creatinine": 1, "alt": 25, "ast": 25, "total_bilirubin": 1, "anc": 2000, "platelets": 200000, "hemoglobin": 13, "hba1c": 5, "inr": 1, "ecog_score": 0, "hiv_status": 0, "hepb_status": 0, "hepc_status": 0, "irb_consent_signed": 1},
        # Fails pregnancy (1)
        {"patient_id": "T-03", "record_date": "2024-01-01", "age": 30, "sex": "F", "bmi": 24, "is_pregnant": 1, "systolic_bp": 120, "diastolic_bp": 80, "egfr": 90, "serum_creatinine": 1, "alt": 25, "ast": 25, "total_bilirubin": 1, "anc": 2000, "platelets": 200000, "hemoglobin": 13, "hba1c": 5, "inr": 1, "ecog_score": 0, "hiv_status": 0, "hepb_status": 0, "hepc_status": 0, "irb_consent_signed": 1},
        # Fails liver function (ast > 100)
        {"patient_id": "T-04", "record_date": "2024-01-01", "age": 50, "sex": "M", "bmi": 28, "is_pregnant": 0, "systolic_bp": 120, "diastolic_bp": 80, "egfr": 90, "serum_creatinine": 1, "alt": 150, "ast": 200, "total_bilirubin": 2, "anc": 2000, "platelets": 200000, "hemoglobin": 13, "hba1c": 5, "inr": 1, "ecog_score": 0, "hiv_status": 0, "hepb_status": 0, "hepc_status": 0, "irb_consent_signed": 1},
        # Fails consent (0)
        {"patient_id": "T-05", "record_date": "2024-01-01", "age": 60, "sex": "M", "bmi": 25, "is_pregnant": 0, "systolic_bp": 120, "diastolic_bp": 80, "egfr": 90, "serum_creatinine": 1, "alt": 30, "ast": 30, "total_bilirubin": 1, "anc": 2000, "platelets": 200000, "hemoglobin": 13, "hba1c": 5, "inr": 1, "ecog_score": 0, "hiv_status": 0, "hepb_status": 0, "hepc_status": 0, "irb_consent_signed": 0},
    ])
    df.to_csv(TEST_CSV, index=False)
    
    # Setup: Create dynamic test rules
    rules_df = pd.DataFrame([
        {"trial_id": "TEST1", "criterion_id": "INC_01", "rule_type": "INCLUSION", "field_name": "age", "operator": "BETWEEN", "value_min": 18, "value_max": 80},
        {"trial_id": "TEST1", "criterion_id": "INC_02", "rule_type": "INCLUSION", "field_name": "irb_consent_signed", "operator": "==", "value_min": 1, "value_max": None},
        {"trial_id": "TEST1", "criterion_id": "EXC_01", "rule_type": "EXCLUSION", "field_name": "is_pregnant", "operator": "==", "value_min": 1, "value_max": None},
        {"trial_id": "TEST1", "criterion_id": "EXC_02", "rule_type": "EXCLUSION", "field_name": "ast", "operator": ">", "value_min": 100, "value_max": None},
    ])
    rules_df.to_csv(TEST_RULES, index=False)
    
    # Override the DB config globally for the test run so ingestion targets the test DB
    import core.config
    core.config.DB_PATH = TEST_DB
    
    initialize_database()

    yield  # Run tests
    
    # Teardown: Clean up generated files
    for path in [TEST_DB, TEST_CSV, TEST_RULES]:
        if os.path.exists(path):
            os.remove(path)

def test_ingest_data():
    """Test that CSV data is correctly written to SQLite."""
    pipeline = ClinicalIngestionPipeline()
    pipeline.ingest_tabular_patient_data(TEST_CSV)
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM patient_vitals_baseline")
        assert cursor.fetchone()[0] == 5

def test_dynamic_sql_generation():
    """Test that the pandas rules engine correctly compiles SQL."""
    sql = build_sql_from_rules(TEST_RULES, "TEST1")
    
    assert "(age >= 18" in sql or "(age >= 18.0" in sql
    assert "age <= 80)" in sql or "age <= 80.0)" in sql
    assert "(irb_consent_signed == 1)" in sql or "(irb_consent_signed == 1.0)" in sql
    assert "(is_pregnant != 1)" in sql or "(is_pregnant != 1.0)" in sql
    assert "(ast <= 100)" in sql or "(ast <= 100.0)" in sql

def test_deterministic_sql_filter():
    """Test that the dynamic filter accurately drops invalid patients."""
    # Ensure data is ingested first
    pipeline = ClinicalIngestionPipeline()
    pipeline.ingest_tabular_patient_data(TEST_CSV)
    
    passed_patients = execute_filter(TEST_DB, TEST_RULES, "TEST1")
    
    # Only T-01 should pass all the universal safety gates
    assert len(passed_patients) == 1
    assert passed_patients[0] == "T-01"
