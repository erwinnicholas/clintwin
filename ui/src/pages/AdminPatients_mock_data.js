import { patientsData } from '../mockData';

export const liveAdminPatientsMock = {
  title: 'Data Ingestion Logs',
  data: patientsData.map((p, i) => ({
    id: p.id,
    name: p.name,
    date: p.lastUpdated,
    source: i % 3 === 0 ? 'Excel Upload' : (i % 2 === 0 ? 'PDF Extraction' : 'EHR Sync'),
    quality: `${Math.floor(Math.random() * 20) + 80}%`,
    status: p.score > 50 ? 'Processed' : 'Data Error',
    rawScore: p.score
  }))
};
