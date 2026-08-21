from fastapi import APIRouter

from api.routers import features, summary, simulation, explain, documents
from api.routers import patients, trials, pipeline, simulation_v2, trial_live, generators, hospital_rules

api_router = APIRouter()

# Include all individual routers
api_router.include_router(features.router, tags=["features"])
api_router.include_router(summary.router, tags=["summary"])
api_router.include_router(explain.router, prefix="/explain", tags=["explain"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])

# Core Routers
api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(trials.router, prefix="/trials", tags=["trials"])
api_router.include_router(pipeline.router, prefix="/trials", tags=["pipeline"])
api_router.include_router(simulation_v2.router, prefix="/trials", tags=["simulation"])
api_router.include_router(trial_live.router, prefix="/trials", tags=["trial_live"])
api_router.include_router(generators.router, prefix="/generators", tags=["generators"])
api_router.include_router(hospital_rules.router, prefix="/hospital-rules", tags=["hospital_rules"])

