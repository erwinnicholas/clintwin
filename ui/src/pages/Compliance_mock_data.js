import { ShieldAlert, AlertTriangle, FileText } from 'lucide-react';

export const complianceDomains = [
  { name: 'Protocol Adherence', score: 95 },
  { name: 'Data Integrity', score: 93 },
  { name: 'Patient Safety', score: 91 },
  { name: 'Informed Consent', score: 89 },
  { name: 'Regulatory Reporting', score: 86 },
  { name: 'Documentation', score: 86 },
];

export const trialCompliance = [
  { id: 'IMMNOVA-2024-07', name: 'ImmunoCheck in NSCLC', score: 95, open: 2, lastAudit: 'May 14, 2026', status: 'Compliant' },
  { id: 'CARDIO-2024-01', name: 'NovaHeart for Heart Failure', score: 91, open: 3, lastAudit: 'May 13, 2026', status: 'Compliant' },
  { id: 'NEURO-2024-03', name: 'NeuroZen in Alzheimer\'s', score: 88, open: 5, lastAudit: 'May 12, 2026', status: 'At Risk' },
  { id: 'ONCO-2024-04', name: 'Pancura in Pancreatic Cancer', score: 93, open: 1, lastAudit: 'May 11, 2026', status: 'Compliant' },
  { id: 'GI-2024-02', name: 'GutRelief in Crohn\'s Disease', score: 85, open: 7, lastAudit: 'May 10, 2026', status: 'At Risk' },
];

export const upcomingActivities = [
  { title: 'Protocol Deviation Review', target: 'IMMNOVA-2024-07', date: 'MAY 16', time: '11:00 AM', icon: ShieldAlert, color: 'var(--accent-green)' },
  { title: 'Safety Reporting Due', target: 'CARDIO-2024-01', date: 'MAY 18', time: '09:30 AM', icon: AlertTriangle, color: 'var(--accent-red)' },
  { title: 'Document Audit', target: 'NEURO-2024-03', date: 'MAY 20', time: '02:00 PM', icon: FileText, color: 'var(--accent-blue)' }
];
