import os
import re
import pandas as pd
from typing import List, Dict, Optional
from google import genai

from core.database import get_db_connection
from core.schemas import ExtractedClinicalFacts
from core.config import DB_PATH

class ClinicalIngestionPipeline:
    def __init__(self, db_path: str = None):
        # We rely on core.database.get_db_connection() to init the schema
        pass

    def ingest_tabular_patient_data(self, file_path: str):
        """Loads CSV or XLSX factual baseline and longitudinal tables into SQLite."""
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
        elif file_path.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file_path)
        else:
            raise ValueError("Unsupported tabular format. Use CSV or XLSX.")

        with get_db_connection() as conn:
            # We use if_exists="append"
            df.to_sql("patient_vitals_baseline", conn, if_exists="append", index=False)
            conn.commit()
            
        print(f"Successfully ingested {len(df)} structured records from {file_path}")

    def ingest_longitudinal_data(self, file_path: str):
        """Loads CSV or XLSX longitudinal history into SQLite."""
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
        elif file_path.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file_path)
        else:
            raise ValueError("Unsupported tabular format. Use CSV or XLSX.")

        with get_db_connection() as conn:
            df.to_sql("patient_longitudinal_records", conn, if_exists="append", index=False)
            conn.commit()
            
        print(f"Successfully ingested {len(df)} longitudinal records from {file_path}")

    def ingest_unstructured_note(self, note_id: str, patient_id: str, note_date: str, note_type: str, raw_text: str):
        """
        Stores raw clinical note and segments it into semantically meaningful chunks.
        Groups small sentences (< 40 chars) with their neighbors so the NLI cross-encoder
        receives enough clinical context per span to make accurate entailment decisions.
        """
        with get_db_connection() as conn:
            # Insert master note
            conn.execute("""
                INSERT OR REPLACE INTO patient_clinical_notes (note_id, patient_id, note_date, note_type, author_role, raw_content)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (note_id, patient_id, note_date, note_type, "Attending Physician", raw_text))

            # Phase 1: Split into raw sentences (finding boundaries)
            sentence_pattern = re.compile(r'([^.!?\n]+[.!?\n]*)')
            raw_sentences = []
            for match in sentence_pattern.finditer(raw_text):
                raw_sent = match.group(0)
                l_space = len(raw_sent) - len(raw_sent.lstrip())
                r_space = len(raw_sent) - len(raw_sent.rstrip())
                
                s_start = match.start() + l_space
                s_end = match.end() - r_space
                
                if s_start < s_end:
                    raw_sentences.append((s_start, s_end))

            # Phase 2: Merge small sentences into clinical chunks
            MIN_CHUNK_CHARS = 60
            MAX_CHUNK_SENTENCES = 3

            chunks = []
            buffer_start = -1
            buffer_end = -1
            buffer_count = 0

            for s_start, s_end in raw_sentences:
                if buffer_start == -1:
                    buffer_start = s_start
                    buffer_end = s_end
                    buffer_count = 1
                elif (s_end - buffer_start) < MIN_CHUNK_CHARS and buffer_count < MAX_CHUNK_SENTENCES:
                    buffer_end = s_end
                    buffer_count += 1
                else:
                    chunks.append((raw_text[buffer_start:buffer_end], buffer_start, buffer_end))
                    buffer_start = s_start
                    buffer_end = s_end
                    buffer_count = 1

            if buffer_start != -1:
                chunks.append((raw_text[buffer_start:buffer_end], buffer_start, buffer_end))

            # Phase 3: Insert chunks as spans
            current_section = "GENERAL"
            for chunk_text, char_start, char_end in chunks:
                # Detect section headers
                if chunk_text.isupper() or chunk_text.endswith(":"):
                    current_section = chunk_text.replace(":", "").strip()

                conn.execute("""
                    INSERT INTO clinical_text_spans (note_id, patient_id, section_name, sentence_text, char_start, char_end)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (note_id, patient_id, current_section, chunk_text, char_start, char_end))

            conn.commit()

        print(f"Ingested note {note_id} for patient {patient_id} ({len(chunks)} chunks from {len(raw_sentences)} raw sentences).")

    def extract_facts_from_note(self, raw_text: str, patient_id: str) -> ExtractedClinicalFacts:
        """Extracts structured entities from unstructured clinical text using Gemini structured outputs."""
        client = genai.Client()

        prompt = f"""
        Extract the key clinical facts from this patient progress note.
        Patient ID: {patient_id}

        CLINICAL NOTE:
        \"\"\"{raw_text}\"\"\"

        Provide exact quotes from the text for any extracted facts.
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": ExtractedClinicalFacts,
                "temperature": 0.0
            }
        )
        return response.parsed
