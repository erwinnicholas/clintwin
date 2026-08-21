// Removed Node SDK to prevent Vite browser compilation errors.
// A REST fetch could be used here, but for the prototype we will use the mock engine.
export const generateAssistantResponse = async (userMessage, contextData) => {
  // Construct a rich system prompt that includes the live context
  const systemPrompt = `
You are the ClinTwin AI Research Assistant, an advanced clinical AI embedded within a Digital Twin Platform.
Your purpose is to assist research analysts in modeling patient cohorts, querying clinical data, and explaining metrics.

CURRENT APPLICATION CONTEXT:
${contextData.activePatient 
  ? `The user is currently viewing a specific digital twin patient profile:
     - ID: ${contextData.activePatient.id}
     - Age/Gender: ${contextData.activePatient.age} ${contextData.activePatient.gender}
     - Diagnosis: ${contextData.activePatient.cancerType}
     - Stage: ${contextData.activePatient.stage}
     - Eligibility Score: ${contextData.activePatient.score}%`
  : `The user is currently on the global Population Synthesis dashboard setting parameters:
     - Target Cohort Size: ${contextData.targetSize}
     - Global Metrics -> Total Patients: ${contextData.metrics?.total || 'N/A'}, Eligible: ${contextData.metrics?.eligible || 'N/A'}`
}

CRITICAL RULES FOR RESPONDING:
1. Speak as a highly intelligent, clinical AI assistant. Be concise, professional, and slightly technical.
2. ALWAYS base your answers on the "CURRENT APPLICATION CONTEXT" above if relevant.
3. If the user asks about "this patient", refer to the active patient profile.
4. Keep your responses under 3-4 sentences.
  `;

  // 2. Fallback to Advanced Context-Aware Mock (since SDK breaks Vite browser build)
  // We simulate an LLM by deeply parsing the user's message against the known context.

  // 2. Fallback to Advanced Context-Aware Mock (if no key or network failure)
  // We simulate an LLM by deeply parsing the user's message against the known context.
  return simulateLLMResponse(userMessage, contextData);
};

const simulateLLMResponse = (message, context) => {
  const lcMsg = message.toLowerCase();

  // Dynamic specific patient lookup (Global Chatbot feature)
  const patientMatch = message.match(/PAT-(\d{4})/i);
  if (patientMatch) {
    const patId = patientMatch[0].toUpperCase();
    const mockDb = {
      'PAT-4022': { age: 65, gender: 'Male', cancerType: 'NSCLC', stage: 'Stage 3' },
      'PAT-1192': { age: 42, gender: 'Female', cancerType: 'Breast Cancer', stage: 'Stage 2' }
    };
    
    // Generate a procedural mock if not in static db
    const p = mockDb[patId] || { age: 50 + Math.floor(Math.random()*20), gender: Math.random() > 0.5 ? 'Male' : 'Female', cancerType: 'Melanoma', stage: 'Stage ' + (Math.floor(Math.random()*4)+1) };
    
    if (lcMsg.includes('status') || lcMsg.includes('info') || lcMsg.includes('what is')) {
      return `Accessing global database for ${patId}... Patient is a ${p.age}-year-old ${p.gender} with ${p.stage} ${p.cancerType}. Telemetry is currently streaming normally.`;
    }
    if (lcMsg.includes('eligibl') || lcMsg.includes('trial')) {
      return `Checking trial match for ${patId}... Based on their ${p.stage} ${p.cancerType} profile, they have an 88% match confidence for the LUNG-2024-02 protocol.`;
    }
    return `I found the record for ${patId} (${p.age}y ${p.gender}, ${p.cancerType}). What specific clinical parameter would you like to analyze?`;
  }

  // If a specific patient is selected via 3D UI
  if (context.activePatient) {
    const p = context.activePatient;
    if (lcMsg.includes('score') || lcMsg.includes('eligible') || lcMsg.includes('eligibility')) {
      return `This patient (${p.id}) has an eligibility score of ${p.score}%. This is primarily driven by their ${p.stage} ${p.cancerType} diagnosis, which matches heavily with our active oncology protocols.`;
    }
    if (lcMsg.includes('diagnos') || lcMsg.includes('disease') || lcMsg.includes('cancer')) {
      return `The clinical record for ${p.id} indicates a primary diagnosis of ${p.cancerType} at ${p.stage}. Based on their age (${p.age}), they are in a high-priority tracking group.`;
    }
    if (lcMsg.includes('who is') || lcMsg.includes('details') || lcMsg.includes('explain this patient')) {
      return `You are viewing ${p.id}, a ${p.age}-year-old ${p.gender} diagnosed with ${p.stage} ${p.cancerType}. Their digital twin profile is actively streaming telemetry.`;
    }
    return `Regarding "${message}" — as you are currently viewing ${p.id}, I am filtering my analysis to their ${p.cancerType} data stream. I can confirm their telemetry is stable.`;
  }

  // Global Context Responses
  if (lcMsg.match(/(\d+)/)) {
    const num = lcMsg.match(/(\d+)/)[0];
    return `I am updating the target population parameters to synthesize a cohort of ${num} digital twins. This will recalibrate the baseline distributions.`;
  }
  if (lcMsg.includes('total') || lcMsg.includes('how many')) {
    return `The system is currently tracking ${context.metrics?.total || 12842} total patients globally, with ${context.metrics?.eligible || 1348} marked as highly eligible for active trials.`;
  }
  if (lcMsg.includes('diabet')) {
    return "I've dynamically adjusted the clinical constraints to isolate Type 2 Diabetes parameters. The background synthesis engine is recalculating HbA1c distributions.";
  }
  if (lcMsg.includes('generate') || lcMsg.includes('start')) {
    return `I am ready when you are. Click 'Generate Cohort' to begin synthesizing ${context.targetSize} digital twins based on your current constraints.`;
  }
  
  if (lcMsg.includes('summarize') || lcMsg.includes('current page')) {
    const route = context.currentRoute || 'unknown';
    if (route.includes('/dashboard/assistant')) {
      return "You are on the Research Assistant page. Here, you can define cohort parameters (like age range, clinical targets) and generate digital twins. You can also chat with me to analyze the resulting simulated population.";
    } else if (route.includes('/dashboard/monitoring')) {
      return "You are on the System Health Monitoring page. It displays real-time telemetry from hospital nodes, active sync status, and system alerts.";
    } else if (route.includes('/dashboard/reports')) {
      return "You are on the Reports page. This module provides analytical breakdowns of patient eligibility, predictive outcomes, and compliance metrics.";
    } else {
      return `You are currently viewing the ${route.replace('/dashboard/', '').replace('/', ' ')} section of the ClinTwin platform.`;
    }
  }
  
  if (lcMsg.includes('cpu') || lcMsg.includes('server')) {
    return `Server CPU load is currently averaging 42% across all processing nodes. Memory utilization is at 18GB/64GB, well within safe parameters.`;
  }
  if (lcMsg.includes('alert') || lcMsg.includes('critical')) {
    return `No critical alerts are active. The system is operating normally. Last automated security sweep was completed 2 hours ago.`;
  }
  if (lcMsg.includes('compliance')) {
    return `Compliance metrics track adherence to HIPAA and GDPR standards across the digital twin database. Currently, data anonymization compliance is at 100%.`;
  }
  if (lcMsg.includes('filter') || lcMsg.includes('stage 3')) {
    return `Applying filters for Stage 3 patients... I've isolated 142 digital twins matching this criteria. They have been loaded into the active analysis view.`;
  }
  if (lcMsg.includes('target') || lcMsg.includes('clinical')) {
    return `The active clinical targets currently being tracked include Type 2 Diabetes, Hypertension, and Severe Asthma, based on the global cohort parameters.`;
  }

  if (context.targetSize) {
    return `I have parsed your request: "${message}". Using the global cohort parameters (Target Size: ${context.targetSize}), I have optimized the predictive model. You may proceed when ready.`;
  } else {
    return `I have analyzed your request: "${message}". The global metrics are tracking stable. Let me know if you need to query a specific patient or analyze a dataset.`;
  }
};
