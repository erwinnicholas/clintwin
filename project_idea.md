# Project Documentation: Clinical Trial Simulation & Screening Pipeline

## 1. Executive Overview

This document outlines the architecture and implementation steps for a 5-phase Neuro-Symbolic Clinical Trial Simulator. The pipeline bridges deterministic data engineering with frontier AI simulation, shifting the trial-and-error process of clinical research into a secure, computational environment. To accommodate hardware constraints (specifically, systems operating with an 8GB VRAM GPU such as an RTX 3070 Ti running on Linux or Windows), the workflow is strictly serialized to prevent memory overflow.

---

## 2. System Architecture

```text
[ Phase 1: Deterministic Data Engineering ]
   ├──> Ingest CSV/XLSX to SQLite
   └──> Hard SQL Pre-Filter (Vitals, Demographics, Compliance)

[ Phase 2: Semantic Matching (UTSA-HSC-TrialGPT) ]
   ├──> Load local 8B LLM into VRAM
   ├──> Extract structured eligibility evidence from unstructured text
   └──> Output FHIR-compatible JSON & unload LLM from VRAM

[ Phase 3: Digital Twin Baseline Generation ]
   └──> Parse FHIR JSON & SQLite data to model 6-month historical baselines

[ Phase 4: In Silico Simulation & RL Monitoring ]
   ├──> Load RL Agent into VRAM
   ├──> Simulate multi-arm time progression (Vaccines A, B, C)
   └──> RL Agent flags heuristic abnormalities

[ Phase 5: "Glass Box" Explainability ]
   └──> Gemini API translates flagged data and exclusions into clinical summaries

```

---

## 3. Implementation Steps

### Phase 1: Deterministic Ingestion & Pre-Filtering

This phase guarantees the foundation is auditable by filtering patients via pure code before any AI inference occurs.

1. **Initialize the Database:** Set up a local SQLite database to serve as the highly indexed source of truth.
2. **Ingest Tabular Data:** Write a Python script using `pandas` to read patient CSV/XLSX files (demographics, structured lab vitals) and compliance rules, writing them to SQLite tables (`patients`, `labs`, `compliance`).
3. **Execute the SQL Gate:** Create a screening function that takes the trial's numeric inclusion/exclusion criteria and executes a hard SQL query (e.g., `SELECT patient_id FROM labs WHERE age >= 18 AND egfr > 45`).
4. **Compliance Check:** Run an inner join against the `compliance` table to drop patients lacking proper consent or IRB clearance.

### Phase 2: Semantic Filtering via UTSA-HSC-TrialGPT

This phase evaluates the unstructured physician progress notes for the cohort that survived Phase 1.

1. **Repository Setup:** Clone the adapted NCI framework repository: `git clone [https://github.com/penad4ut/UTSA-HSC-TrialGPT](https://github.com/penad4ut/UTSA-HSC-TrialGPT)`.
2. **Environment Configuration:** Install dependencies, ensuring `llama-cpp-python` is compiled with CUDA support to leverage the local GPU.
3. **Model Loading:** Download a quantized 8-billion parameter model (e.g., `Llama-3-8B-Instruct.Q4_K_M.gguf`). Configure the TrialGPT initialization to offload all layers to the GPU (`n_gpu_layers=-1`).
4. **Execution & Extraction:** Pass the unstructured notes of the Phase 1 cohort through the pipeline. The system will perform criterion-by-criterion matching and output structured, FHIR-compatible JSON files containing the evidence snippets.
5. **VRAM Flush:** Crucially, once the JSON files are generated, terminate the TrialGPT process to clear the 8GB of VRAM for the simulation phase.

### Phase 3: Digital Twin Baseline Generation

This phase builds the starting heuristic state for the simulation.

1. **Parse the Cohort:** Read the FHIR-compatible JSON outputs from Phase 2 to get the final list of fully eligible patients.
2. **Synthesize the Baseline:** Query the SQLite database for the past 6 months of time-series lab data for each eligible patient.
3. **Model the Twin:** Construct a Python class `DigitalTwin` that holds the patient's ID, historical metric arrays, and disease state (healthy vs. diseased). Instantiate this class for every patient in the cohort.

### Phase 4: *In Silico* Simulation & RL Monitoring

This phase simulates the introduction of experimental therapeutics and monitors synthetic progression.

1. **Cohort Stratification:** Write a script to randomly distribute the `DigitalTwin` objects into trial arms (e.g., Arm 1: Vaccine A, Arm 2: Vaccine B, Arm 3: Placebo).
2. **Time Progression Engine:** Implement a time-step loop. At each tick (representing a day or week), apply a mathematical progression heuristic to the twin's metrics based on their assigned vaccine arm and baseline disease state.
3. **RL Agent Deployment:** Load a lightweight Reinforcement Learning model (e.g., a DQN or PPO agent built with PyTorch) into the newly freed VRAM.
4. **Anomaly Detection:** As the simulation runs, stream the generated time-series data to the RL agent. Train the reward function to penalize severe deviations from healthy metric thresholds, prompting the agent to flag "adverse events" or recommend heuristic adjustments (like halting a dose).

### Phase 5: The "Glass Box" Explainability Layer

The final phase ensures the system acts as an auditable copilot rather than an automated decision-maker.

1. **Integrate Gemini API:** Install the `google-genai` SDK and configure the API key. Offloading this to the cloud API keeps local compute completely focused on the RL simulation.
2. **Summarize Exclusions:** For patients dropped in Phase 1 or 2, pass the SQL query logic or the TrialGPT extraction text to Gemini with a prompt to generate a 1-sentence clinical explanation for the exclusion.
3. **Explain the Simulation:** When the RL agent flags an anomaly in Phase 4, package the digital twin's metric array and the RL agent's decision state into a JSON object.
4. **Generate the Report:** Send this JSON payload to Gemini to translate the mathematical flag into a human-readable clinical summary (e.g., *"The RL agent flagged Digital Twin P-102 on Day 14 due to a simulated 30% drop in platelet count, indicating a potential adverse reaction to Vaccine Variant B."*).