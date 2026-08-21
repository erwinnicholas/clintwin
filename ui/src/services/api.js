const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// A generic fetch wrapper to handle errors
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    // Return text if not JSON (e.g., HTML reports)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    console.error(`Fetch failed for ${url}:`, error);
    throw error;
  }
}

// --- AI Assistant / Explanation API ---
export async function explainDecision(context_type, action, rationale, belief_state) {
  return apiFetch('/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context_type, action, rationale, belief_state })
  });
}

// --- Summary API ----------------------------------------------------------
// Summary & Features
// -------------------------------------------------------------
export const fetchSummary = () => apiFetch('/summary');
export const fetchFeatures = () => apiFetch('/features');

// -------------------------------------------------------------
// Patients
// -------------------------------------------------------------
/**
 * @typedef {Object} PatientRow
 * @property {string} id
 * @property {number} age
 * @property {string} sex          - "Male" | "Female" | "Unknown"
 * @property {number} bmi
 * @property {number} ecog_score
 * @property {number} systolic_bp
 * @property {number} diastolic_bp
 * @property {number} egfr
 * @property {number} platelets
 * @property {number} hemoglobin
 * @property {number} alt
 * @property {number} ast
 */

export const resetPatients = () => apiFetch('/patients/reset', { method: 'DELETE' });

export const fetchPatients = async (trialId = null) => {
  const url = trialId ? `/patients?trial_id=${trialId}` : '/patients';
  const data = await apiFetch(url);
  return data.map((p, i) => ({
    id: p.patient_id,
    age: p.age,
    sex: p.sex === '1' || p.sex === 1 ? 'Male' : (p.sex === '0' || p.sex === 0 ? 'Female' : p.sex),
    bmi: p.bmi,
    ecog_score: p.ecog_score,
    systolic_bp: p.systolic_bp,
    diastolic_bp: p.diastolic_bp,
    egfr: p.egfr,
    platelets: p.platelets,
    hemoglobin: p.hemoglobin,
    alt: p.alt,
    ast: p.ast,
    filter_stage: p.filter_stage
  }));
};

export const fetchPatientNotes = async (patientId) => {
  return apiFetch(`/patients/${patientId}/notes`);
};

export const previewTabularUpload = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/patients/upload/tabular/preview', { method: 'POST', body: formData });
};

export const confirmTabularUpload = (patients) => {
  return apiFetch('/patients/upload/tabular/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patients })
  });
};

export const uploadTabularPatients = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/patients/upload/tabular', { method: 'POST', body: formData });
};

export const uploadNotesCsv = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/patients/upload/notes-csv', { method: 'POST', body: formData });
};

export const uploadNotesZip = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/patients/upload/notes-zip', { method: 'POST', body: formData });
};

export const uploadLongitudinal = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/patients/upload/longitudinal', { method: 'POST', body: formData });
};

export const checkLongitudinalData = () => {
  return apiFetch('/patients/upload/longitudinal/check');
};

// -------------------------------------------------------------
// Trials
// -------------------------------------------------------------
/**
 * @typedef {Object} TrialRow
 * @property {string} trial_id
 * @property {string} title
 * @property {string} description
 * @property {string} status
 * @property {string} pipeline_stage
 * @property {string} created_at
 */

/**
 * @typedef {Object} TrialCriteriaRow
 * @property {string} criterion_id
 * @property {string} rule_type
 * @property {string} field_name
 * @property {string} operator
 * @property {number|null} value_min
 * @property {number|null} value_max
 */

/**
 * @typedef {Object} TrialCriteriaResponse
 * @property {string} trial_id
 * @property {TrialCriteriaRow[]} tabular_criteria
 * @property {Object[]} text_criteria
 */

export const fetchTrials = async () => {
  const data = await apiFetch('/trials');
  return data.map(t => ({
    trial_id: t.trial_id,
    title: t.title,
    description: t.description,
    status: t.status,
    pipeline_stage: t.pipeline_stage,
    created_at: t.created_at
  }));
};

export const createTrial = (data) => apiFetch('/trials', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

export const updateTrialStatus = (trialId, status) => apiFetch(`/trials/${trialId}/status`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status })
});

export const fetchTrialCriteria = (trialId) => {
  return apiFetch(`/trials/${trialId}/criteria`);
};

export const previewTabularCriteria = (trialId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch(`/trials/${trialId}/criteria/tabular/preview`, { method: 'POST', body: formData });
};

export const confirmTabularCriteria = (trialId, criteria) => {
  return apiFetch(`/trials/${trialId}/criteria/tabular/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ criteria })
  });
};

export const generateCohort = (trialId) => apiFetch(`/trials/${trialId}/generate-cohort`, {
  method: 'POST'
});

export const uploadTextCriteria = (trialId, criteria_text) => {
  return apiFetch(`/trials/${trialId}/criteria/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ criteria_text })
  });
};

// -------------------------------------------------------------
// Pipeline
// -------------------------------------------------------------
export const runHardFilter = (trialId) => apiFetch(`/trials/${trialId}/pipeline/hard-filter`, { method: 'POST' });
export const runSemanticFilter = (trialId) => apiFetch(`/trials/${trialId}/pipeline/semantic-filter`, { method: 'POST' });
export const runComplianceCheck = (trialId) => apiFetch(`/trials/${trialId}/pipeline/compliance-check`, { method: 'POST' });
export const buildTwins = (trialId) => apiFetch(`/trials/${trialId}/pipeline/build-twins`, { method: 'POST' });

// -------------------------------------------------------------
// Simulation
// -------------------------------------------------------------
export const startSimulation = (trialId) => apiFetch(`/trials/${trialId}/simulation/start`, { method: 'POST' });
export const stepSimulation = (trialId, runId) => apiFetch(`/trials/${trialId}/simulation/${runId}/step`, { method: 'POST' });
export const fetchSimStatus = (trialId, runId) => apiFetch(`/trials/${trialId}/simulation/${runId}/status`);
export const fetchSimResults = (trialId, runId) => apiFetch(`/trials/${trialId}/simulation/${runId}/results`);

// Live Feed (Hospital Data Monitoring)
// -------------------------------------------------------------
export const startLiveFeed = (trialId) => apiFetch(`/trials/${trialId}/live/start`, { method: 'POST' });
export const stepLiveFeed = (trialId, runId) => apiFetch(`/trials/${trialId}/live/${runId}/step`, { method: 'POST' });
export const fetchLiveFeedStatus = (trialId, runId) => apiFetch(`/trials/${trialId}/live/${runId}/status`);
export const fetchLiveFeedHistory = (trialId, runId) => apiFetch(`/trials/${trialId}/live/${runId}/history`);
export const fetchActiveLiveFeed = (trialId) => apiFetch(`/trials/${trialId}/live/active`);

// -------------------------------------------------------------
// Generators
// -------------------------------------------------------------
export const runGenerator = (scriptName, disease_template = 'NSCLC') => {
  return apiFetch(`/generators/run/${scriptName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disease_template })
  });
};
export const ingestGenerated = () => apiFetch(`/generators/ingest`, { method: 'POST' });
export const getDownloadUrl = (filename) => `${API_BASE}/generators/download/${filename}`;

// -------------------------------------------------------------
// Misc
// -------------------------------------------------------------
export const fetchCompliance = (trialId) => apiFetch(`/trials/${trialId}/compliance`);
export const uploadCompliance = (trialId, rule_text) => {
  return apiFetch(`/trials/${trialId}/compliance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rule_text })
  });
};

// -------------------------------------------------------------
// Hospital Rules
// -------------------------------------------------------------
export const fetchHospitalRules = () => apiFetch('/hospital-rules');
export const createHospitalRule = (rule) => apiFetch('/hospital-rules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(rule)
});
export const deleteHospitalRule = (ruleId) => apiFetch(`/hospital-rules/${ruleId}`, { method: 'DELETE' });

