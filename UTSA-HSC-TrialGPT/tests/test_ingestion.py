import os
import pytest
from core.ingestion_engine import ClinicalIngestionPipeline
from core.database import get_db_connection, initialize_database
import tempfile
import pandas as pd

@pytest.fixture
def test_pipeline():
    initialize_database()
    pipeline = ClinicalIngestionPipeline()
    
    with get_db_connection() as conn:
        # Clear out test artifacts before running
        conn.execute("DELETE FROM patient_clinical_notes WHERE patient_id='TEST_PT'")
        conn.execute("DELETE FROM clinical_text_spans WHERE patient_id='TEST_PT'")
        conn.commit()
        
    yield pipeline
    
    with get_db_connection() as conn:
        conn.execute("DELETE FROM patient_clinical_notes WHERE patient_id='TEST_PT'")
        conn.execute("DELETE FROM clinical_text_spans WHERE patient_id='TEST_PT'")
        conn.commit()

def test_ingest_unstructured_note_character_offsets(test_pipeline):
    """
    Tests that the Dual-Store Ingestion Engine correctly segments sentences
    and perfectly records character start/end offsets for live UI provenance.
    """
    raw_text = "HISTORY OF PRESENT ILLNESS:\nPatient has lung cancer. Biomarkers are positive."
    
    test_pipeline.ingest_unstructured_note(
        note_id="TEST_NOTE_1",
        patient_id="TEST_PT",
        note_date="2026-01-01",
        note_type="CONSULT",
        raw_text=raw_text
    )
    
    with get_db_connection() as conn:
        spans = conn.execute("""
            SELECT section_name, sentence_text, char_start, char_end 
            FROM clinical_text_spans 
            WHERE patient_id='TEST_PT' 
            ORDER BY char_start ASC
        """).fetchall()
        
    assert len(spans) == 3, "Should segment into Section Header, Sentence 1, Sentence 2"
    
    header, sent1, sent2 = spans
    
    assert header['section_name'] == 'HISTORY OF PRESENT ILLNESS'
    assert header['sentence_text'] == "HISTORY OF PRESENT ILLNESS:"
    # Verify the substring extraction works perfectly
    assert raw_text[header['char_start']:header['char_end']].strip() == header['sentence_text']
    
    assert sent1['section_name'] == 'HISTORY OF PRESENT ILLNESS'
    assert sent1['sentence_text'] == 'Patient has lung cancer.'
    assert raw_text[sent1['char_start']:sent1['char_end']].strip() == sent1['sentence_text']

    assert sent2['section_name'] == 'HISTORY OF PRESENT ILLNESS'
    assert sent2['sentence_text'] == 'Biomarkers are positive.'
    assert raw_text[sent2['char_start']:sent2['char_end']].strip() == sent2['sentence_text']

def test_tabular_ingestion_csv(test_pipeline):
    with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as f:
        df = pd.DataFrame([{
            "patient_id": "TEST_PT_2",
            "record_date": "2026-01-01",
            "age": 60,
            "sex": "M"
        }])
        df.to_csv(f.name, index=False)
        temp_path = f.name
        
    try:
        test_pipeline.ingest_tabular_patient_data(temp_path)
        with get_db_connection() as conn:
            pt = conn.execute("SELECT * FROM patient_vitals_baseline WHERE patient_id='TEST_PT_2'").fetchone()
            assert pt is not None
            assert pt['age'] == 60
    finally:
        os.unlink(temp_path)
        with get_db_connection() as conn:
            conn.execute("DELETE FROM patient_vitals_baseline WHERE patient_id='TEST_PT_2'")
            conn.commit()

