// Types
export interface FunnelStats {
    initial_pool: number;
    enrolled: number;
}

export interface SummaryResponse {
    funnel: FunnelStats;
    demographics: Record<string, string | number>[];
}

export interface PatientListItem {
    patient_id: string;
    age: number;
    sex: string;
    bmi: number;
    ecog_score: number;
}

export interface TrialResponse {
    trial_id: string;
    title: string;
    description: string;
    status: string;
    pipeline_stage: string;
    created_at: string;
}

export interface SelectedPatient {
    patient_id: string;
    filter_stage: string;
    arm_id?: string;
}

export interface ExplainResponse {
    report: string;
}

export interface GenericResponse {
    status?: string;
    message?: string;
}

export interface SimStartResponse {
    status: string;
    run_id: string;
    message?: string;
}

export interface SimStatusResponse {
    run_id: string;
    status: string;
    current_day: number;
    total_days: number;
    last_updated: string;
}

export class APIClient {
    static async _request<T>(method: string, path: string, body: unknown = null): Promise<T> {
        const options: RequestInit = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const res = await fetch(path, options);
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`API Error: ${res.status} ${err}`);
        }
        return await res.json() as T;
    }

    static async _upload<T>(path: string, fileFieldId: string): Promise<T> {
        const fileInput = document.getElementById(fileFieldId) as HTMLInputElement;
        if (!fileInput || !fileInput.files || !fileInput.files.length) throw new Error("No file selected");
        
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        
        const res = await fetch(path, { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
        return await res.json() as T;
    }

    // -- Dashboard --
    static async getSummary(): Promise<SummaryResponse> { 
        return await this._request<SummaryResponse>('GET', '/api/v1/summary'); 
    }

    // -- Patients --
    static async listPatients(): Promise<PatientListItem[]> { return await this._request<PatientListItem[]>('GET', '/api/v1/patients/'); }
    static async uploadTabular(): Promise<GenericResponse> { return await this._upload<GenericResponse>('/api/v1/patients/upload/tabular', 'file-tabular'); }
    static async uploadLongitudinal(): Promise<GenericResponse> { return await this._upload<GenericResponse>('/api/v1/patients/upload/longitudinal', 'file-longitudinal'); }
    static async uploadNote(patientId: string, text: string): Promise<GenericResponse> {
        return await this._request<GenericResponse>('POST', '/api/v1/patients/upload/notes', {
            patient_id: patientId, note_id: "N" + Date.now(), note_date: new Date().toISOString(),
            note_type: "CLINICAL_NOTE", raw_text: text
        });
    }
    static async uploadNotesCsv(): Promise<GenericResponse> { return await this._upload<GenericResponse>('/api/v1/patients/upload/notes-csv', 'file-notes-csv'); }

    // -- Trials --
    static async createTrial(title: string, description: string = ""): Promise<TrialResponse> {
        return await this._request<TrialResponse>('POST', '/api/v1/trials/', { title, description });
    }
    static async listTrials(): Promise<TrialResponse[]> { return await this._request<TrialResponse[]>('GET', '/api/v1/trials/'); }
    static async uploadTabularCriteria(trialId: string): Promise<GenericResponse> { return await this._upload<GenericResponse>(`/api/v1/trials/${trialId}/criteria/tabular`, 'file-criteria'); }
    static async uploadCompliance(trialId: string, text: string): Promise<GenericResponse> {
        return await this._request<GenericResponse>('POST', `/api/v1/trials/${trialId}/compliance`, { rule_text: text });
    }
    static async getTrialPatients(trialId: string): Promise<SelectedPatient[]> {
        return await this._request<SelectedPatient[]>('GET', `/api/v1/trials/${trialId}/patients`);
    }

    // -- Pipeline --
    static async runStage(trialId: string, stage: string): Promise<GenericResponse> {
        return await this._request<GenericResponse>('POST', `/api/v1/trials/${trialId}/pipeline/run?stage=${stage}`);
    }

    // -- Simulation --
    static async startSimulation(trialId: string): Promise<SimStartResponse> {
        return await this._request<SimStartResponse>('POST', `/api/v1/trials/${trialId}/simulation/start`);
    }
    static async getSimulationStatus(runId: string): Promise<SimStatusResponse> {
        return await this._request<SimStatusResponse>('GET', `/api/v1/trials/simulation/status/${runId}`);
    }
    static async getDecisionLog(runId: string): Promise<unknown> {
        return await this._request<unknown>('GET', `/api/v1/trials/simulation/log/${runId}`);
    }

    // -- Explain --
    static async explainDecision(action: string, rationale: string, beliefState: unknown): Promise<ExplainResponse> {
        return await this._request<ExplainResponse>('POST', '/api/v1/explain', { action, rationale, belief_state: beliefState });
    }
}
