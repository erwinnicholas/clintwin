from fastapi import APIRouter, HTTPException, Query
from core.schemas import SimulationStartResponse, SimulationStatusResponse, SimulationResultsResponse, SimulationStepResponse
from core.database import get_db_connection
from api.services.simulation_runner import SimulationRunnerService
from api.services.live_feed import LiveFeedService

router = APIRouter()

# ── Original Simulation Endpoints ────────────────────────────────

@router.post("/{trial_id}/simulation/start", response_model=SimulationStartResponse)
async def start_simulation(trial_id: str):
    run_id = SimulationRunnerService.start_simulation(trial_id)
    return SimulationStartResponse(run_id=run_id, trial_id=trial_id, status="RUNNING")

@router.post("/{trial_id}/simulation/{run_id}/step", response_model=SimulationStepResponse)
async def step_simulation(trial_id: str, run_id: str):
    try:
        return SimulationRunnerService.step(run_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{trial_id}/simulation/{run_id}/status", response_model=SimulationStatusResponse)
async def simulation_status(trial_id: str, run_id: str):
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT status, current_day, total_days FROM simulation_runs WHERE run_id = ?",
            (run_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, "Run not found")
        return SimulationStatusResponse(
            run_id=run_id, status=row["status"], current_day=row["current_day"], total_days=row["total_days"]
        )

@router.get("/{trial_id}/simulation/{run_id}/results")
async def simulation_results(trial_id: str, run_id: str):
    return {"run_id": run_id, "status": "Ready to render"}

# ── Live Feed Endpoints (Hospital Data Monitoring) ───────────────

@router.post("/{trial_id}/live/start")
async def start_live_feed(
    trial_id: str,
    trajectory_path: str = Query(default=None, description="Path to 3_trial_trajectory.csv"),
    allocations_path: str = Query(default=None, description="Path to 3_arm_allocations.json"),
):
    """Start a live monitoring feed using pre-generated trajectory data."""
    from pathlib import Path

    # Default to test_packages/NSCLC if no path provided
    base = Path(__file__).resolve().parent.parent.parent
    if trajectory_path is None:
        trajectory_path = str(base / "test_packages" / "NSCLC" / "3_trial_trajectory.csv")
    if allocations_path is None:
        allocations_path = str(base / "test_packages" / "NSCLC" / "3_arm_allocations.json")

    if not Path(trajectory_path).exists():
        raise HTTPException(400, f"Trajectory file not found: {trajectory_path}")
    if not Path(allocations_path).exists():
        raise HTTPException(400, f"Allocations file not found: {allocations_path}")

    try:
        run_id = LiveFeedService.start(trial_id, trajectory_path, allocations_path)
        return {"run_id": run_id, "trial_id": trial_id, "status": "RUNNING"}
    except Exception as e:
        raise HTTPException(500, f"Failed to start live feed: {str(e)}")

@router.post("/{trial_id}/live/{run_id}/step")
async def step_live_feed(trial_id: str, run_id: str):
    """Advance the live feed by one day. Returns ground truth vs forecast."""
    try:
        return LiveFeedService.step(run_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{trial_id}/live/{run_id}/status")
async def live_feed_status(trial_id: str, run_id: str):
    """Get the current status of a live feed."""
    try:
        return LiveFeedService.get_status(run_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{trial_id}/live/active")
async def get_active_live_feed(trial_id: str):
    """Checks if there's an active or paused simulation for this trial, returning its state if so."""
    from core.database import get_db_connection
    import json
    
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT run_id, status, current_day, total_days, history_json FROM simulation_runs WHERE trial_id = ? AND status IN ('RUNNING', 'PAUSED') ORDER BY started_at DESC LIMIT 1",
            (trial_id,)
        ).fetchone()
        
        if not row:
            return {"active": False}
            
        history = []
        if row["history_json"]:
            try:
                history = json.loads(row["history_json"])
            except json.JSONDecodeError:
                pass
        
        # Get total patients from trial_patients
        count_row = conn.execute(
            "SELECT count(*) as c FROM trial_patients WHERE trial_id = ? AND filter_stage = 'ENROLLED'",
            (trial_id,)
        ).fetchone()
        total_patients = count_row["c"] if count_row else 0
                
        return {
            "active": True,
            "run_id": row["run_id"],
            "status": row["status"],
            "current_day": row["current_day"],
            "total_days": row["total_days"],
            "total_patients": total_patients,
            "history": history
        }

@router.get("/{trial_id}/live/{run_id}/history")
async def live_feed_history(trial_id: str, run_id: str):
    """Get the full step history (for chart replays)."""
    return LiveFeedService.get_history(run_id)

@router.get("/{trial_id}/live/{run_id}/results")
async def get_simulation_results(trial_id: str, run_id: str):
    """Get the final aggregated results from the database, plus detailed logs."""
    from core.database import get_db_connection
    import json
    
    with get_db_connection() as conn:
        # Get aggregated results
        res = conn.execute(
            "SELECT results_json FROM simulation_results WHERE run_id = ?", 
            (run_id,)
        ).fetchone()
        
        if not res:
            raise HTTPException(status_code=404, detail="Simulation results not found or simulation not completed.")
            
        results_data = json.loads(res["results_json"])
        
        # Get detailed logs
        logs = conn.execute("""
            SELECT day, patient_id, arm_id, action, rationale, hard_override,
                   obs_platelets, obs_egfr, obs_alt,
                   belief_platelets, belief_egfr, belief_alt
            FROM simulation_decision_log
            WHERE run_id = ?
            ORDER BY day ASC
        """, (run_id,)).fetchall()
        
        results_data["detailed_logs"] = [dict(l) for l in logs]
        
        return results_data

