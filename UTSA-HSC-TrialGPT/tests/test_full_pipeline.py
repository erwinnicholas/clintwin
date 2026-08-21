"""
test_full_pipeline.py — End-to-End Pipeline Simulation with MD Logging
=======================================================================
Generates 100 synthetic patients, ingests them, runs all 4 phases
(Deterministic Filter → Semantic NLI → Digital Twins → POMDP Simulation),
and logs every step to results/pipeline_run_log.md.

Usage:
    PYTHONPATH=. python tests/test_full_pipeline.py
"""

import sys
import os
import json
import time
import sqlite3
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Generator

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import DB_PATH, RULES_CSV_PATH, DATA_DIR, RESULTS_DIR, ensure_directories
from core.database import initialize_database, get_db_connection
from core.schemas import PatientBaseline, MetricSnapshot, DrugProfile
from core.twin_builder import DigitalTwinBuilder
from core.balance_verifier import stratified_randomize, verify_cohort_balance
from core.ingestion_engine import ClinicalIngestionPipeline
from filters.deterministic import execute_filter
from simulation.engine import TrialSimulator
from simulation.drugs import load_profiles


# =====================================================================
# PATIENT DATA GENERATORS (yield, not load-all-at-once)
# =====================================================================

# Import the clinical note templates from the existing generator
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generators"))
from gen_1b_clinical_notes import TEMPLATES, assign_template


DISEASE_PROFILES = {
    "NSCLC": {
        "egfr": (55, 10), "serum_creatinine": (1.2, 0.15), "alt": (35, 8), "ast": (30, 7),
        "platelets": (180000, 30000), "anc": (3500, 800), "hemoglobin": (11.5, 1.2),
        "systolic_bp": (130, 12), "diastolic_bp": (82, 8), "hba1c": (5.6, 0.4),
        "ecog_weights": [0.3, 0.5, 0.2], "age_range": (45, 72), "bmi_mean": 23,
    },
    "RA": {
        "egfr": (75, 12), "serum_creatinine": (0.9, 0.15), "alt": (28, 6), "ast": (24, 5),
        "platelets": (280000, 50000), "anc": (4500, 900), "hemoglobin": (12.0, 1.0),
        "systolic_bp": (125, 10), "diastolic_bp": (78, 7), "hba1c": (5.4, 0.3),
        "ecog_weights": [0.4, 0.4, 0.2], "age_range": (30, 65), "bmi_mean": 26,
    },
    "POISON": {
        "egfr": (80, 10), "serum_creatinine": (0.85, 0.1), "alt": (22, 5), "ast": (20, 4),
        "platelets": (250000, 30000), "anc": (5000, 600), "hemoglobin": (14.0, 0.8),
        "systolic_bp": (118, 8), "diastolic_bp": (76, 6), "hba1c": (5.2, 0.3),
        "ecog_weights": [0.6, 0.3, 0.1], "age_range": (25, 55), "bmi_mean": 24,
    },
    "NOISE": {
        "egfr": (90, 8), "serum_creatinine": (0.8, 0.1), "alt": (20, 4), "ast": (18, 3),
        "platelets": (250000, 25000), "anc": (5500, 500), "hemoglobin": (14.5, 0.7),
        "systolic_bp": (120, 8), "diastolic_bp": (75, 6), "hba1c": (5.1, 0.2),
        "ecog_weights": [0.7, 0.2, 0.1], "age_range": (20, 60), "bmi_mean": 25,
    },
}


def _get_group(index: int) -> str:
    """Deterministic group assignment matching gen_1_baseline.py layout."""
    if index < 30:
        return "NSCLC"
    elif index < 60:
        return "RA"
    elif index < 80:
        return "POISON"
    else:
        return "NOISE"


def generate_baseline_patients(n: int = 100, seed: int = 42) -> Generator[dict, None, None]:
    """Yields baseline patient dicts one at a time."""
    rng = np.random.default_rng(seed)
    for i in range(n):
        group = _get_group(i)
        profile = DISEASE_PROFILES[group]
        age = int(rng.integers(profile["age_range"][0], profile["age_range"][1]))
        sex = rng.choice(["M", "F"])
        bmi = round(float(rng.normal(profile["bmi_mean"], 3)), 1)
        ecog = int(rng.choice([0, 1, 2], p=profile["ecog_weights"]))

        yield {
            "patient_id": f"PT-{i+1:03d}",
            "record_date": datetime.now().strftime("%Y-%m-%d"),
            "age": age,
            "sex": sex,
            "bmi": max(16.0, bmi),
            "is_pregnant": 0,
            "systolic_bp": round(float(rng.normal(*profile["systolic_bp"])), 1),
            "diastolic_bp": round(float(rng.normal(*profile["diastolic_bp"])), 1),
            "egfr": round(float(max(20, rng.normal(*profile["egfr"]))), 1),
            "serum_creatinine": round(float(max(0.3, rng.normal(*profile["serum_creatinine"]))), 2),
            "alt": round(float(max(5, rng.normal(*profile["alt"]))), 1),
            "ast": round(float(max(5, rng.normal(*profile["ast"]))), 1),
            "total_bilirubin": round(float(max(0.1, rng.normal(0.8, 0.2))), 2),
            "anc": round(float(max(500, rng.normal(*profile["anc"]))), 0),
            "platelets": round(float(max(50000, rng.normal(*profile["platelets"]))), 0),
            "hemoglobin": round(float(max(7.0, rng.normal(*profile["hemoglobin"]))), 1),
            "hba1c": round(float(max(4.0, rng.normal(*profile["hba1c"]))), 1),
            "inr": round(float(max(0.8, rng.normal(1.0, 0.1))), 2),
            "ecog_score": ecog,
            "hiv_status": 0,
            "hepb_status": 0,
            "hepc_status": 0,
            "irb_consent_signed": 1,
            "hipaa_authorization": 1,
            "_group": group,
        }


def generate_longitudinal_history(patient_id: str, baseline: dict, seed: int = 42) -> Generator[dict, None, None]:
    """Yields 6 longitudinal snapshots per patient at days 180, 150, 120, 90, 60, 14."""
    rng = np.random.default_rng(seed + hash(patient_id) % 10000)
    days = [180, 150, 120, 90, 60, 14]
    base_date = datetime.now()

    for d in days:
        obs_date = (base_date - timedelta(days=d)).strftime("%Y-%m-%d")
        noise_scale = 0.03
        yield {
            "patient_id": patient_id,
            "days_ago": d,
            "observation_date": obs_date,
            "egfr": round(float(baseline["egfr"] * (1 + rng.normal(0, noise_scale))), 1),
            "serum_creatinine": round(float(baseline["serum_creatinine"] * (1 + rng.normal(0, noise_scale))), 2),
            "alt": round(float(max(5, baseline["alt"] * (1 + rng.normal(0, noise_scale)))), 1),
            "ast": round(float(max(5, baseline["ast"] * (1 + rng.normal(0, noise_scale)))), 1),
            "platelets": round(float(max(50000, baseline["platelets"] * (1 + rng.normal(0, noise_scale)))), 0),
            "anc": round(float(max(500, baseline["anc"] * (1 + rng.normal(0, noise_scale)))), 0),
            "hemoglobin": round(float(max(7, baseline["hemoglobin"] * (1 + rng.normal(0, noise_scale)))), 1),
            "systolic_bp": round(float(baseline["systolic_bp"] * (1 + rng.normal(0, noise_scale))), 1),
            "diastolic_bp": round(float(baseline["diastolic_bp"] * (1 + rng.normal(0, noise_scale))), 1),
            "hba1c": round(float(max(4.0, baseline["hba1c"] * (1 + rng.normal(0, noise_scale)))), 1),
        }


def generate_clinical_note(patient_id: str, index: int) -> dict:
    """Returns a clinical note dict using the existing template system."""
    template_key = assign_template(index, "NSCLC")
    raw_text = TEMPLATES[template_key]
    return {
        "note_id": f"NOTE-{patient_id.replace('PT-', '')}-01",
        "patient_id": patient_id,
        "note_date": datetime.now().strftime("%Y-%m-%d"),
        "note_type": "CLINICAL_PROGRESS_NOTE",
        "raw_text": raw_text,
        "template_key": template_key,
    }


# =====================================================================
# MARKDOWN LOGGER
# =====================================================================

class PipelineLogger:
    """Writes structured pipeline logs to a .md file."""

    def __init__(self, output_path: str):
        self.path = output_path
        self.lines: List[str] = []
        self._start_time = time.time()

    def header(self, text: str, level: int = 1):
        self.lines.append(f"\n{'#' * level} {text}\n")

    def text(self, text: str):
        self.lines.append(f"{text}\n")

    def table(self, headers: List[str], rows: List[List[str]]):
        self.lines.append("| " + " | ".join(headers) + " |")
        self.lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
        for row in rows:
            self.lines.append("| " + " | ".join(str(c) for c in row) + " |")
        self.lines.append("")

    def kv(self, key: str, value: str):
        self.lines.append(f"- **{key}**: {value}")

    def separator(self):
        self.lines.append("\n---\n")

    def elapsed(self) -> str:
        return f"{time.time() - self._start_time:.1f}s"

    def flush(self):
        with open(self.path, "w", encoding="utf-8") as f:
            f.write("\n".join(self.lines))


# =====================================================================
# MAIN PIPELINE
# =====================================================================

def run_full_pipeline_test():
    """Runs the complete pipeline with 100 generated patients and logs everything."""

    ensure_directories()
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    log_path = str(RESULTS_DIR / "pipeline_run_log.md")
    log = PipelineLogger(log_path)

    log.header("Full Pipeline Simulation Report")
    log.text(f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log.text(f"**Patients**: 100 (30 NSCLC + 30 RA + 20 Poison + 20 Noise)")
    log.text(f"**Trial Type**: NSCLC Immunotherapy")

    trial_id = "TRIAL_FULLTEST_001"

    # ── PHASE 0: Data Generation & Ingestion ──────────────────────
    log.separator()
    log.header("Phase 0: Data Generation & Ingestion", 2)

    # Use a fresh test DB
    test_db_path = str(DATA_DIR / "pipeline_test.db")
    if os.path.exists(test_db_path):
        os.remove(test_db_path)

    initialize_database(test_db_path)

    # Temporarily override DB_PATH for pipeline modules
    import core.config as cfg
    original_db_path = cfg.DB_PATH
    cfg.DB_PATH = Path(test_db_path)

    ingestion = ClinicalIngestionPipeline()

    # Generate and ingest baseline patients
    patient_groups: Dict[str, List[str]] = {"NSCLC": [], "RA": [], "POISON": [], "NOISE": []}
    all_baselines: Dict[str, dict] = {}
    baseline_rows = []

    print("[PHASE 0] Generating 100 patients...")
    for patient in generate_baseline_patients(100, seed=42):
        group = patient.pop("_group")
        patient_groups[group].append(patient["patient_id"])
        all_baselines[patient["patient_id"]] = patient
        baseline_rows.append(patient)

    # Bulk insert baselines
    df_baseline = pd.DataFrame(baseline_rows)
    with get_db_connection(test_db_path) as conn:
        df_baseline.to_sql("patient_vitals_baseline", conn, if_exists="append", index=False)
        conn.commit()

    log.text(f"✅ Generated and ingested **{len(baseline_rows)}** baseline patients.")
    log.table(
        ["Group", "Count", "Patient IDs (sample)"],
        [
            [g, str(len(pids)), ", ".join(pids[:5]) + ("..." if len(pids) > 5 else "")]
            for g, pids in patient_groups.items()
        ]
    )

    # Generate and ingest longitudinal history
    print("[PHASE 0] Generating longitudinal history...")
    long_rows = []
    for pid, bl in all_baselines.items():
        for snapshot in generate_longitudinal_history(pid, bl):
            long_rows.append(snapshot)

    df_long = pd.DataFrame(long_rows)
    with get_db_connection(test_db_path) as conn:
        df_long.to_sql("patient_longitudinal_records", conn, if_exists="append", index=False)
        conn.commit()

    log.text(f"✅ Generated **{len(long_rows)}** longitudinal records ({len(long_rows)//100} per patient).")

    # Generate and ingest clinical notes with improved chunking
    print("[PHASE 0] Generating and ingesting clinical notes...")
    notes_summary = []
    for i in range(100):
        pid = f"PT-{i+1:03d}"
        note = generate_clinical_note(pid, i)
        ingestion.ingest_unstructured_note(
            note_id=note["note_id"],
            patient_id=pid,
            note_date=note["note_date"],
            note_type=note["note_type"],
            raw_text=note["raw_text"]
        )
        notes_summary.append((pid, note["template_key"], len(note["raw_text"])))

    # Count spans
    with get_db_connection(test_db_path) as conn:
        span_count = conn.execute("SELECT COUNT(*) FROM clinical_text_spans").fetchone()[0]

    log.text(f"✅ Ingested **100** clinical notes → **{span_count}** indexed text chunks.")
    log.text(f"Average chunk size: ~{sum(n[2] for n in notes_summary) // span_count} chars/chunk")

    # ── PHASE 1: Deterministic SQL Filter ─────────────────────────
    log.separator()
    log.header("Phase 1: Deterministic SQL Filter", 2)

    # Create trial rules CSV
    rules_path = str(DATA_DIR / "test_trial_rules.csv")
    pd.DataFrame([
        {"trial_id": trial_id, "criterion_id": "INC_01", "rule_type": "INCLUSION",
         "field_name": "age", "operator": "BETWEEN", "value_min": 18, "value_max": 75},
        {"trial_id": trial_id, "criterion_id": "INC_02", "rule_type": "INCLUSION",
         "field_name": "ecog_score", "operator": "<=", "value_min": 2, "value_max": 0},
        {"trial_id": trial_id, "criterion_id": "INC_03", "rule_type": "INCLUSION",
         "field_name": "platelets", "operator": ">=", "value_min": 75000, "value_max": 0},
        {"trial_id": trial_id, "criterion_id": "INC_04", "rule_type": "INCLUSION",
         "field_name": "egfr", "operator": ">=", "value_min": 30, "value_max": 0},
        {"trial_id": trial_id, "criterion_id": "EXC_01", "rule_type": "EXCLUSION",
         "field_name": "is_pregnant", "operator": "==", "value_min": 1, "value_max": 0},
        {"trial_id": trial_id, "criterion_id": "EXC_02", "rule_type": "EXCLUSION",
         "field_name": "hiv_status", "operator": "==", "value_min": 1, "value_max": 0},
    ]).to_csv(rules_path, index=False)

    # Create trial record
    with get_db_connection(test_db_path) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO trials (trial_id, title, created_at) VALUES (?, ?, ?)",
            (trial_id, "NSCLC Immunotherapy Full Test", datetime.now().isoformat())
        )
        conn.commit()

    t0 = time.time()
    passed_phase1 = execute_filter(test_db_path, rules_path, trial_id)
    t1 = time.time()

    # Persist to DB
    with get_db_connection(test_db_path) as conn:
        for pid in passed_phase1:
            conn.execute(
                "INSERT OR REPLACE INTO trial_patients (trial_id, patient_id, filter_stage) VALUES (?, ?, 'HARD_FILTER')",
                (trial_id, pid)
            )
        conn.commit()

    rejected_phase1 = [f"PT-{i+1:03d}" for i in range(100) if f"PT-{i+1:03d}" not in passed_phase1]

    log.text(f"**Input**: 100 patients")
    log.text(f"**Output**: {len(passed_phase1)} passed, {len(rejected_phase1)} rejected")
    log.text(f"**Time**: {t1-t0:.2f}s")
    log.text("")
    log.text("**Rejection Breakdown by Group:**")

    for group_name, group_pids in patient_groups.items():
        rejected_in_group = [p for p in group_pids if p in rejected_phase1]
        log.kv(group_name, f"{len(rejected_in_group)}/{len(group_pids)} rejected")

    log.text("")
    log.text("**Sample Passed Patients (first 10):**")
    log.table(
        ["Patient ID", "Age", "ECOG", "eGFR", "Platelets"],
        [
            [pid, str(all_baselines[pid]["age"]), str(all_baselines[pid]["ecog_score"]),
             str(all_baselines[pid]["egfr"]), str(int(all_baselines[pid]["platelets"]))]
            for pid in passed_phase1[:10]
        ]
    )

    # ── PHASE 2: Semantic NLI Filter ──────────────────────────────
    log.separator()
    log.header("Phase 2: Semantic NLI Filter (3-Tier Deterministic Pipeline)", 2)
    log.text("Running ColBERT + DeBERTa NLI across all exclusion criteria...")
    log.text(f"**Input**: {len(passed_phase1)} patients from Phase 1")

    # We need to use the semantic filter with the test DB
    # Reset the semantic module's singleton
    import filters.semantic as sem_module
    sem_module._GLOBAL_PIPELINE = None
    sem_module._EXCLUSION_CACHE = {}

    t0 = time.time()
    passed_phase2 = sem_module.execute_semantic_filter(passed_phase1, trial_type="NSCLC")
    t2 = time.time()

    # Persist
    with get_db_connection(test_db_path) as conn:
        for pid in passed_phase2:
            conn.execute(
                "UPDATE trial_patients SET filter_stage = 'SEMANTIC_FILTER' WHERE trial_id = ? AND patient_id = ?",
                (trial_id, pid)
            )
        conn.commit()

    excluded_phase2 = [p for p in passed_phase1 if p not in passed_phase2]

    log.text(f"**Output**: {len(passed_phase2)} passed, {len(excluded_phase2)} excluded")
    log.text(f"**Time**: {t2-t0:.1f}s")
    log.text("")

    if excluded_phase2:
        log.text("**Excluded Patients (Semantic NLI):**")
        exclusion_rows = []
        for pid in excluded_phase2:
            details = sem_module.get_exclusion_details(pid, "NSCLC")
            for d in details:
                reason = str(d.get("source_sentence", "Unknown"))[:100]
                exclusion_rows.append([pid, _get_group(int(pid.split("-")[1]) - 1), reason])
        if exclusion_rows:
            log.table(["Patient", "Group", "Reason"], exclusion_rows[:20])

    log.text("")
    log.text("**Passed Patients by Group:**")
    for group_name, group_pids in patient_groups.items():
        passed_in_group = [p for p in group_pids if p in passed_phase2]
        log.kv(group_name, f"{len(passed_in_group)}/{len(group_pids)} passed")

    # ── PHASE 3: Digital Twin Construction ────────────────────────
    log.separator()
    log.header("Phase 3: Digital Twin Construction", 2)
    log.text(f"**Input**: {len(passed_phase2)} patients from Phase 2")

    t0 = time.time()
    builder = DigitalTwinBuilder()
    twins = []
    twin_rejections = []

    for pid in passed_phase2:
        bl = all_baselines[pid]
        baseline = PatientBaseline(
            patient_id=pid, age=bl["age"], sex=bl["sex"], bmi=bl["bmi"],
            is_pregnant=bl["is_pregnant"], ecog_score=bl["ecog_score"],
            hiv_status=bl["hiv_status"], hepb_status=bl["hepb_status"],
            hepc_status=bl["hepc_status"], irb_consent_signed=bl["irb_consent_signed"]
        )

        # Load longitudinal history from DB
        with get_db_connection(test_db_path) as conn:
            rows = conn.execute(
                "SELECT * FROM patient_longitudinal_records WHERE patient_id = ? ORDER BY days_ago DESC",
                (pid,)
            ).fetchall()
        history = [MetricSnapshot(**{k: dict(r)[k] for k in MetricSnapshot.model_fields}) for r in rows]

        twin_state = builder.build_twin(baseline, history)

        # Persist to DB
        with get_db_connection(test_db_path) as conn:
            conn.execute(
                """INSERT OR REPLACE INTO digital_twins
                   (trial_id, patient_id, baseline_vector_json, trajectory_slopes_json, is_fit, rejection_reasons_json)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (trial_id, pid, json.dumps(twin_state.baseline_vector), json.dumps(twin_state.trajectory_slopes),
                 1 if twin_state.is_fit else 0, json.dumps(twin_state.rejection_reasons))
            )
            conn.commit()

        if twin_state.is_fit:
            twins.append({
                "patient_id": pid,
                "baseline_vector": twin_state.baseline_vector,
                "trajectory_slopes": twin_state.trajectory_slopes,
                "age": baseline.age,
                "sex": baseline.sex,
                "ecog_score": baseline.ecog_score,
                "bmi": baseline.bmi,
            })
        else:
            twin_rejections.append((pid, twin_state.rejection_reasons))

    t3 = time.time()

    log.text(f"**Output**: {len(twins)} fit twins, {len(twin_rejections)} rejected")
    log.text(f"**Time**: {t3-t0:.2f}s")

    if twin_rejections:
        log.text("")
        log.text("**Rejected Twins:**")
        log.table(
            ["Patient", "Rejection Reasons"],
            [[pid, "; ".join(reasons)] for pid, reasons in twin_rejections[:10]]
        )

    if twins:
        log.text("")
        log.text("**Sample Fit Twins (first 10):**")
        twin_rows = []
        for t in twins[:10]:
            bv = t["baseline_vector"]
            twin_rows.append([
                t["patient_id"],
                str(round(bv.get("egfr", 0), 1)),
                str(round(bv.get("platelets", 0), 0)),
                str(round(bv.get("hemoglobin", 0), 1)),
                str(round(bv.get("alt", 0), 1)),
            ])
        log.table(["Patient", "eGFR", "Platelets", "Hgb", "ALT"], twin_rows)

    # ── PHASE 4: POMDP Multi-Arm Simulation ───────────────────────
    log.separator()
    log.header("Phase 4: POMDP Multi-Arm Simulation", 2)

    if not twins:
        log.text("⚠️ No fit twins available. Skipping simulation.")
        log.flush()
        print(f"\n[DONE] Pipeline log written to {log_path}")
        cfg.DB_PATH = original_db_path
        return

    log.text(f"**Input**: {len(twins)} fit digital twins")

    # Stratified Randomization
    arms = ["ARM_CONTROL", "ARM_VACCINE_A", "ARM_VACCINE_B"]
    assignments = stratified_randomize(twins, arms, seed=42)
    balance_report = verify_cohort_balance(twins, assignments)

    log.text("")
    log.text("**Arm Assignments:**")
    arm_counts = {}
    for pid, arm in assignments.items():
        arm_counts[arm] = arm_counts.get(arm, 0) + 1
    for arm, count in sorted(arm_counts.items()):
        log.kv(arm, f"{count} patients")

    log.text("")
    log.text("**Cohort Balance (Table 1):**")
    balance_rows = []
    for var_name, stats in balance_report.items():
        balance_rows.append([
            var_name, stats.get("test", "N/A"),
            f"{stats.get('p_value', 0):.4f}",
            "✅" if stats.get("balanced", False) else "❌"
        ])
    if balance_rows:
        log.table(["Variable", "Test", "p-value", "Balanced?"], balance_rows)

    # Run simulation
    all_drug_profiles = load_profiles()
    drug_profiles = {
        "ARM_CONTROL": all_drug_profiles.get("ARM_CONTROL"),
        "ARM_VACCINE_A": all_drug_profiles.get("ARM_VACCINE_A"),
        "ARM_VACCINE_B": all_drug_profiles.get("ARM_VACCINE_B"),
    }

    sim = TrialSimulator(duration_days=180, timestep_days=14, seed=42)
    run_id = f"RUN_TEST_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    log.text("")
    log.text(f"**Simulation**: 180 days, 14-day timesteps, seed=42")
    log.text(f"**Run ID**: `{run_id}`")

    t0 = time.time()
    all_logs = []
    all_adverse = []
    day_summaries = []

    for step_data in sim.run_multi_arm_streaming(trial_id, twins, assignments, drug_profiles, run_id):
        day = step_data["day"]
        logs = step_data["logs"]
        adverse = step_data["adverse_events"]
        alerts = step_data["alerts"]
        active = step_data["active_patients"]

        all_logs.extend(logs)
        all_adverse.extend(adverse)

        actions = step_data["agent_actions"]
        holds = sum(1 for a in actions if a["action"] == "HOLD_DOSE")
        halts = sum(1 for a in actions if a["action"] == "HALT_PATIENT")

        day_summaries.append([
            str(day), str(active), str(len(logs)),
            str(holds), str(halts), str(len(alerts))
        ])

    t4 = time.time()

    log.text(f"**Time**: {t4-t0:.2f}s")
    log.text(f"**Total Decisions**: {len(all_logs)}")
    log.text(f"**Adverse Events**: {len(all_adverse)}")
    log.text("")

    # Show simulation timeline (every 28 days)
    log.text("**Simulation Timeline (every 28 days):**")
    log.table(
        ["Day", "Active", "Decisions", "Holds", "Halts", "Alerts"],
        [row for row in day_summaries if int(row[0]) % 28 == 0]
    )

    # Adverse event details
    if all_adverse:
        log.text("")
        log.text("**Adverse Events (first 15):**")
        ae_rows = []
        for ae in all_adverse[:15]:
            ae_rows.append([
                str(ae.day), ae.patient_id, ae.arm_id,
                ae.action.value, ae.rationale[:60] + "..."
            ])
        log.table(["Day", "Patient", "Arm", "Action", "Rationale"], ae_rows)

    # ── PHASE 5: Analytics Summary ────────────────────────────────
    log.separator()
    log.header("Phase 5: Pipeline Analytics Summary", 2)

    log.text("**Funnel Summary:**")
    log.table(
        ["Stage", "Input", "Output", "Dropout"],
        [
            ["Phase 1: Deterministic Filter", "100", str(len(passed_phase1)), str(100 - len(passed_phase1))],
            ["Phase 2: Semantic NLI Filter", str(len(passed_phase1)), str(len(passed_phase2)), str(len(passed_phase1) - len(passed_phase2))],
            ["Phase 3: Digital Twin Fitness", str(len(passed_phase2)), str(len(twins)), str(len(passed_phase2) - len(twins))],
            ["Phase 4: Simulation Enrolled", str(len(twins)), str(len(twins)), "0"],
        ]
    )

    log.text("")
    log.text(f"**Total Pipeline Time**: {log.elapsed()}")

    # Final arm-level stats from simulation
    if all_logs:
        log.text("")
        log.text("**Final Arm-Level Statistics:**")
        arm_stats_rows = []
        for arm in sorted(arm_counts.keys()):
            arm_logs = [l for l in all_logs if l.arm_id == arm]
            arm_ae = [l for l in all_adverse if l.arm_id == arm]
            halted = set(l.patient_id for l in arm_ae if l.action.value == "HALT_PATIENT")
            arm_stats_rows.append([
                arm,
                str(arm_counts[arm]),
                str(len(arm_logs)),
                str(len(arm_ae)),
                str(len(halted)),
            ])
        log.table(["Arm", "Enrolled", "Total Decisions", "Adverse Events", "Halted"], arm_stats_rows)

    # Digital twin progression data
    if twins:
        log.text("")
        log.text("**Digital Twin Progression (sample):**")
        progression_rows = []
        sample_twins = twins[:5]
        for tw in sample_twins:
            pid = tw["patient_id"]
            # Find last day's belief state from logs
            patient_logs = [l for l in all_logs if l.patient_id == pid]
            if patient_logs:
                last_log = patient_logs[-1]
                bm = last_log.belief_state.mean_vector
                progression_rows.append([
                    pid,
                    assignments.get(pid, "N/A"),
                    str(last_log.day),
                    str(round(bm.get("egfr", 0), 1)),
                    str(round(bm.get("platelets", 0), 0)),
                    str(round(bm.get("hemoglobin", 0), 1)),
                    last_log.action.value,
                ])
        if progression_rows:
            log.table(
                ["Patient", "Arm", "Last Day", "eGFR (belief)", "PLT (belief)", "Hgb (belief)", "Last Action"],
                progression_rows
            )

    # Flush log
    log.flush()

    # Restore original DB path
    cfg.DB_PATH = original_db_path

    print(f"\n{'='*65}")
    print(f"  PIPELINE COMPLETE — Log written to: {log_path}")
    print(f"  Total Time: {log.elapsed()}")
    print(f"{'='*65}")


if __name__ == "__main__":
    run_full_pipeline_test()
