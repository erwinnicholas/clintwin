import { HardDrive, Activity, Server, Database } from 'lucide-react';

export const usageData = [
  { name: '08:00', load: 45, latency: 120 }, { name: '10:00', load: 60, latency: 180 }, { name: '12:00', load: 85, latency: 290 },
  { name: '14:00', load: 70, latency: 150 }, { name: '16:00', load: 55, latency: 130 }, { name: '18:00', load: 40, latency: 110 }
];

export const coreMicroservices = [
  { name: 'Data Ingestion Engine', status: 'Operational', color: 'var(--accent-green)', icon: HardDrive, metric: '99.9% Uptime' },
  { name: 'Digital Twin Generator', status: 'High Load', color: 'var(--accent-yellow)', icon: Activity, metric: '85% CPU' },
  { name: 'Eligibility Matching AI', status: 'Operational', color: 'var(--accent-green)', icon: Server, metric: '142ms Avg Latency' },
  { name: 'Primary Database', status: 'Operational', color: 'var(--accent-green)', icon: Database, metric: 'Read-Replica Synced' },
  { name: 'FHIR Export Service', status: 'Degraded', color: 'var(--accent-red)', icon: Activity, metric: 'Timeout Errors' },
  { name: 'Authentication (SSO)', status: 'Operational', color: 'var(--accent-green)', icon: Server, metric: '99.99% Uptime' }
];
