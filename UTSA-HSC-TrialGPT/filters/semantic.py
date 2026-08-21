"""
filters/semantic.py — Deterministic NLI Semantic Clinical Note Filter
======================================================================
Uses the 3-Tier Deterministic Semantic Pipeline (FAISS/BM25 → ColBERT → DeBERTa NLI)
to evaluate exclusion criteria against patient clinical notes WITHOUT any generative LLM.
"""

from typing import List, Dict
import sqlite3
from core.database import get_db_connection
from filters.hybrid_search import OptimizedSemanticPipeline

# =====================================================================
# TRIAL EXCLUSION CRITERIA BANKS
# =====================================================================

NSCLC_EXCLUSION_CRITERIA = [
    "The patient has had prior treatment with PD-1 or PD-L1 immune checkpoint inhibitors like Pembrolizumab, Nivolumab, or Atezolizumab.",
    "The patient has an active autoimmune disease such as rheumatoid arthritis (RA), systemic lupus erythematosus (SLE), or multiple sclerosis (MS).",
    "The patient has a history of solid organ transplant requiring chronic immunosuppression like tacrolimus.",
    "The patient has active symptomatic brain metastases requiring dexamethasone or steroid therapy.",
    "The patient has an active HIV infection, latent tuberculosis (TB), or Hepatitis B/C (HBV/HCV) positive status."
]

RA_EXCLUSION_CRITERIA = [
    "The patient has a history of solid tumor malignancy, non-small cell lung cancer (NSCLC), breast cancer, or lymphoma.",
    "The patient has an active HIV infection or CD4 count below 200.",
    "The patient has a latent or active tuberculosis (TB) infection.",
    "The patient has Hepatitis B (HBV) positive status or chronic hepatitis."
]


# Singleton pipeline instance
_GLOBAL_PIPELINE = None

# Cache for exclusion results per patient+criterion
_EXCLUSION_CACHE: Dict[str, tuple] = {}


def _build_index_if_needed():
    """Load patient clinical note spans into the pipeline index."""
    global _GLOBAL_PIPELINE
    if _GLOBAL_PIPELINE is None:
        _GLOBAL_PIPELINE = OptimizedSemanticPipeline()
        spans = []
        with get_db_connection() as conn:
            conn.row_factory = sqlite3.Row
            for row in conn.execute("SELECT * FROM clinical_text_spans"):
                spans.append({
                    "patient_id": row["patient_id"],
                    "text": row["sentence_text"],
                    "char_span": (row["char_start"], row["char_end"])
                })
        _GLOBAL_PIPELINE.build_index(spans)
    return _GLOBAL_PIPELINE


def get_dynamic_exclusion_criteria(trial_id: str, default_trial_type: str = "NSCLC") -> List[str]:
    """
    Fetches dynamic exclusion criteria from the trial_text_criteria table for the given trial.
    If none exist, falls back to the hardcoded default arrays.
    """
    criteria = []
    with get_db_connection() as conn:
        rows = conn.execute("SELECT criteria_text FROM trial_text_criteria WHERE trial_id = ?", (trial_id,)).fetchall()
        for r in rows:
            text = r["criteria_text"]
            if text:
                # Basic parsing to extract lines that follow EXCLUSION:
                for line in text.splitlines():
                    if "EXCLUSION:" in line.upper():
                        # Extract the part after EXCLUSION:
                        parts = line.split("EXCLUSION:", 1)
                        if len(parts) > 1:
                            rule = parts[1].strip()
                            if rule and rule not in criteria:
                                criteria.append(rule)
                                
    if not criteria:
        print(f"  [SEMANTIC] No dynamic exclusion criteria found for trial {trial_id}. Skipping semantic filtering.")
        return []
    else:
        print(f"  [SEMANTIC] Found {len(criteria)} dynamic exclusion rules for trial {trial_id}.")
        
    return criteria


def execute_semantic_filter(
    cohort_patient_ids: List[str],
    trial_id: str = None,
    trial_type: str = "NSCLC"
) -> List[str]:
    """
    Executes the 3-Tier Deterministic Semantic Pipeline per exclusion criterion.
    For each criterion, evaluates ALL patients' notes globally and excludes those
    where NLI returns ENTAILMENT (criterion is MET in the patient's record).
    """
    pipeline = _build_index_if_needed()
    
    if trial_id:
        criteria = get_dynamic_exclusion_criteria(trial_id, trial_type)
    else:
        criteria = NSCLC_EXCLUSION_CRITERIA if trial_type.upper() == "NSCLC" else RA_EXCLUSION_CRITERIA

    print(f"  [SEMANTIC] Running NLI Filter for {trial_type} trial across {len(cohort_patient_ids)} patients globally...")

    passed_pids = set(cohort_patient_ids)

    for criterion in criteria:
        print(f"    -> Evaluating: '{criterion[:60]}...'")

        # Query the global index for this criterion across the remaining cohort
        results = pipeline.evaluate_cohort_against_criterion(criterion, "EXCLUSION", passed_pids)

        for pid, res in results.items():
            cache_key = f"{pid}_{criterion}"
            
            is_excluded = res["is_excluded"]
            matched_reason = None
            
            if is_excluded:
                matched_reason = (
                    f"NLI ENTAILMENT ({res['entailment_prob']:.1%}) for "
                    f"'{criterion[:40]}...' via: \"{res['matched_sentence'][:80]}...\""
                )
                print(f"    ✗ EXCLUDED {pid}: {matched_reason}")
                passed_pids.discard(pid)
                
            _EXCLUSION_CACHE[cache_key] = (is_excluded, matched_reason)

    excluded_count = len(cohort_patient_ids) - len(passed_pids)
    print(f"  [SEMANTIC] Result: {len(passed_pids)} passed, {excluded_count} excluded")

    return list(passed_pids)


def get_exclusion_details(patient_id: str, trial_id: str = None, trial_type: str = "NSCLC") -> List[Dict]:
    """
    Returns detailed exclusion match information for a specific patient.
    Uses the _EXCLUSION_CACHE built during execute_semantic_filter.
    """
    if trial_id:
        criteria = get_dynamic_exclusion_criteria(trial_id, trial_type)
    else:
        criteria = []
        
    if not criteria:
        return []

    details = []
    for criterion in criteria:
        cache_key = f"{patient_id}_{criterion}"
        if cache_key in _EXCLUSION_CACHE:
            is_excluded, reason = _EXCLUSION_CACHE[cache_key]
            if is_excluded:
                details.append({
                    "patient_id": patient_id,
                    "matched_pattern": criterion,
                    "source_sentence": reason,
                    "section": "GENERAL",
                    "note_id": "N/A"
                })
    return details
