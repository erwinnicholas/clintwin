import React, { useState } from 'react';
import { Target, Activity, AlertTriangle, AlertCircle, ShieldAlert, CheckCircle, Calendar, Download, FileText, UploadCloud } from 'lucide-react';
import { StatCard, StatusBadge, SectionHeader } from '../components/common/UIComponents';

import { complianceDomains, trialCompliance, upcomingActivities } from './Compliance_mock_data';

import { ExportReportModal } from '../components/common/ExportReportModal';

const Compliance = () => {
  const [viewMode, setViewMode] = useState('region');
  const [toast, setToast] = useState('');
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const handleUploadGuidelines = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      showToast(`Uploaded ${e.target.files[0].name} successfully. Rules are being extracted.`);
    }
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <SectionHeader 
        title="Compliance Overview" 
        subtitle="Real-time monitoring of regulatory compliance and trial integrity" 
        action={
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => document.getElementById('guidelines-upload').click()}>
              <UploadCloud size={16}/> Upload Guidelines
            </button>
            <input type="file" id="guidelines-upload" accept=".txt,.pdf" style={{ display: 'none' }} onChange={handleUploadGuidelines} />
            <button onClick={() => setShowExportModal(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Download size={16}/> Export Report</button>
          </div>
        }
      />

      {/* Layer 3: KPI Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
           <div style={{ position: 'relative', width: '60px', height: '60px' }}>
             <svg width="60" height="60" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(0, 230, 118, 0.2)" strokeWidth="6" />
                <circle cx="30" cy="30" r="26" fill="none" stroke="var(--accent-green)" strokeWidth="6" strokeDasharray="163" strokeDashoffset="13" />
             </svg>
             <div style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
               92%
             </div>
           </div>
           <div>
             <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Overall Score</div>
             <div style={{ fontSize: '0.85rem', color: 'var(--accent-green)' }}>High Compliance</div>
             <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '0.25rem' }}>↑ 6% vs last 14 days</div>
           </div>
        </div>
        
        <StatCard title="Active Trials Monitored" value="24" subtext="Across 5 Therapeutic Areas" icon={Activity} color="0, 102, 255" />
        <StatCard title="Open Compliance Issues" value="18" subtext="↓ 5 vs last 14 days" icon={AlertCircle} color="255, 214, 0" />
        <StatCard title="Critical Issues" value="2" subtext="↓ 3 vs last 14 days" icon={AlertTriangle} color="255, 61, 0" />
        <StatCard title="Actions Completed" value="124" subtext="↑ 18 vs last 14 days" icon={CheckCircle} color="0, 230, 118" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Mock Heatmap & Trial Compliance Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           {/* Interactive Compliance Heatmap Matrix */}
           <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '380px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <div className="flex-between" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={18} color="var(--accent-blue)" /> Compliance & Regulatory Risk Heatmap
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    Real-time compliance performance grid mapping regulatory audit scores (%) across trial domains
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                   <button 
                     onClick={() => setViewMode('region')}
                     className="btn btn-secondary" 
                     style={{ 
                       padding: '0.35rem 0.85rem', 
                       fontSize: '0.75rem', 
                       fontWeight: 600,
                       background: viewMode === 'region' ? 'var(--accent-green)' : 'transparent',
                       color: viewMode === 'region' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                       border: `1px solid ${viewMode === 'region' ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)'}` 
                     }}>Region View</button>
                   <button 
                     onClick={() => setViewMode('trial')}
                     className="btn btn-secondary" 
                     style={{ 
                       padding: '0.35rem 0.85rem', 
                       fontSize: '0.75rem',
                       fontWeight: 600,
                       background: viewMode === 'trial' ? 'var(--accent-blue)' : 'transparent',
                       color: viewMode === 'trial' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                       border: `1px solid ${viewMode === 'trial' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)'}`
                     }}>Trial View</button>
                </div>
              </div>
              
              {/* Heatmap Legend Bar */}
              <div className="flex-between" style={{ padding: '0.5rem 0.85rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1rem', fontSize: '0.75rem' }}>
                 <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Compliance Score Scale:</span>
                 <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(0, 230, 118, 0.4)', border: '1px solid var(--accent-green)' }} />
                      <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>90-100% High</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(0, 102, 255, 0.4)', border: '1px solid var(--accent-blue)' }} />
                      <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>75-89% Moderate</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(255, 214, 0, 0.4)', border: '1px solid var(--accent-yellow)' }} />
                      <span style={{ color: 'var(--accent-yellow)', fontWeight: 700 }}>50-74% Warning</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(255, 61, 0, 0.4)', border: '1px solid var(--accent-red)' }} />
                      <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>&lt;50% Critical</span>
                    </div>
                 </div>
              </div>

              {/* Real Heatmap Grid Canvas */}
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {viewMode === 'region' ? (
                  <>
                    {/* Region View Matrix */}
                    <div style={{ display: 'grid', gridTemplateColumns: '130px repeat(5, 1fr)', gap: '6px', marginBottom: '4px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Region / Territory</div>
                      {['Protocol', 'Data Integrity', 'Safety', 'Consent', 'Regulatory'].map(col => (
                        <div key={col} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{col}</div>
                      ))}
                    </div>

                    {[
                      { name: 'North America', scores: [97, 94, 98, 95, 90] },
                      { name: 'Europe Central', scores: [91, 92, 96, 88, 87] },
                      { name: 'Asia-Pacific', scores: [87, 85, 92, 85, 81] },
                      { name: 'Latin America', scores: [92, 93, 94, 90, 86] },
                      { name: 'Middle East & Africa', scores: [84, 85, 89, 80, 79] }
                    ].map((row, rIdx) => (
                      <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: '130px repeat(5, 1fr)', gap: '6px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center' }}>{row.name}</div>
                        {row.scores.map((val, cIdx) => {
                          let bg = 'rgba(0, 230, 118, 0.15)';
                          let color = 'var(--accent-green)';
                          let border = 'rgba(0, 230, 118, 0.35)';

                          if (val < 90 && val >= 75) {
                            bg = 'rgba(0, 102, 255, 0.15)';
                            color = 'var(--accent-blue)';
                            border = 'rgba(0, 102, 255, 0.35)';
                          } else if (val < 75 && val >= 50) {
                            bg = 'rgba(255, 214, 0, 0.15)';
                            color = 'var(--accent-yellow)';
                            border = 'rgba(255, 214, 0, 0.35)';
                          } else if (val < 50) {
                            bg = 'rgba(255, 61, 0, 0.15)';
                            color = 'var(--accent-red)';
                            border = 'rgba(255, 61, 0, 0.35)';
                          }

                          return (
                            <div
                              key={cIdx}
                              onClick={() => showToast(`${row.name} Compliance Score: ${val}%`)}
                              style={{
                                background: bg,
                                border: `1px solid ${border}`,
                                borderRadius: '6px',
                                padding: '0.65rem 0.25rem',
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                color: color,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            >
                              {val}%
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {/* Trial View Matrix */}
                    <div style={{ display: 'grid', gridTemplateColumns: '130px repeat(5, 1fr)', gap: '6px', marginBottom: '4px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Trial ID</div>
                      {['GCP Rules', 'Biomarkers', 'Consent', 'SAE Report', 'FDA Part 11'].map(col => (
                        <div key={col} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-purple)' }}>{col}</div>
                      ))}
                    </div>

                    {[
                      { name: 'VAC-2024-01', scores: [98, 96, 99, 95, 94] },
                      { name: 'LUNG-2024-02', scores: [92, 88, 85, 74, 91] },
                      { name: 'CARDIO-2024-01', scores: [85, 89, 78, 68, 86] },
                      { name: 'NEURO-2024-03', scores: [95, 91, 93, 90, 89] },
                      { name: 'GI-2024-01', scores: [89, 84, 88, 82, 85] }
                    ].map((row, rIdx) => (
                      <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: '130px repeat(5, 1fr)', gap: '6px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center' }}>{row.name}</div>
                        {row.scores.map((val, cIdx) => {
                          let bg = 'rgba(0, 230, 118, 0.15)';
                          let color = 'var(--accent-green)';
                          let border = 'rgba(0, 230, 118, 0.35)';

                          if (val < 90 && val >= 75) {
                            bg = 'rgba(0, 102, 255, 0.15)';
                            color = 'var(--accent-blue)';
                            border = 'rgba(0, 102, 255, 0.35)';
                          } else if (val < 75) {
                            bg = 'rgba(255, 214, 0, 0.15)';
                            color = 'var(--accent-yellow)';
                            border = 'rgba(255, 214, 0, 0.35)';
                          }

                          return (
                            <div
                              key={cIdx}
                              onClick={() => showToast(`${row.name} Audit Score: ${val}%`)}
                              style={{
                                background: bg,
                                border: `1px solid ${border}`,
                                borderRadius: '6px',
                                padding: '0.65rem 0.25rem',
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                color: color,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            >
                              {val}%
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </>
                )}
              </div>
           </div>

           <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
             <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
               <h3 style={{ fontSize: '1.1rem' }}>Trial Compliance Status</h3>
             </div>
             <div style={{ overflowX: 'auto' }}>
               <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                 <thead>
                   <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                     <th style={{ padding: '1rem' }}>Trial ID</th>
                     <th style={{ padding: '1rem' }}>Trial Name</th>
                     <th style={{ padding: '1rem' }}>Score</th>
                     <th style={{ padding: '1rem' }}>Open Issues</th>
                     <th style={{ padding: '1rem' }}>Last Audit</th>
                     <th style={{ padding: '1rem' }}>Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   {trialCompliance.map((t, i) => (
                     <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }} className="table-row-hover">
                       <td style={{ padding: '1rem', color: 'var(--accent-blue)', fontWeight: 500 }}>{t.id}</td>
                       <td style={{ padding: '1rem' }}>{t.name}</td>
                       <td style={{ padding: '1rem' }}>{t.score}%</td>
                       <td style={{ padding: '1rem', color: t.open > 4 ? 'var(--accent-red)' : t.open > 2 ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>{t.open}</td>
                       <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{t.lastAudit}</td>
                       <td style={{ padding: '1rem' }}><StatusBadge status={t.status} /></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        </div>

        {/* Right Sidebar: Domains, Alerts, Activities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           
           <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Compliance Domains</h3>
                <button onClick={() => showToast('Opening detailed domains report...')} style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: 'var(--accent-green)', cursor: 'pointer' }}>View Details →</button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                 <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid var(--accent-green)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>6</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Domains</span>
                 </div>
                 <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                   {complianceDomains.map((d, i) => (
                     <div key={i} className="flex-between">
                       <span>{d.name}</span>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                             <div style={{ width: `${d.score}%`, height: '100%', background: 'var(--accent-green)', borderRadius: '2px' }}></div>
                          </div>
                          <span style={{ width: '30px', textAlign: 'right' }}>{d.score}%</span>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
           </div>

           <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Alerts & Notifications</h3>
                <button onClick={() => setShowAlertsModal(true)} style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: 'var(--accent-green)', cursor: 'pointer' }}>View All →</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ borderLeft: '2px solid var(--accent-red)', paddingLeft: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', color: 'var(--accent-red)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-red)' }}></div> Critical
                  </div>
                  <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>Informed consent missing for 2 participants in IMMNOVA-2024-07</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>10:15 AM</div>
                </div>

                <div style={{ borderLeft: '2px solid var(--accent-yellow)', paddingLeft: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', color: 'var(--accent-yellow)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-yellow)' }}></div> High
                  </div>
                  <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>Protocol deviation reported in CARDIO-2024-01</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Yesterday, 04:30 PM</div>
                </div>
              </div>
           </div>

           <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Upcoming Activities</h3>
                <button onClick={() => setShowCalendarModal(true)} style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: 'var(--accent-green)', cursor: 'pointer' }}>View Calendar →</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {upcomingActivities.map((act, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <act.icon size={20} color={act.color} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{act.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{act.target}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{act.date}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{act.time}</div>
                    </div>
                  </div>
                ))}
              </div>
           </div>

        </div>

      </div>
      
      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification">
          {toast}
        </div>
      )}

      {/* Alerts Modal */}
      {showAlertsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-panel" style={{ width: '600px', maxWidth: '90%', padding: '2rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'white' }}>Full Alerts List</h3>
              <button onClick={() => setShowAlertsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderLeft: '3px solid var(--accent-red)', paddingLeft: '1rem', background: 'rgba(255,61,0,0.1)', padding: '1rem' }}>
                <div style={{ color: 'var(--accent-red)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>CRITICAL • 10:15 AM</div>
                <div style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Informed consent missing for 2 participants in IMMNOVA-2024-07</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Immediate action required by Site Manager. E-Signature validation failed.</div>
              </div>
              <div style={{ borderLeft: '3px solid var(--accent-red)', paddingLeft: '1rem', background: 'rgba(255,61,0,0.1)', padding: '1rem' }}>
                <div style={{ color: 'var(--accent-red)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>CRITICAL • 09:05 AM</div>
                <div style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Data Integrity violation in GI-2024-02</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Duplicate patient records identified during batch upload.</div>
              </div>
              <div style={{ borderLeft: '3px solid var(--accent-yellow)', paddingLeft: '1rem', background: 'rgba(255,214,0,0.1)', padding: '1rem' }}>
                <div style={{ color: 'var(--accent-yellow)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>HIGH • Yesterday, 04:30 PM</div>
                <div style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Protocol deviation reported in CARDIO-2024-01</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Patient missed consecutive dosing window. Flagged for review.</div>
              </div>
              <div style={{ borderLeft: '3px solid var(--accent-blue)', paddingLeft: '1rem', background: 'rgba(0,102,255,0.1)', padding: '1rem' }}>
                <div style={{ color: 'var(--accent-blue)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>INFO • Yesterday, 02:00 PM</div>
                <div style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Regulatory submission packet generated</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>The requested FDA summary report is ready for download.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendarModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-panel" style={{ width: '500px', maxWidth: '90%', padding: '2rem' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'white' }}>Compliance Event Calendar</h3>
              <button onClick={() => setShowCalendarModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <div style={{ color: 'var(--accent-green)', fontWeight: 'bold', marginBottom: '0.5rem' }}>May 16 - 11:00 AM</div>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Protocol Deviation Review</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>IMMNOVA-2024-07</div>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <div style={{ color: 'var(--accent-red)', fontWeight: 'bold', marginBottom: '0.5rem' }}>May 18 - 09:30 AM</div>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Safety Reporting Due</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>CARDIO-2024-01</div>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <div style={{ color: 'var(--accent-blue)', fontWeight: 'bold', marginBottom: '0.5rem' }}>May 20 - 02:00 PM</div>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Document Audit</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>NEURO-2024-03</div>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', opacity: 0.5 }}>
                <div style={{ color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' }}>May 25 - 10:00 AM</div>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Site Initiation Visit</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Site B - London</div>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem' }}>Sync to Outlook/Google Calendar</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Trial Compliance Overview"
        pdfTitle="ClinTwin Compliance & Audit Telemetry Report"
        columns={['Trial ID', 'Trial Name', 'Score (%)', 'Open Issues', 'Last Audit', 'Compliance Status']}
        data={trialCompliance.map(t => ({ id: t.id, name: t.name, score: `${t.score}%`, open: t.open, audit: t.lastAudit, status: t.status }))}
        fileNamePrefix="compliance_audit_report"
        onSuccess={showToast}
      />
    </div>
  );
};

export default Compliance;
