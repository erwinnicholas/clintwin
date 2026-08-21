import { APIClient, SelectedPatient } from '../api';

export class PatientsView {
    async loadSelectedPatients(trialId: string) {
        try {
            const patients = await APIClient.getTrialPatients(trialId);
            const tbody = document.querySelector('#table-selected-patients tbody');
            if (!tbody) return;

            tbody.innerHTML = '';
            
            if (patients.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No patients evaluated for this trial yet. Run the pipeline first.</td></tr>';
                return;
            }

            patients.forEach((p: SelectedPatient) => {
                const tr = document.createElement('tr');
                
                const statusColor = p.filter_stage === 'INCLUDED' ? 'var(--success)' : 'var(--error)';

                tr.innerHTML = `
                    <td>${p.patient_id}</td>
                    <td style="color: ${statusColor}; font-weight: bold;">${p.filter_stage}</td>
                    <td>${p.arm_id || 'N/A'}</td>
                    <td><button class="btn small" data-pid="${p.patient_id}" data-action="${p.filter_stage}">Explain</button></td>
                `;
                
                const explainBtn = tr.querySelector('button');
                if (explainBtn) {
                    explainBtn.addEventListener('click', () => this.showExplanation(trialId, p.patient_id, p.filter_stage));
                }

                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error("Failed to load trial patients:", error);
            alert("Failed to load trial patients. See console.");
        }
    }

    async showExplanation(trialId: string, patientId: string, filterStage: string) {
        const modal = document.getElementById('modal-explain');
        const loading = document.getElementById('explain-loading');
        const content = document.getElementById('explain-content');

        if (!modal || !loading || !content) return;

        modal.classList.remove('hidden');
        loading.style.display = 'block';
        content.innerText = '';

        try {
            // In a hackathon context, we construct a reasonable prompt request for the Gemini explain endpoint.
            const rationale = `Patient ${patientId} evaluated. Final status: ${filterStage}.`;
            const beliefState = { "patient_id": patientId, "trial_id": trialId };

            const response = await APIClient.explainDecision(filterStage, rationale, beliefState);
            
            loading.style.display = 'none';
            content.innerText = response.report;

        } catch (error) {
            loading.style.display = 'none';
            content.innerText = `Error generating explanation: ${error}`;
        }
    }
}
