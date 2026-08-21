"""
run_pipeline.py — End-to-End Execution Orchestrator CLI
=======================================================
Executes the full Domain-Driven Architecture from ingestion to simulation.
"""

import sys
from core.orchestrator import PipelineOrchestrator

def main():
    print("=" * 65)
    print("  Neuro-Symbolic Clinical Trial Simulator Pipeline")
    print("=" * 65)
    
    trial_id = "TRIAL_SIM_001"
    if len(sys.argv) > 1:
        trial_id = sys.argv[1]
        
    result = PipelineOrchestrator.run_full_pipeline(trial_id)
    if result.get("status") == "error":
        print(f"\n[ERROR] Pipeline failed: {result.get('message')}")
    else:
        print(f"\n[OUTPUT] Persisted simulation logs to SQLite.")
        print(f"Run ID: {result.get('run_id')}")

if __name__ == "__main__":
    main()
