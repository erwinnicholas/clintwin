from fastapi import APIRouter
from core.database import get_db_connection
from core.schemas import SummaryResponse, FunnelStats

router = APIRouter()

@router.get("/summary", response_model=SummaryResponse)
def get_summary():
    """Returns funnel statistics and basic cohort demographics."""
    with get_db_connection() as conn:
        try:
            total_p1 = conn.execute("SELECT COUNT(*) FROM patient_vitals_baseline").fetchone()[0]
            
            # Unprocessed (in baseline but no trial runs)
            unprocessed = conn.execute("SELECT COUNT(*) FROM patient_vitals_baseline WHERE patient_id NOT IN (SELECT DISTINCT patient_id FROM trial_patients)").fetchone()[0]
            
            # Enrolled (Active in simulation)
            total_sim = conn.execute("SELECT COUNT(DISTINCT patient_id) FROM trial_patients WHERE filter_stage = 'ENROLLED'").fetchone()[0]
            
            # Under Review (in some filter stage but not enrolled)
            under_review = conn.execute("SELECT COUNT(DISTINCT patient_id) FROM trial_patients WHERE filter_stage IN ('HARD_FILTER', 'SEMANTIC_FILTER', 'TWIN_VALIDATED')").fetchone()[0]
            
            # Not eligible (people in the baseline but not enrolled and not under review and not unprocessed)
            not_eligible = total_p1 - total_sim - under_review - unprocessed
            
            # Active trials
            active_trials = conn.execute("SELECT COUNT(*) FROM trials WHERE status = 'Recruiting'").fetchone()[0]
            
            demographics = conn.execute("""
                SELECT sex, COUNT(*) as count 
                FROM patient_vitals_baseline 
                WHERE patient_id IN (SELECT DISTINCT patient_id FROM simulation_decision_log)
                GROUP BY sex
            """).fetchall()
        except Exception:
            total_p1 = 0
            total_sim = 0
            under_review = 0
            not_eligible = 0
            unprocessed = 0
            active_trials = 0
            demographics = []
        
    return SummaryResponse(
        funnel=FunnelStats(initial_pool=total_p1, enrolled=total_sim, under_review=under_review, not_eligible=not_eligible, unprocessed=unprocessed, active_trials=active_trials),
        demographics=[dict(d) for d in demographics]
    )
