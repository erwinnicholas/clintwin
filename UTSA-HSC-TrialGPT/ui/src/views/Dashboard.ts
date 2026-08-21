import { APIClient } from '../api';

interface ChartInstance {
    destroy: () => void;
}

export class DashboardView {
    chartInstance: ChartInstance | null;

    constructor() {
        this.chartInstance = null;
    }

    async init() {
        try {
            const summary = await APIClient.getSummary();
            
            const totalPatientsEl = document.getElementById('stat-total-patients');
            const totalTrialsEl = document.getElementById('stat-total-trials');
            const enrolledPatientsEl = document.getElementById('stat-enrolled-patients');

            if (totalPatientsEl) totalPatientsEl.innerText = summary.funnel.initial_pool.toString();
            // We'll just fetch trials to get the total number
            const trials = await APIClient.listTrials();
            if (totalTrialsEl) totalTrialsEl.innerText = trials.length.toString();
            
            if (enrolledPatientsEl) enrolledPatientsEl.innerText = summary.funnel.enrolled.toString();

            this.renderDemographicsChart(summary.demographics);
        } catch (error) {
            console.error("Failed to load dashboard summary:", error);
            throw error;
        }
    }

    renderDemographicsChart(demographics: Record<string, string | number>[]) {
        const ctx = document.getElementById('demographicsChart') as HTMLCanvasElement;
        if (!ctx) return;

        // Destroy existing chart if present
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const labels = demographics.map(d => d.sex);
        const data = demographics.map(d => d.count);

        // @ts-ignore
        this.chartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(56, 189, 248, 0.6)',
                        'rgba(167, 139, 250, 0.6)',
                        'rgba(251, 146, 60, 0.6)'
                    ],
                    borderColor: [
                        'rgba(56, 189, 248, 1)',
                        'rgba(167, 139, 250, 1)',
                        'rgba(251, 146, 60, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#e2e8f0' }
                    }
                }
            }
        });
    }
}
