import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.ingestion_engine import ClinicalIngestionPipeline
from core.database import get_db_connection

def run_test():
    # 1. Init pipeline
    pipeline = ClinicalIngestionPipeline()
    
    # 2. Add a test patient so foreign key constraint passes
    with get_db_connection() as conn:
        conn.execute("INSERT OR IGNORE INTO patient_vitals_baseline (patient_id, age) VALUES ('TEST_PID_01', 55)")
        conn.commit()
    
    # 3. Text to test
    raw_text = "Patient presents with severe headache. The patient has a history of migraines, and was recently diagnosed with NSCLC. A biopsy was taken on 2023-01-15. Pathology confirmed stage 3a adenocarcinoma. Patient is currently taking 50mg of some medication."
    
    print(f"Original Text Length: {len(raw_text)}")
    print(f"Original Text: {raw_text}")
    print("-" * 50)
    
    # 4. Ingest note
    pipeline.ingest_unstructured_note(
        note_id="NOTE_TEST_02",
        patient_id="TEST_PID_01",
        note_date="2023-08-01",
        note_type="Progress Note",
        raw_text=raw_text
    )
    
    # 5. Check if it was chunked properly
    with get_db_connection() as conn:
        note_row = conn.execute("SELECT * FROM patient_clinical_notes WHERE note_id='NOTE_TEST_02'").fetchone()
        if not note_row:
            print("ERROR: Note not found in patient_clinical_notes")
            return
            
        print("Note successfully inserted into patient_clinical_notes.")
        
        spans = conn.execute("SELECT sentence_text, char_start, char_end FROM clinical_text_spans WHERE note_id='NOTE_TEST_02' ORDER BY char_start ASC").fetchall()
        print(f"Found {len(spans)} chunks in clinical_text_spans:")
        
        for idx, span in enumerate(spans):
            print(f"\nChunk {idx+1} [chars {span['char_start']}-{span['char_end']}]:")
            print(span['sentence_text'])
            
            # Verify string slicing matches
            sliced_text = raw_text[span['char_start']:span['char_end']]
            if sliced_text == span['sentence_text']:
                print(" -> Slice match: SUCCESS")
            else:
                print(f" -> Slice match: FAILED. Sliced: '{sliced_text}' vs Stored: '{span['sentence_text']}'")

if __name__ == "__main__":
    run_test()
