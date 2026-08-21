import json
from typing import List, Dict, Any
from core.database import get_db_connection

class PipelineDao:
    @staticmethod
    def update_trial_stage(trial_id: str, new_stage: str):
        with get_db_connection() as conn:
            conn.execute(
                "UPDATE trials SET pipeline_stage = ? WHERE trial_id = ?",
                (new_stage, trial_id)
            )
            conn.commit()

    @staticmethod
    def clear_stage_results(trial_id: str, stages_to_clear: List[str]):
        with get_db_connection() as conn:
            for stage in stages_to_clear:
                conn.execute(
                    "DELETE FROM trial_patients WHERE trial_id = ? AND filter_stage = ?",
                    (trial_id, stage)
                )
            conn.commit()

    @staticmethod
    def count_baseline_patients() -> int:
        with get_db_connection() as conn:
            return conn.execute("SELECT COUNT(*) FROM patient_vitals_baseline").fetchone()[0]

    @staticmethod
    def get_all_baseline_patient_ids() -> List[str]:
        with get_db_connection() as conn:
            rows = conn.execute("SELECT patient_id FROM patient_vitals_baseline").fetchall()
            return [row["patient_id"] for row in rows]

    @staticmethod
    def add_patients_to_stage(trial_id: str, patient_ids: List[str], stage: str):
        with get_db_connection() as conn:
            for pid in patient_ids:
                conn.execute(
                    "INSERT INTO trial_patients (trial_id, patient_id, filter_stage) VALUES (?, ?, ?)",
                    (trial_id, pid, stage)
                )
            conn.commit()

    @staticmethod
    def update_patient_stage(trial_id: str, patient_ids: List[str], stage: str):
        with get_db_connection() as conn:
            for pid in patient_ids:
                conn.execute(
                    "UPDATE trial_patients SET filter_stage = ? WHERE trial_id = ? AND patient_id = ?",
                    (stage, trial_id, pid)
                )
            conn.commit()

    @staticmethod
    def get_trial_title(trial_id: str) -> str:
        with get_db_connection() as conn:
            row = conn.execute("SELECT title FROM trials WHERE trial_id = ?", (trial_id,)).fetchone()
            return row["title"] if row else ""

    @staticmethod
    def get_patients_in_stages(trial_id: str, stages: List[str]) -> List[str]:
        placeholders = ",".join(["?"] * len(stages))
        query = f"SELECT patient_id FROM trial_patients WHERE trial_id = ? AND filter_stage IN ({placeholders})"
        with get_db_connection() as conn:
            rows = conn.execute(query, [trial_id] + stages).fetchall()
            return [row["patient_id"] for row in rows]

    @staticmethod
    def save_digital_twin(trial_id: str, pid: str, twin_state: Any):
        with get_db_connection() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO digital_twins
                   (trial_id, patient_id, baseline_vector_json, trajectory_slopes_json, is_fit, rejection_reasons_json)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (trial_id, pid, json.dumps(twin_state.baseline_vector), json.dumps(twin_state.trajectory_slopes),
                 1 if twin_state.is_fit else 0, json.dumps(twin_state.rejection_reasons))
            )
            conn.commit()
