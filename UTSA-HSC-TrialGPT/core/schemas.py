"""
core/schemas.py — Unified Pydantic Models & Enums
=================================================
Consolidates all data structures used across the pipeline, ensuring
strict type checking and easy serialization.
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from enum import Enum
from dataclasses import dataclass
# =====================================================================
# 1. Fact Extraction Schemas (Gemini Ingestion)
# =====================================================================
class ExtractedClinicalFacts(BaseModel):
    patient_id: str
    cancer_stage: str = Field(description="e.g., Stage IIIA Non-Small Cell Lung Cancer")
    histology: str = Field(description="e.g., Adenocarcinoma, Squamous Cell")
    biomarkers: List[str] = Field(description="e.g., ['EGFR Exon 19 Deletion', 'PD-L1 TPS 60%']")
    prior_lines_of_therapy: List[str] = Field(description="e.g., ['Carboplatin + Pemetrexed', 'Pembrolizumab']")
    active_infections: List[str] = Field(description="e.g., ['HIV Negative', 'HCV Negative']")
    key_evidence_quotes: List[str] = Field(description="Exact verbatim quotes from the text proving these facts")

class PatientPreviewRow(BaseModel):
    row_index: int
    patient_id: str
    age: int
    sex: str
    bmi: float
    ecog_score: int
    systolic_bp: float
    diastolic_bp: float
    egfr: float
    platelets: float
    hemoglobin: float
    alt: float
    ast: float
    is_valid: bool
    validation_errors: List[str]

class PatientPreviewResponse(BaseModel):
    total_rows: int
    valid_rows: int
    error_rows: int
    patients: List[PatientPreviewRow]

class PatientConfirmRequest(BaseModel):
    patients: List[PatientPreviewRow]

class PatientConfirmResponse(BaseModel):
    inserted_count: int
    skipped_count: int
    patient_ids: List[str]

class TrialCriterionRow(BaseModel):
    criterion_id: Optional[str] = None
    rule_type: str         # "INCLUSION" or "EXCLUSION"
    field_name: str
    operator: str
    value_min: Optional[float] = None
    value_max: Optional[float] = None
    
    # For tabular preview
    is_valid: Optional[bool] = True
    validation_errors: Optional[List[str]] = Field(default_factory=list)
    row_index: Optional[int] = None

class TrialCriteriaPreviewResponse(BaseModel):
    total_rows: int
    valid_rows: int
    error_rows: int
    criteria: List[TrialCriterionRow]

class TrialTextCriterion(BaseModel):
    criteria_text: str
    uploaded_at: str

class TrialCriteriaResponse(BaseModel):
    trial_id: str
    tabular_criteria: List[TrialCriterionRow]
    text_criteria: List[TrialTextCriterion]

# =====================================================================
# 2. Rigid API Schemas (FastAPI Frontend Communication)
# =====================================================================
class FeatureFlagResponse(BaseModel):
    rag_search_enabled: bool
    gemini_explanations_enabled: bool

class FunnelStats(BaseModel):
    initial_pool: int
    enrolled: int
    under_review: int
    not_eligible: int
    unprocessed: int
    active_trials: int

class SummaryResponse(BaseModel):
    funnel: FunnelStats
    demographics: List[Dict[str, object]]

class TextSpan(BaseModel):
    sentence_text: str
    char_start: int
    char_end: int
    section_name: str

class ExplainResponse(BaseModel):
    report: str
    provenance_spans: List[TextSpan] = Field(default_factory=list)

class DocumentResponse(BaseModel):
    markdown: str
    text: str
    
# =====================================================================
# 3. Base Trial Schemas
# =====================================================================

class ClinicalAction(str, Enum):
    """Discrete action space for the POMDP decision agent."""
    CONTINUE = "CONTINUE"
    HOLD_DOSE = "HOLD_DOSE"
    HALT_PATIENT = "HALT_PATIENT"


# ══════════════════════════════════════════════════════════════════
# PYDANTIC MODELS (Phase 1 & Phase 3)
# ══════════════════════════════════════════════════════════════════

class PatientBaseline(BaseModel):
    """Static demographic profile from Phase 1."""
    patient_id: str
    age: int
    sex: str
    bmi: float
    is_pregnant: int
    ecog_score: int
    hiv_status: int
    hepb_status: int
    hepc_status: int
    irb_consent_signed: int


class MetricSnapshot(BaseModel):
    """A single longitudinal observation from Phase 3."""
    days_ago: int
    egfr: float
    serum_creatinine: float
    alt: float
    ast: float
    platelets: float
    anc: float
    hemoglobin: float
    systolic_bp: float
    diastolic_bp: float
    hba1c: float


class DigitalTwinState(BaseModel):
    """The validated Twin passed from Phase 3 to the Simulation."""
    patient_id: str
    static_profile: PatientBaseline
    is_fit: bool
    rejection_reasons: List[str]
    baseline_vector: Dict[str, float]       # Denoised T=0 state
    trajectory_slopes: Dict[str, float]     # 180-day biological drift slope
    synthetic_disease_state: str


# ══════════════════════════════════════════════════════════════════
# DATACLASSES (Simulation Engine)
# ══════════════════════════════════════════════════════════════════

@dataclass
class BeliefState:
    """Gaussian belief distribution b(s) = N(x_hat, P) from Kalman Filter."""
    mean_vector: Dict[str, float]
    variance_vector: Dict[str, float]


@dataclass
class StepDecisionLog:
    """Audit record for a single 14-day visit cycle decision."""
    day: int
    patient_id: str
    arm_id: str
    observed_labs: Dict[str, float]
    belief_state: BeliefState
    action: ClinicalAction
    rationale: str
    hard_override_triggered: bool


@dataclass
class DrugProfile:
    """Defines daily perturbation effects and noise scales for a trial arm."""
    name: str
    daily_effects: Dict[str, float]
    noise_scales: Dict[str, float]
    onset_day: int = 0
    description: str = ""


@dataclass
class SimulationResult:
    """Aggregated output of a full multi-arm simulation run."""
    run_id: str
    duration_days: int
    timestep_days: int
    arms: List[str]
    total_decisions: int
    adverse_events: List[StepDecisionLog]
    all_logs: List[StepDecisionLog]


# =====================================================================
# 4. API Request/Response Schemas
# =====================================================================

class TrialCreateRequest(BaseModel):
    title: str
    description: str = ""

class TrialResponse(BaseModel):
    trial_id: str
    title: str
    description: str
    status: str
    pipeline_stage: str
    created_at: str

class FilterResultResponse(BaseModel):
    trial_id: str
    stage: str
    passed: List[str]
    rejected: List[Dict[str, object]]
    total_input: int
    total_passed: int

class TwinResponse(BaseModel):
    patient_id: str
    is_fit: bool
    rejection_reasons: List[str]
    baseline_vector: Dict[str, float]
    trajectory_slopes: Dict[str, float]

class SimulationStartResponse(BaseModel):
    run_id: str
    trial_id: str
    status: str

class SimulationStatusResponse(BaseModel):
    run_id: str
    status: str
    current_day: int
    total_days: int

class ConfidenceInterval(BaseModel):
    lower: float
    upper: float

class RealityPatientState(BaseModel):
    patient_id: str
    arm_id: str
    observed_labs: Dict[str, float]
    belief_mean: Dict[str, float]
    belief_variance: Dict[str, float]

class ForecastPatientState(BaseModel):
    patient_id: str
    forecasted_day: int
    predicted_values: Dict[str, float]
    confidence_interval: Dict[str, ConfidenceInterval]
    risk_level: str

class SimulationStepResponse(BaseModel):
    current_day: int
    reality: Dict[str, List[RealityPatientState]]
    forecast: Dict[str, List[ForecastPatientState]]
    agent_actions: List[Dict[str, object]]
    alerts: List['AlertEvent']
    balance_report: Optional[Dict[str, object]] = None
    active_patients: int

class ForecastReport(BaseModel):
    patient_id: str
    forecasted_metrics: Dict[str, float]
    violations: List[str]
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL

class AlertEvent(BaseModel):
    alert_id: str
    trial_id: str
    run_id: str
    patient_id: str
    day: int
    severity: str
    message: str
    metric: str
    forecasted_value: float
    threshold: float

class PatientListItem(BaseModel):
    patient_id: str
    age: int
    sex: str
    bmi: float
    ecog_score: int
    systolic_bp: float
    diastolic_bp: float
    egfr: float
    platelets: float
    hemoglobin: float
    alt: float
    ast: float
    filter_stage: Optional[str] = None

class NoteUploadRequest(BaseModel):
    patient_id: str
    note_id: str
    note_date: str
    note_type: str
    raw_text: str

class ComplianceRuleRequest(BaseModel):
    rule_text: str

class TextCriteriaRequest(BaseModel):
    criteria_text: str

class PipelineStageResponse(BaseModel):
    trial_id: str
    stage: str
    message: str
    data: object

class SimulationResultsResponse(BaseModel):
    run_id: str
    trial_id: str
    total_decisions: int
    total_adverse_events: int
    arm_summary: Dict[str, object]
    patient_deltas: List[Dict[str, object]]
    logs: List[Dict[str, object]]
    alerts: List[Dict[str, object]]

