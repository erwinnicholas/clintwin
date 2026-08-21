"""
api/services/pipeline_executor.py
=================================
Service layer for executing pipeline stages idempotently.
"""

from typing import List
from core.schemas import FilterResultResponse
from core.twin_builder import DigitalTwinBuilder
from filters.deterministic import execute_filter
from filters.semantic import execute_semantic_filter
from core.config import DB_PATH
from core.dao.pipeline_dao import PipelineDao


class PipelineExecutorService:
    
    @staticmethod
    def run_hard_filter(trial_id: str) -> FilterResultResponse:
        PipelineDao.clear_stage_results(trial_id, ['HARD_FILTER', 'SEMANTIC_FILTER', 'TWIN_VALIDATED'])
        
        total_input = PipelineDao.count_baseline_patients()
        input_pids = PipelineDao.get_all_baseline_patient_ids() # Need to create this DAO method
        
        passed_pids = execute_filter(str(DB_PATH), trial_id)
        PipelineDao.add_patients_to_stage(trial_id, passed_pids, 'HARD_FILTER')
        PipelineDao.update_trial_stage(trial_id, "HARD_FILTER")
        
        rejected_pids = set(input_pids) - set(passed_pids)
        rejected = [{"patient_id": pid, "reason": "Failed hard filter"} for pid in rejected_pids]
        
        return FilterResultResponse(
            trial_id=trial_id,
            stage="HARD_FILTER",
            passed=passed_pids,
            rejected=rejected,
            total_input=total_input,
            total_passed=len(passed_pids)
        )

    @staticmethod
    def run_semantic_filter(trial_id: str) -> FilterResultResponse:
        from filters.semantic import get_exclusion_details
        PipelineDao.clear_stage_results(trial_id, ['SEMANTIC_FILTER', 'TWIN_VALIDATED'])
        
        trial_type = "NSCLC"
        title_lower = PipelineDao.get_trial_title(trial_id).lower()
        if "ra" in title_lower or "rheumatoid" in title_lower or "arthritis" in title_lower:
            trial_type = "RA"
        elif "nsclc" in title_lower or "lung" in title_lower or "immunotherapy" in title_lower:
            trial_type = "NSCLC"
        
        input_pids = PipelineDao.get_patients_in_stages(trial_id, ['HARD_FILTER'])
        passed_pids = execute_semantic_filter(input_pids, trial_id=trial_id, trial_type=trial_type)
        PipelineDao.update_patient_stage(trial_id, passed_pids, 'SEMANTIC_FILTER')
        PipelineDao.update_trial_stage(trial_id, "SEMANTIC_FILTER")
        
        rejected = []
        excluded_pids = set(input_pids) - set(passed_pids)
        for pid in excluded_pids:
            details = get_exclusion_details(pid, trial_id=trial_id, trial_type=trial_type)
            reason = details[0]['source_sentence'] if details else "Failed semantic filter"
            rejected.append({"patient_id": pid, "reason": reason})
        
        return FilterResultResponse(
            trial_id=trial_id,
            stage="SEMANTIC_FILTER",
            passed=passed_pids,
            rejected=rejected,
            total_input=len(input_pids),
            total_passed=len(passed_pids)
        )

    @staticmethod
    def run_compliance_check(trial_id: str) -> FilterResultResponse:
        passed_pids = PipelineDao.get_patients_in_stages(trial_id, ['SEMANTIC_FILTER'])
        PipelineDao.update_patient_stage(trial_id, passed_pids, 'COMPLIANCE_CHECKED')
        PipelineDao.update_trial_stage(trial_id, "COMPLIANCE")
        
        return FilterResultResponse(
            trial_id=trial_id,
            stage="COMPLIANCE",
            passed=passed_pids,
            rejected=[],
            total_input=len(passed_pids),
            total_passed=len(passed_pids)
        )

    @staticmethod
    def build_digital_twins(trial_id: str) -> FilterResultResponse:
        PipelineDao.clear_stage_results(trial_id, ['TWIN_VALIDATED'])
        input_pids = PipelineDao.get_patients_in_stages(trial_id, ['SEMANTIC_FILTER', 'COMPLIANCE_CHECKED'])
        
        from core.orchestrator import PipelineOrchestrator
        builder = DigitalTwinBuilder()
        
        passed = []
        rejected = []
        
        for pid in input_pids:
            baseline = PipelineOrchestrator.load_patient_baseline(pid)
            history = PipelineOrchestrator.load_longitudinal_history(pid)
            
            twin_state = builder.build_twin(baseline, history, is_diseased=False)
            PipelineDao.save_digital_twin(trial_id, pid, twin_state)
            
            if twin_state.is_fit:
                passed.append(pid)
                PipelineDao.update_patient_stage(trial_id, [pid], 'TWIN_VALIDATED')
            else:
                rejected.append({"patient_id": pid, "reason": "; ".join(twin_state.rejection_reasons)})
                
        PipelineDao.update_trial_stage(trial_id, "TWINS")
        
        return FilterResultResponse(
            trial_id=trial_id,
            stage="TWINS",
            passed=passed,
            rejected=rejected,
            total_input=len(input_pids),
            total_passed=len(passed)
        )
