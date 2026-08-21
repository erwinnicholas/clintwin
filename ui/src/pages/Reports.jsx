import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Activity, CheckCircle, MapPin, Search, Calendar, Download, Filter, Radio } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, BarChart, Bar, LineChart, Line } from 'recharts';
import { AnimatedNumber } from '../components/common/UIComponents';
import { useGlobalData } from '../context/GlobalDataContext';

import { initialDomainData, heatmapMatrixData, heatmapColumns, trialCompliance } from './Reports_mock_data';

import { ExportReportModal } from '../components/common/ExportReportModal';

const Reports = () => {
  const { matchingData, docIntelligenceData } = useGlobalData();
  const [domainData, setDomainData] = useState(initialDomainData);
  const [activeRegion, setActiveRegion] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [mapView, setMapView] = useState('Region View');
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [showWindowModal, setShowWindowModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [toast, setToast] = useState('');
  const [liveWindow, setLiveWindow] = useState('Live Window');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Compliance Overview 
            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(0,240,255,0.1)', color: 'var(--accent-blue)', borderRadius: '12px', border: '1px solid var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Radio size={10} className="pulse-animation" /> LIVE
            </span>
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>Real-time streaming monitoring of regulatory compliance</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            onClick={() => setIsLive(!isLive)}
            style={{ padding: '0.5rem 1rem', background: isLive ? 'rgba(0,230,118,0.1)' : 'transparent', border: `1px solid ${isLive ? 'var(--accent-green)' : 'var(--border-color)'}`, color: isLive ? 'var(--accent-green)' : 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s' }}
          >
            {isLive ? 'Pause Stream' : 'Resume Stream'}
          </button>
          <button onClick={() => setShowWindowModal(true)} style={{ background: 'none', color: 'var(--text-primary)', padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }} className="btn-secondary">
             <Calendar size={16} /> {liveWindow}
          </button>
          <button onClick={() => setShowExportModal(true)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            <Download size={16} style={{ marginRight: '8px' }}/> Export Report
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'relative', overflow: 'hidden' }}>
           <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '4px solid var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
             <AnimatedNumber value="92%" />
           </div>
           <div>
             <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Overall Score</div>
             <div style={{ color: 'var(--accent-green)', fontSize: '0.8rem', marginTop: '0.25rem' }}>High Compliance</div>
             <div style={{ color: 'var(--accent-green)', fontSize: '0.75rem', marginTop: '0.5rem' }}>↑ Streaming</div>
           </div>
           {isLive && <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: 'var(--accent-green)', opacity: 0.5 }} className="pulse-animation"></div>}
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}><Activity size={16} /> Active Trials</div>
           <div style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}><AnimatedNumber value={24} /></div>
           <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real-time telemetry</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(255, 214, 0, 0.3)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--accent-yellow)' }}><AlertTriangle size={16} /> Open Issues</div>
           <div style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}><AnimatedNumber value={18} /></div>
           <div style={{ fontSize: '0.75rem', color: 'var(--accent-yellow)' }}>Auto-updating</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(255, 61, 0, 0.3)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--accent-red)' }}><ShieldCheck size={16} /> Critical Issues</div>
           <div style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}><AnimatedNumber value={2} /></div>
           <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)' }}>Requires action</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--accent-green)' }}><CheckCircle size={16} /> Actions Completed</div>
           <div style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}><AnimatedNumber value={124} /></div>
           <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>Today</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '420px', display: 'flex', flexDirection: 'column' }}>
          <div className="flex-between" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} color="var(--accent-blue)" /> Global Telemetry Heatmap Matrix
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Visualizing compliance & telemetry performance scores (%) across 5 core regulatory factors by region & site
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button onClick={() => setMapView('Region View')} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: mapView === 'Region View' ? 'var(--accent-blue)' : 'transparent', color: mapView === 'Region View' ? 'var(--bg-primary)' : 'var(--text-secondary)', fontWeight: 600 }}>Region View</button>
                <button onClick={() => setMapView('Site View')} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: mapView === 'Site View' ? 'var(--accent-blue)' : 'transparent', color: mapView === 'Site View' ? 'var(--bg-primary)' : 'var(--text-secondary)', fontWeight: 600 }}>Site View</button>
              </div>
            </div>
          </div>

          <div className="flex-between" style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.25rem', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Compliance Score Scale:</span>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(0, 230, 118, 0.4)', border: '1px solid var(--accent-green)' }} />
                <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>Optimal (&ge;90%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(255, 214, 0, 0.4)', border: '1px solid var(--accent-yellow)' }} />
                <span style={{ color: 'var(--accent-yellow)', fontWeight: 700 }}>Moderate (85-89%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(255, 61, 0, 0.4)', border: '1px solid var(--accent-red)' }} />
                <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>Critical (&lt;85%)</span>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
             
             <div style={{ display: 'grid', gridTemplateColumns: '130px repeat(5, 1fr)', gap: '6px', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Location / Domain</div>
                {heatmapColumns.map(col => (
                  <div key={col} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{col}</div>
                ))}
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {heatmapMatrixData[mapView].map(row => (
                  <div key={row.row} style={{ display: 'grid', gridTemplateColumns: '130px repeat(5, 1fr)', gap: '6px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'white', fontWeight: 600 }}>
                        {row.row}
                     </div>
                     {row.cols.map((cell, idx) => {
                        let bg = 'rgba(0, 230, 118, 0.15)';
                        let color = 'var(--accent-green)';
                        let border = 'rgba(0, 230, 118, 0.35)';
                        
                        if (cell.val < 90) {
                          bg = 'rgba(255, 214, 0, 0.15)';
                          color = 'var(--accent-yellow)';
                          border = 'rgba(255, 214, 0, 0.35)';
                        }
                        if (cell.val < 85) {
                          bg = 'rgba(255, 61, 0, 0.15)';
                          color = 'var(--accent-red)';
                          border = 'rgba(255, 61, 0, 0.35)';
                        }

                        return (
                          <div
                            key={idx}
                            style={{
                              background: bg,
                              color: color,
                              border: `1px solid ${border}`,
                              padding: '0.85rem 0.5rem',
                              borderRadius: '6px',
                              textAlign: 'center',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                            title={`${row.row} - ${cell.col}: ${cell.val}%`}
                          >
                            {cell.val}%
                          </div>
                        );
                     })}
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Right Side Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Live Domains {isLive && <span style={{ width: '8px', height: '8px', background: 'var(--accent-red)', borderRadius: '50%' }} className="pulse-animation"></span>}
              </h3>
              <button onClick={() => setShowMatrixModal(true)} style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: 'var(--accent-blue)', cursor: 'pointer' }}>View Matrix →</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', height: '180px' }}>
              <div style={{ width: '140px', height: '140px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={domainData} innerRadius={50} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none">
                      {domainData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} style={{ transition: 'all 0.5s ease' }} />)}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                   <span style={{ fontSize: '1.75rem', fontWeight: 'bold' }}><AnimatedNumber value={6} /></span>
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Domains</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
                {domainData.map((d, i) => (
                  <div key={i} className="flex-between" style={{ cursor: 'pointer', padding: '0.2rem', borderRadius: '4px', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                     <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                       <span style={{ fontWeight: 500 }}>{d.value}%</span>
                       <div style={{ width: '50px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                          <div style={{ width: `${d.value}%`, height: '100%', background: d.color, borderRadius: '2px', transition: 'width 1s ease' }}></div>
                       </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Alerts & Notifications</h3>
              <button onClick={() => setShowStreamModal(true)} style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: 'var(--accent-blue)', cursor: 'pointer' }}>Stream →</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.85rem', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }} className="hover-bg-light">
                <div className="flex-between" style={{ marginBottom: '0.25rem' }}>
                   <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-red)' }} className="pulse-animation"></div> Critical</span>
                   <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Just now</span>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>Informed consent missing for 2 participants in IMMNOVA-2024-07</div>
              </div>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
              <div style={{ fontSize: '0.85rem', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }} className="hover-bg-light">
                <div className="flex-between" style={{ marginBottom: '0.25rem' }}>
                   <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-yellow)' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-yellow)' }}></div> High</span>
                   <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>10 mins ago</span>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>Protocol deviation reported in CARDIO-2024-01</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Track 4: Clinical Trial Matching & Document Intelligence Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{matchingData.title || 'AI Patient-Trial Matching'}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{matchingData.subtitle || 'Automated screening & matching via EMR/Lab extraction'}</p>
          <div style={{ flex: 1, minHeight: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={matchingData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {matchingData.series?.map((s, idx) => (
                    <linearGradient key={`grad-${idx}`} id={`color${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={s.color} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={s.color} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <RechartsTooltip contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                {matchingData.series?.map((s, idx) => (
                   <Area key={idx} type="monotone" dataKey={s.dataKey} name={s.name} stroke={s.color} fillOpacity={1} fill={`url(#color${s.dataKey})`} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{docIntelligenceData.title || 'Research Document Intelligence'}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{docIntelligenceData.subtitle || 'Criteria extraction & regulatory compliance verification velocity'}</p>
          <div style={{ flex: 1, minHeight: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={docIntelligenceData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <RechartsTooltip contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                {docIntelligenceData.series?.map((s, idx) => (
                   <Line key={idx} type="monotone" dataKey={s.dataKey} name={s.name} stroke={s.color} strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-primary)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Table */}
      <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
        <div className="flex-between" style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Trial Compliance Status</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Search live trials..." style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.4rem 1rem 0.4rem 2rem', borderRadius: '4px', color: 'white', fontSize: '0.8rem', outline: 'none' }} />
            </div>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Filter size={14} /> Filter</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem 1.5rem' }}>Trial ID</th>
                <th style={{ padding: '1rem' }}>Trial Name</th>
                <th style={{ padding: '1rem' }}>Live Score</th>
                <th style={{ padding: '1rem' }}>Trend</th>
                <th style={{ padding: '1rem' }}>Open Issues</th>
                <th style={{ padding: '1rem' }}>Last Ping</th>
                <th style={{ padding: '1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {trialCompliance.map((trial, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', cursor: 'pointer' }} className="table-row-hover" onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--accent-purple)' }}>{trial.id}</td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{trial.name}</td>
                  <td style={{ padding: '1rem' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {trial.score}% 
                        {isLive && i % 2 === 0 && <Activity size={12} color="var(--accent-green)" className="pulse-animation" />}
                     </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                      <div style={{ width: `${trial.score}%`, height: '100%', background: trial.score > 90 ? 'var(--accent-green)' : 'var(--accent-yellow)', borderRadius: '2px' }}></div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: trial.issues > 3 ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>{trial.issues}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{isLive ? 'Just now' : trial.audit}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem',
                      background: trial.status === 'Compliant' ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 214, 0, 0.1)',
                      color: trial.status === 'Compliant' ? 'var(--accent-green)' : 'var(--accent-yellow)',
                      border: `1px solid ${trial.status === 'Compliant' ? 'var(--accent-green)' : 'var(--accent-yellow)'}`
                    }}>
                      {trial.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* View Matrix Modal */}
      {showMatrixModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel fade-in" style={{ width: '500px', padding: '2rem', background: 'var(--bg-secondary)', border: '1px solid var(--accent-blue)' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: 'var(--text-primary)' }}>Live Domain Matrix</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {domainData.map((d, i) => (
                <div key={i} className="flex-between" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', borderLeft: `4px solid ${d.color}` }}>
                   <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                   <span style={{ fontWeight: 'bold', color: d.color }}>{d.value}%</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowMatrixModal(false)} className="btn btn-primary" style={{ padding: '0.5rem 1.5rem' }}>Close Window</button>
            </div>
          </div>
        </div>
      )}

      {/* Stream Modal */}
      {showStreamModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel fade-in" style={{ width: '500px', padding: '2rem', background: 'var(--bg-secondary)', border: '1px solid var(--accent-blue)' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: 'var(--text-primary)' }}>Live Alerts Stream</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
               <div style={{ padding: '1rem', background: 'rgba(255,61,0,0.1)', borderLeft: '4px solid var(--accent-red)', borderRadius: '4px' }}>
                 <div style={{ fontWeight: 'bold', color: 'var(--accent-red)', marginBottom: '0.5rem' }}>Critical - Just now</div>
                 <div style={{ color: 'var(--text-secondary)' }}>Informed consent missing for 2 participants in IMMNOVA-2024-07</div>
               </div>
               <div style={{ padding: '1rem', background: 'rgba(255,214,0,0.1)', borderLeft: '4px solid var(--accent-yellow)', borderRadius: '4px' }}>
                 <div style={{ fontWeight: 'bold', color: 'var(--accent-yellow)', marginBottom: '0.5rem' }}>High - 10 mins ago</div>
                 <div style={{ color: 'var(--text-secondary)' }}>Protocol deviation reported in CARDIO-2024-01</div>
               </div>
               <div style={{ padding: '1rem', background: 'rgba(0,102,255,0.1)', borderLeft: '4px solid var(--accent-blue)', borderRadius: '4px' }}>
                 <div style={{ fontWeight: 'bold', color: 'var(--accent-blue)', marginBottom: '0.5rem' }}>Info - 45 mins ago</div>
                 <div style={{ color: 'var(--text-secondary)' }}>System backup completed successfully</div>
               </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowStreamModal(false)} className="btn btn-primary" style={{ padding: '0.5rem 1.5rem' }}>Close Window</button>
            </div>
          </div>
        </div>
      )}
      {/* Live Window Modal */}
      {showWindowModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-panel" style={{ width: '400px', maxWidth: '90%', padding: '2rem' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'white' }}>Select Live Window</h3>
              <button onClick={() => setShowWindowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['Live Window', 'Last 1 Hour', 'Last 24 Hours', 'Last 7 Days', 'Last 30 Days'].map((option) => (
                <button 
                  key={option}
                  onClick={() => { setLiveWindow(option); setShowWindowModal(false); }}
                  style={{ 
                    padding: '1rem', 
                    background: liveWindow === option ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255,255,255,0.05)', 
                    border: liveWindow === option ? '1px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '8px', 
                    color: 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Compliance Telemetry Snapshot"
        pdfTitle="ClinTwin Compliance & Telemetry Executive Report"
        columns={['Trial ID', 'Trial Name', 'Compliance Score (%)', 'Open Issues', 'Last Audit', 'Status']}
        data={trialCompliance.map(t => ({ id: t.id, name: t.name, score: `${t.score}%`, issues: t.issues, audit: t.audit, status: t.status }))}
        fileNamePrefix="compliance_telemetry_snapshot"
        onSuccess={showToast}
      />

      {toast && (
        <div className="toast-notification">
          {toast}
        </div>
      )}
    </div>
  );
};

export default Reports;
