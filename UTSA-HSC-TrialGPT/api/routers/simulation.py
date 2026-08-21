from fastapi import APIRouter
from typing import Dict, Any, List
from core.database import get_db_connection

router = APIRouter()

@router.get("/{run_id}")
def get_simulation_data(run_id: str) -> Dict[str, List[Dict[str, Any]]]:
    """Returns the time-series logs for the specified simulation run."""
    with get_db_connection() as conn:
        logs = conn.execute("""
            SELECT day, patient_id, arm_id, action, rationale, hard_override,
                   obs_platelets, obs_egfr, obs_alt,
                   belief_platelets, belief_egfr, belief_alt
            FROM simulation_decision_log
            WHERE run_id = ?
            ORDER BY day ASC
        """, (run_id,)).fetchall()
        
    if not logs:
        # If run_id not found, fetch the most recent run
        with get_db_connection() as conn:
            latest_run = conn.execute("SELECT MAX(run_id) FROM simulation_decision_log").fetchone()[0]
            if not latest_run:
                return {"logs": []}
            
            logs = conn.execute("""
                SELECT day, patient_id, arm_id, action, rationale, hard_override,
                       obs_platelets, obs_egfr, obs_alt,
                       belief_platelets, belief_egfr, belief_alt
                FROM simulation_decision_log
                WHERE run_id = ?
                ORDER BY day ASC
            """, (latest_run,)).fetchall()
            
    return {"logs": [dict(l) for l in logs]}
