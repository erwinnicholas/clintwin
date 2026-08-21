-- =================================================================
-- PHASE 1: STATIC BASELINE (Demographics & Baseline Vitals)
-- =================================================================
CREATE TABLE IF NOT EXISTS patient_vitals_baseline (
    patient_id TEXT PRIMARY KEY,
    record_date TEXT,
    age INTEGER,
    sex TEXT,
    bmi REAL,
    is_pregnant INTEGER,
    
    systolic_bp REAL,
    diastolic_bp REAL,
    egfr REAL,
    serum_creatinine REAL,
    alt REAL,
    ast REAL,
    total_bilirubin REAL,
    anc REAL,
    platelets REAL,
    hemoglobin REAL,
    hba1c REAL,
    inr REAL,
    
    ecog_score INTEGER,
    hiv_status INTEGER,
    hepb_status INTEGER,
    hepc_status INTEGER,
    irb_consent_signed INTEGER,
    hipaa_authorization INTEGER
);

-- =================================================================
-- PHASE 3: LONGITUDINAL HISTORY (6-Month Baseline)
-- =================================================================
CREATE TABLE IF NOT EXISTS patient_longitudinal_records (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    days_ago INTEGER NOT NULL,      -- e.g., 180, 90, 14
    observation_date TEXT NOT NULL,
    
    egfr REAL NOT NULL,
    serum_creatinine REAL NOT NULL,
    alt REAL NOT NULL,
    ast REAL NOT NULL,
    platelets REAL NOT NULL,
    anc REAL NOT NULL,
    hemoglobin REAL NOT NULL,
    systolic_bp REAL NOT NULL,
    diastolic_bp REAL NOT NULL,
    hba1c REAL NOT NULL,
    
    FOREIGN KEY(patient_id) REFERENCES patient_vitals_baseline(patient_id)
);

CREATE INDEX IF NOT EXISTS idx_longitudinal_patient 
    ON patient_longitudinal_records(patient_id);

-- =================================================================
-- PHASE 4: SIMULATION AUDIT LOG
-- =================================================================
CREATE TABLE IF NOT EXISTS trials (
    trial_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'CREATED',
    pipeline_stage TEXT DEFAULT 'NONE',  -- NONE, HARD_FILTER, SEMANTIC_FILTER, COMPLIANCE, TWINS, PREPROCESSED, BASELINE_TRAINED, SIMULATION_READY
    created_at TEXT NOT NULL
);

-- =================================================================
-- TRIAL CRITERIA & COMPLIANCE
-- =================================================================
CREATE TABLE IF NOT EXISTS trial_criteria (
    criterion_id TEXT NOT NULL,
    trial_id TEXT NOT NULL,
    rule_type TEXT NOT NULL,  -- INCLUSION / EXCLUSION
    field_name TEXT NOT NULL,
    operator TEXT NOT NULL,
    value_min REAL,
    value_max REAL,
    PRIMARY KEY (trial_id, criterion_id),
    FOREIGN KEY(trial_id) REFERENCES trials(trial_id)
);

CREATE TABLE IF NOT EXISTS trial_text_criteria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trial_id TEXT NOT NULL,
    criteria_text TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    FOREIGN KEY(trial_id) REFERENCES trials(trial_id)
);

CREATE TABLE IF NOT EXISTS trial_compliance_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trial_id TEXT NOT NULL,
    rule_text TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    FOREIGN KEY(trial_id) REFERENCES trials(trial_id)
);

CREATE TABLE IF NOT EXISTS hospital_rules (
    rule_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    rule_text TEXT NOT NULL,
    source TEXT DEFAULT '',
    severity TEXT DEFAULT 'Mandatory',
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);

-- =================================================================
-- SIMULATION RUNS & ALERTS
-- =================================================================
CREATE TABLE IF NOT EXISTS simulation_runs (
    run_id TEXT PRIMARY KEY,
    trial_id TEXT NOT NULL,
    status TEXT DEFAULT 'CREATED',  -- CREATED, RUNNING, COMPLETED, FAILED
    current_day INTEGER DEFAULT 0,
    total_days INTEGER NOT NULL,
    history_json TEXT,              -- Stores intermediate stream history
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY(trial_id) REFERENCES trials(trial_id)
);

CREATE TABLE IF NOT EXISTS simulation_alerts (
    alert_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    trial_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    day INTEGER NOT NULL,
    severity TEXT NOT NULL,  -- WARNING, CRITICAL
    message TEXT NOT NULL,
    metric TEXT,
    forecasted_value REAL,
    threshold REAL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(run_id) REFERENCES simulation_runs(run_id)
);

CREATE TABLE IF NOT EXISTS trial_arms (
    arm_id TEXT NOT NULL,
    trial_id TEXT NOT NULL,
    drug_profile_json TEXT NOT NULL,
    PRIMARY KEY (arm_id, trial_id),
    FOREIGN KEY(trial_id) REFERENCES trials(trial_id)
);

CREATE TABLE IF NOT EXISTS trial_patients (
    trial_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    filter_stage TEXT NOT NULL,  -- 'HARD_FILTER', 'SEMANTIC_FILTER', 'TWIN_VALIDATED', 'ENROLLED'
    arm_id TEXT,
    PRIMARY KEY (trial_id, patient_id),
    FOREIGN KEY(trial_id) REFERENCES trials(trial_id)
);

CREATE TABLE IF NOT EXISTS digital_twins (
    trial_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    baseline_vector_json TEXT NOT NULL,
    trajectory_slopes_json TEXT NOT NULL,
    is_fit INTEGER NOT NULL,
    rejection_reasons_json TEXT,
    PRIMARY KEY (trial_id, patient_id)
);

CREATE TABLE IF NOT EXISTS simulation_decision_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    trial_id TEXT NOT NULL,
    day INTEGER NOT NULL,
    patient_id TEXT NOT NULL,
    arm_id TEXT NOT NULL,

    -- Observed noisy lab draw (raw)
    obs_egfr REAL,
    obs_platelets REAL,
    obs_alt REAL,
    obs_ast REAL,
    obs_hemoglobin REAL,
    obs_anc REAL,
    obs_systolic_bp REAL,
    obs_diastolic_bp REAL,

    -- Kalman belief state (filtered mean)
    belief_egfr REAL,
    belief_platelets REAL,
    belief_alt REAL,
    belief_ast REAL,
    belief_hemoglobin REAL,
    belief_anc REAL,
    belief_systolic_bp REAL,
    belief_diastolic_bp REAL,

    -- Kalman belief variance
    var_egfr REAL,
    var_platelets REAL,
    var_alt REAL,
    var_ast REAL,
    var_hemoglobin REAL,
    var_anc REAL,
    var_systolic_bp REAL,
    var_diastolic_bp REAL,

    -- Agent decision
    action TEXT NOT NULL,
    rationale TEXT,
    hard_override INTEGER DEFAULT 0,

    FOREIGN KEY(patient_id) REFERENCES patient_vitals_baseline(patient_id)
);

CREATE INDEX IF NOT EXISTS idx_sim_patient_day
    ON simulation_decision_log(run_id, trial_id, patient_id, day);

CREATE INDEX IF NOT EXISTS idx_sim_arm
    ON simulation_decision_log(run_id, trial_id, arm_id);

-- =================================================================
-- PHASE 5: DUAL-STORE INGESTION (Text & Provenance)
-- =================================================================
CREATE TABLE IF NOT EXISTS patient_clinical_notes (
    note_id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    note_date TEXT NOT NULL,
    note_type TEXT NOT NULL,
    author_role TEXT,
    raw_content TEXT NOT NULL,
    FOREIGN KEY(patient_id) REFERENCES patient_vitals_baseline(patient_id)
);

CREATE TABLE IF NOT EXISTS clinical_text_spans (
    span_id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    section_name TEXT,
    sentence_text TEXT NOT NULL,
    char_start INTEGER NOT NULL,
    char_end INTEGER NOT NULL,
    FOREIGN KEY(note_id) REFERENCES patient_clinical_notes(note_id)
);

CREATE INDEX IF NOT EXISTS idx_notes_patient ON patient_clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_spans_patient ON clinical_text_spans(patient_id, note_id);

-- =================================================================
-- SIMULATION AGGREGATED RESULTS
-- =================================================================
CREATE TABLE IF NOT EXISTS simulation_results (
    run_id TEXT PRIMARY KEY,
    trial_id TEXT NOT NULL,
    results_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);
