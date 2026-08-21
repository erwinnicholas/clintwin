"""
api/services/explain.py
=======================
Wraps the AI Provider API to provide Glass Box explainability for POMDP decision logs and clinical contexts.
"""

from typing import Dict, Any
from api.services.ai_provider import generate

SYSTEM_PROMPTS = {
    "PATIENT_ELIGIBILITY": """You are a Clinical Research Coordinator reviewing 
    a patient's baseline vitals for trial eligibility. Use ICH-GCP guidelines 
    and standard clinical thresholds:
    - eGFR >= 60 mL/min (renal function)
    - Platelets >= 100,000/uL (hematologic safety)
    - ALT/AST <= 3x ULN (hepatic function)
    - Hemoglobin >= 9 g/dL (anemia risk)
    - ECOG 0-2 (functional status)
    - BMI 18.5-40 (metabolic eligibility)
    
    Provide a structured clinical assessment with: 
    1) Overall eligibility verdict, 
    2) Per-metric evaluation, 
    3) Risk flags if any.
    Keep it to 2-3 concise sentences suitable for a clinical dashboard.""",
    
    "TRIAL_PIPELINE": """You are a Clinical Operations Manager explaining the 
    current pipeline stage of a clinical trial to a research analyst. The 
    pipeline stages are:
    - NONE: Trial created, awaiting first pipeline run
    - HARD_FILTER: Quantitative criteria applied (age, labs, vitals)
    - SEMANTIC_FILTER: NLP-based clinical note matching (NER + embedding)
    - COMPLIANCE: ICH-GCP and hospital-specific rule validation
    - TWINS: Digital twin construction (Kalman filter initialization)
    - COMPLETED: Full pipeline executed, ready for simulation
    
    Explain what has been completed, what comes next, and any 
    implications for the trial timeline. Keep it to 2-3 concise sentences.""",
    
    "SIMULATION_DECISION": """You are the Chief Medical Safety Officer 
    overseeing an automated clinical trial simulation. The AI Trial Agent 
    uses a POMDP (Partially Observable Markov Decision Process) with 
    Kalman Filter state estimation. Translate the mathematical decision 
    into a professional, human-readable clinical incident report suitable 
    for an FDA audit board. Do not invent symptoms. Focus solely on 
    translating the statistical logic into clinical language in 2 sentences.""",

    "GENERAL_QUERY": """You are a Clinical Digital Twin Research Assistant.
    Answer the user's clinical or technical question clearly and concisely in 1-3 sentences.
    If clinical data is provided, ground your answer in that data."""
}

def generate_explainability_report(context_type: str, action: str, rationale: str, belief_state: Dict[str, Any]) -> str:
    """
    Translates raw backend data into a human-readable clinical incident report using the AI Provider.
    """
    # Fallback to SIMULATION_DECISION if invalid
    system_prompt = SYSTEM_PROMPTS.get(context_type, SYSTEM_PROMPTS["SIMULATION_DECISION"])
    
    prompt = f"""
    Context Action/Decision: {action}
    
    Rationale/Query: 
    "{rationale}"
    
    Underlying Belief State / Clinical Data:
    {belief_state}
    """
    
    try:
        return generate(prompt, system_prompt)
    except Exception as e:
        return f"[MOCK GENAI] The agent processed {action}. (AI Provider error: {e})"
