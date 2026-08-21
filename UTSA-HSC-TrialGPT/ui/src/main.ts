import { APIClient } from './api';
import { DashboardView } from './views/Dashboard';
import { PatientsView } from './views/Patients';

class App {
    currentTrialId: string | null = null;
    currentRunId: string | null = null;
    
    views: NodeListOf<Element>;
    navItems: NodeListOf<Element>;
    alertBanner: HTMLElement;

    dashboard: DashboardView;
    patientsView: PatientsView;

    constructor() {
        this.dashboard = new DashboardView();
        this.patientsView = new PatientsView();

        this.views = document.querySelectorAll('.view-section');
        this.navItems = document.querySelectorAll('.nav-item');
        this.alertBanner = document.getElementById('alert-banner') as HTMLElement;
        
        this.setupNavigation();
        this.setupDashboard();
        this.setupUploadHandlers();
        this.setupTrialHandlers();
        this.setupPipelineHandlers();
        this.setupSimulationHandlers();
        this.setupPatientsHandlers();
    }

    // --- Navigation ---
    setupNavigation() {
        this.navItems.forEach(btn => {
            btn.addEventListener('click', () => {
                this.navItems.forEach(n => n.classList.remove('active'));
                btn.classList.add('active');
                
                const viewId = btn.getAttribute('data-view');
                if (!viewId) return;

                this.views.forEach(v => {
                    v.classList.add('hidden');
                    v.classList.remove('active');
                });
                
                const targetView = document.getElementById(`view-${viewId}`);
                if (targetView) {
                    targetView.classList.remove('hidden');
                    targetView.classList.add('active');
                }

                // If navigating to Dashboard, refresh it
                if (viewId === 'dashboard') {
                    this.dashboard.init();
                }
            });
        });
    }

    setupDashboard() {
        // Initialize dashboard on load
        this.dashboard.init();
    }

    // --- Alerts ---
    showAlert(message: string, isCritical: boolean = false) {
        this.alertBanner.classList.remove('hidden');
        this.alertBanner.style.background = isCritical ? 'rgba(239, 68, 68, 0.9)' : 'rgba(245, 158, 11, 0.9)';
        const msgEl = document.getElementById('alert-message');
        if (msgEl) msgEl.innerText = message;
        setTimeout(() => this.alertBanner.classList.add('hidden'), 5000);
    }

    // --- Upload Handlers ---
    setupUploadHandlers() {
        const btnUploadTabular = document.getElementById('btn-upload-tabular');
        if (btnUploadTabular) {
            btnUploadTabular.addEventListener('click', async (e) => {
                const btn = e.target as HTMLElement;
                btn.innerText = "Uploading...";
                try {
                    await APIClient.uploadTabular();
                    btn.innerText = "Success!";
                    btn.style.background = 'var(--success)';
                } catch(e: unknown) { 
                    const msg = e instanceof Error ? e.message : String(e);
                    alert(msg); 
                    btn.innerText = "Error"; 
                    throw e;
                }
            });
        }
        
        // Similarly for others... omitted for brevity to focus on new stuff
    }

    // --- Trial Config ---
    setupTrialHandlers() {
        const btnCreateTrial = document.getElementById('btn-create-trial');
        if (btnCreateTrial) {
            btnCreateTrial.addEventListener('click', async () => {
                const titleInput = document.getElementById('trial-title') as HTMLInputElement;
                if (!titleInput || !titleInput.value) return alert("Title required");
                try {
                    const trial = await APIClient.createTrial(titleInput.value);
                    this.currentTrialId = trial.trial_id;
                    const activeConfig = document.getElementById('trial-active-config');
                    const activeId = document.getElementById('active-trial-id');
                    if (activeConfig && activeId) {
                        activeConfig.classList.remove('hidden');
                        activeId.innerText = `Active Trial: ${trial.trial_id} - ${trial.title}`;
                    }
                    this.showAlert(`Created trial ${trial.trial_id}`);
                } catch (e: unknown) { 
                    const msg = e instanceof Error ? e.message : String(e);
                    alert(msg); 
                    throw e;
                }
            });
        }
    }

    // --- Patients Handlers ---
    setupPatientsHandlers() {
        const loadBtn = document.getElementById('btn-load-selected-patients');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                if (!this.currentTrialId) {
                    this.showAlert("No trial selected.", true);
                    throw new Error("No trial selected. Cannot load selected patients.");
                }
                this.patientsView.loadSelectedPatients(this.currentTrialId);
            });
        }

        const closeExplainBtn = document.getElementById('btn-close-explain');
        if (closeExplainBtn) {
            closeExplainBtn.addEventListener('click', () => {
                document.getElementById('modal-explain')?.classList.add('hidden');
            });
        }
    }

    // --- Pipeline & Simulation ---
    setupPipelineHandlers() {
        // Wiring up buttons for pipeline
        const bindRun = (btnId: string, stage: string) => {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            btn.addEventListener('click', async () => {
                if (!this.currentTrialId) {
                    this.showAlert("No trial selected.", true);
                    throw new Error(`No trial selected. Cannot run stage ${stage}.`);
                }
                const targetTrial = this.currentTrialId;
                try {
                    btn.innerText = "Running...";
                    await APIClient.runStage(targetTrial, stage);
                    btn.innerText = "Complete";
                    (btn as HTMLElement).style.background = 'var(--success)';
                } catch(e: unknown) {
                    btn.innerText = "Error";
                    const msg = e instanceof Error ? e.message : String(e);
                    alert(msg);
                    throw e;
                }
            });
        };

        bindRun('btn-run-hard', 'hard_filter');
        bindRun('btn-run-semantic', 'semantic_filter');
        bindRun('btn-run-compliance', 'compliance');
        bindRun('btn-run-twins', 'twins');
    }

    setupSimulationHandlers() {
        const btnStart = document.getElementById('btn-start-sim');
        if (btnStart) {
            btnStart.addEventListener('click', async () => {
                if (!this.currentTrialId) {
                    this.showAlert("No trial selected.", true);
                    throw new Error("No trial selected. Cannot start simulation.");
                }
                const targetTrial = this.currentTrialId;
                try {
                    const res = await APIClient.startSimulation(targetTrial);
                    this.currentRunId = res.run_id;
                    this.showAlert(`Simulation started: ${res.run_id}`);
                } catch(e: unknown) { 
                    const msg = e instanceof Error ? e.message : String(e);
                    alert(msg); 
                    throw e;
                }
            });
        }
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    (window as any).app = new App();
});
