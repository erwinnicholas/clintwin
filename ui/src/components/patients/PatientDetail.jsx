import React, { useState } from 'react';
import { ChevronLeft, Users } from 'lucide-react';
import { StatusBadge, TabBar } from '../common/UIComponents';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { patientVitalsMock } from '../../pages/Patients_mock_data';

import ClinicalDataTab from './tabs/ClinicalDataTab';
import DigitalTwinTab from './tabs/DigitalTwinTab';
import TrialMatchingTab from './tabs/TrialMatchingTab';
import DocumentsTab from './tabs/DocumentsTab';
import HistoryTab from './tabs/HistoryTab';
import UpdateModal from './UpdateModal';

const PatientDetail = ({ patient: initialPatient, onBack }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [patient, setPatient] = useState(initialPatient);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const handleUpdate = (updatedFields) => {
    const updated = { ...patient, ...updatedFields };
    setPatient(updated);
    Object.assign(initialPatient, updatedFields);
    setShowUpdateModal(false);
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '2rem' }}>
      {showUpdateModal && (
        <UpdateModal 
          patient={patient} 
          onClose={() => setShowUpdateModal(false)} 
          onSave={handleUpdate} 
        />
      )}
      <button onClick={onBack} className="btn btn-secondary" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
        <ChevronLeft size={16} /> Back to Directory
      </button>

      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0, 102, 255, 0.1)', border: '2px solid var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={32} color="var(--accent-blue)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Patient <span style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', fontWeight: 'normal' }}>({patient.id})</span></h2>
            <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <span>{patient.sex}, {patient.age} Y</span>
              <span>•</span>
              <span>ECOG: {patient.ecog_score}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <StatusBadge status={patient.status} />
          <button className="btn btn-primary" style={{ padding: '0.5rem 1.5rem' }} onClick={() => setShowUpdateModal(true)}>Update Patient</button>
        </div>
      </div>

      <TabBar tabs={['Overview', 'Clinical Data', 'Digital Twin', 'Trial Matching', 'Documents', 'History']} activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Clinical Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>ECOG Score</div>
                  <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{patient.ecog_score}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>BMI</div>
                  <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{patient.bmi}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Blood Pressure</div>
                  <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{patient.systolic_bp}/{patient.diastolic_bp} mmHg</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>eGFR</div>
                  <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{patient.egfr}</div>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>{patientVitalsMock.title}</h3>
              <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { name: 'Jan', val: patient.hr - 2 },
                    { name: 'Feb', val: patient.hr + 1 },
                    { name: 'Mar', val: patient.hr - 4 },
                    { name: 'Apr', val: patient.hr + 3 },
                    { name: 'May', val: patient.hr - 1 },
                    { name: 'Jun', val: patient.hr }
                  ]}>
                    <Line type="monotone" dataKey="val" stroke="var(--accent-green)" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-primary)' }} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Data Completeness</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { label: 'Clinical Profile', val: 94 },
                    { label: 'Demographics', val: 100 },
                    { label: 'Laboratory Data', val: 87 },
                    { label: 'Medication Data', val: 96 }
                  ].map((d, i) => (
                    <div key={i}>
                      <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <span>{d.label}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{d.val}%</span>
                      </div>
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                        <div style={{ width: `${d.val}%`, height: '100%', background: 'var(--accent-blue)', borderRadius: '2px' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>

             <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Recent Activity</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', marginTop: '6px' }}></div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>Eligibility recalculated</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Today, 09:15 AM</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)', marginTop: '6px' }}></div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>Lab results (CBC) uploaded</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Yesterday, 04:30 PM</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-purple)', marginTop: '6px' }}></div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>Digital Twin synchronized</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Yesterday, 04:31 PM</div>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'Clinical Data' && <ClinicalDataTab patient={patient} />}
      {activeTab === 'Digital Twin' && <DigitalTwinTab patient={patient} />}
      {activeTab === 'Trial Matching' && <TrialMatchingTab patient={patient} />}
      {activeTab === 'Documents' && <DocumentsTab patient={patient} />}
      {activeTab === 'History' && <HistoryTab patient={patient} />}
    </div>
  );
};

export default PatientDetail;
