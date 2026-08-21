import json
import uuid
from datetime import datetime

# Core
from core.config import DB_PATH, RULES_CSV_PATH, ensure_directories
from core.database import initialize_database, get_db_connection
from core.schemas import PatientBaseline, MetricSnapshot
from core.twin_builder import DigitalTwinBuilder

# Filters
from filters.deterministic import execute_filter
from filters.semantic import execute_semantic_filter

# Math & Simulation
from simulation.engine import TrialSimulator
from simulation.drugs import load_profiles

class PipelineOrchestrator:

    @staticmethod
    def load_patient_baseline(patient_id: str) -> PatientBaseline:
        with get_db_connection() as conn:
            row = conn.execute(
                "SELECT * FROM patient_vitals_baseline WHERE patient_id = ?", 
                (patient_id,)
            ).fetchone()
        return PatientBaseline(**{k: (v if v is not None else 0) for k, v in dict(row).items()})

    @staticmethod
    def load_longitudinal_history(patient_id: str) -> list[MetricSnapshot]:
        with get_db_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM patient_longitudinal_records WHERE patient_id = ? ORDER BY days_ago DESC", 
                (patient_id,)
            ).fetchall()
        return [MetricSnapshot(**dict(r)) for r in rows]

    @staticmethod
    def build_digital_twins(patient_ids: list[str], trial_id: str) -> list[dict]:
        twins = []
        builder = DigitalTwinBuilder()
        
        with get_db_connection() as conn:
            for pid in patient_ids:
                baseline = PipelineOrchestrator.load_patient_baseline(pid)
                history = PipelineOrchestrator.load_longitudinal_history(pid)
                
                twin_state = builder.build_twin(baseline, history, is_diseased=False)
                
                conn.execute(
                    """INSERT OR REPLACE INTO digital_twins
                       (trial_id, patient_id, baseline_vector_json, trajectory_slopes_json, is_fit, rejection_reasons_json)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (trial_id, pid, json.dumps(twin_state.baseline_vector), json.dumps(twin_state.trajectory_slopes),
                     1 if twin_state.is_fit else 0, json.dumps(twin_state.rejection_reasons))
                )
                
                if twin_state.is_fit:
                    twins.append({
                        "patient_id": pid,
                        "baseline_vector": twin_state.baseline_vector,
                        "trajectory_slopes": twin_state.trajectory_slopes,
                        "age": baseline.age,
                        "sex": baseline.sex,
                        "ecog_score": baseline.ecog_score
                    })
            conn.commit()
            
        return twins

    @staticmethod
    def stratify_cohort(patients: list[dict], trial_id: str, seed: int = 42) -> dict:
        from core.balance_verifier import stratified_randomize, verify_cohort_balance
        arms = ["ARM_CONTROL", "ARM_VACCINE_A", "ARM_VACCINE_B"]
        
        assignments = stratified_randomize(patients, arms, seed)
        balance_report = verify_cohort_balance(patients, assignments)
        print("\n[Cohort Balance Report]")
        print(json.dumps(balance_report, indent=2))
        
        with get_db_connection() as conn:
            for pid, arm_id in assignments.items():
                conn.execute(
                    """INSERT OR REPLACE INTO trial_patients
                       (trial_id, patient_id, filter_stage, arm_id)
                       VALUES (?, ?, 'ENROLLED', ?)""",
                    (trial_id, pid, arm_id)
                )
            conn.commit()
            
        return assignments

    @staticmethod
    def persist_simulation_logs(result, trial_id: str):
        with get_db_connection() as conn:
            for log in result.all_logs:
                obs = log.observed_labs
                belief = log.belief_state
                
                conn.execute(
                    """INSERT INTO simulation_decision_log
                       (run_id, trial_id, day, patient_id, arm_id,
                        obs_egfr, obs_platelets, obs_alt, obs_ast,
                        obs_hemoglobin, obs_anc, obs_systolic_bp, obs_diastolic_bp,
                        belief_egfr, belief_platelets, belief_alt, belief_ast,
                        belief_hemoglobin, belief_anc, belief_systolic_bp, belief_diastolic_bp,
                        var_egfr, var_platelets, var_alt, var_ast,
                        var_hemoglobin, var_anc, var_systolic_bp, var_diastolic_bp,
                        action, rationale, hard_override)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        result.run_id, trial_id, log.day, log.patient_id, log.arm_id,
                        obs.get("egfr"), obs.get("platelets"), obs.get("alt"), obs.get("ast"),
                        obs.get("hemoglobin"), obs.get("anc"), obs.get("systolic_bp"), obs.get("diastolic_bp"),
                        belief.mean_vector.get("egfr"), belief.mean_vector.get("platelets"),
                        belief.mean_vector.get("alt"), belief.mean_vector.get("ast"),
                        belief.mean_vector.get("hemoglobin"), belief.mean_vector.get("anc"),
                        belief.mean_vector.get("systolic_bp"), belief.mean_vector.get("diastolic_bp"),
                        belief.variance_vector.get("egfr"), belief.variance_vector.get("platelets"),
                        belief.variance_vector.get("alt"), belief.variance_vector.get("ast"),
                        belief.variance_vector.get("hemoglobin"), belief.variance_vector.get("anc"),
                        belief.variance_vector.get("systolic_bp"), belief.variance_vector.get("diastolic_bp"),
                        log.action.value, log.rationale,
                        1 if log.hard_override_triggered else 0
                    )
                )
            conn.commit()

    @staticmethod
    def run_full_pipeline(trial_id: str = "TRIAL_SIM_001"):
        ensure_directories()
        initialize_database()
        
        with get_db_connection() as conn:
            conn.execute("INSERT OR IGNORE INTO trials (trial_id, title, created_at) VALUES (?, ?, ?)",
                         (trial_id, f"Mock Trial {trial_id}", datetime.now().isoformat()))
            conn.commit()
            
        print(f"\n[PHASE 1] Running Deterministic SQL Filter...")
        # execute_filter only takes db_path and trial_id, it reads rules dynamically from DB!
        passed_phase1 = execute_filter(str(DB_PATH), trial_id)
        with get_db_connection() as conn:
            for pid in passed_phase1:
                conn.execute("INSERT OR REPLACE INTO trial_patients (trial_id, patient_id, filter_stage) VALUES (?, ?, 'HARD_FILTER')", (trial_id, pid))
            conn.commit()
        
        print(f"\n[PHASE 2] Running Semantic LLM Filter...")
        passed_phase2 = execute_semantic_filter(passed_phase1, trial_id=trial_id)
        with get_db_connection() as conn:
            for pid in passed_phase2:
                conn.execute("UPDATE trial_patients SET filter_stage = 'SEMANTIC_FILTER' WHERE trial_id = ? AND patient_id = ?", (trial_id, pid))
            conn.commit()
        
        print(f"\n[PHASE 3] Building Digital Twins...")
        twins = PipelineOrchestrator.build_digital_twins(passed_phase2, trial_id)
        with get_db_connection() as conn:
            for t in twins:
                conn.execute("UPDATE trial_patients SET filter_stage = 'TWIN_VALIDATED' WHERE trial_id = ? AND patient_id = ?", (trial_id, t["patient_id"]))
            conn.commit()
        
        if not twins:
            return {"status": "error", "message": "No valid twins generated."}
            
        print(f"\n[PHASE 4] Stratifying Cohort...")
        assignments = PipelineOrchestrator.stratify_cohort(twins, trial_id)
        
        # We NO LONGER run the 180-day TrialSimulator here! 
        # The AI Pipeline's job is just to generate and stratify the cohort. 
        # The Live Simulation page will handle the live stream.
        
        return {
            "status": "success",
            "run_id": None,
            "twins_generated": len(twins),
            "decisions": 0,
            "adverse_events": 0
        }
