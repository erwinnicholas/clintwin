import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, ShieldCheck, Activity, Search, Filter, ShieldAlert, Radio, MapPin, Zap, Download } from 'lucide-react';
import { SectionHeader, StatCard, AnimatedNumber } from '../components/common/UIComponents';
import { complianceEvents } from '../mockData';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useGlobalData } from '../context/GlobalDataContext';
import { mapCoordinatesMock, heatMapConfigMock } from './Monitoring_mock_data';
import { ExportReportModal } from '../components/common/ExportReportModal';

const Monitoring = () => {
  const { monitoringStats } = useGlobalData();
  const [activeAlerts, setActiveAlerts] = useState(complianceEvents);
  const [showExportModal, setShowExportModal] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };
  
  const [heatMapRadius, setHeatMapRadius] = useState(heatMapConfigMock.initialSliders.radius);
  const [heatMapOpacity, setHeatMapOpacity] = useState(heatMapConfigMock.initialSliders.opacity);
  const [heatMapThreshold, setHeatMapThreshold] = useState(heatMapConfigMock.initialSliders.threshold);
  
  // Calculate dynamic radar data based on active alerts
  const radarData = [
    { subject: 'Protocol Adherence', A: 100 - (activeAlerts.filter(a => a.issue.toLowerCase().includes('protocol')).length * 35), fullMark: 100 },
    { subject: 'Data Integrity', A: 100 - (activeAlerts.length * 5), fullMark: 100 },
    { subject: 'Consent Forms', A: 100 - (activeAlerts.filter(a => a.issue.toLowerCase().includes('consent')).length * 50), fullMark: 100 },
    { subject: 'Reporting Speed', A: 100 - (activeAlerts.filter(a => a.issue.toLowerCase().includes('report')).length * 40), fullMark: 100 },
    { subject: 'Patient Safety', A: 100 - (activeAlerts.filter(a => a.issue.toLowerCase().includes('safety')).length * 25), fullMark: 100 },
    { subject: 'Site Compliance', A: 100 - (activeAlerts.filter(a => a.severity === 'Critical').length * 40), fullMark: 100 },
  ].map(d => ({ ...d, A: Math.max(10, d.A) })); // Ensure no score drops below 10 for visibility

  const dynamicStats = {
    critical: activeAlerts.filter(a => a.severity === 'Critical').length,
    high: activeAlerts.filter(a => a.severity === 'High').length,
    medium: activeAlerts.filter(a => a.severity === 'Medium').length,
    info: activeAlerts.filter(a => a.severity === 'Info').length,
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <ExportReportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)}
        title="Live SOC Event Log"
        pdfTitle="ClinTwin Command Center Telemetry & SOC Report"
        columns={['Alert ID', 'Event Description', 'Target Trial', 'Severity', 'Timestamp', 'Status']}
        data={activeAlerts.map((a, i) => ({ id: `ALT-${100+i}`, issue: a.issue, trial: a.trial || 'System', severity: a.severity, time: a.timestamp || 'Real-time', status: a.status || 'Active' }))}
        fileNamePrefix="soc_monitoring_log"
        onSuccess={showToast}
      />
      <SectionHeader 
        title={<span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><ShieldAlert size={28} color="var(--accent-red)" className="pulse-animation" /> Global Command Center</span>}
        subtitle="Real-time SOC feed of trial activity, anomalies, and compliance events" 
        action={
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', background: 'rgba(255, 61, 0, 0.1)', color: 'var(--accent-red)', borderRadius: '12px', border: '1px solid var(--accent-red)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', letterSpacing: '1px' }}>
              <Radio size={12} className="pulse-animation" /> THREAT LEVEL: ELEVATED
            </span>
            <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowExportModal(true)}><Download size={16} /> Export Log</button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard title="Critical Alerts" value={dynamicStats.critical.toString()} subtext="Action required immediately" icon={AlertTriangle} color="255, 61, 0" />
        <StatCard title="High Priority" value={dynamicStats.high.toString()} subtext="Review within 24h" icon={AlertCircle} color="255, 214, 0" />
        <StatCard title="Medium Priority" value={dynamicStats.medium.toString()} subtext="Monitor status" icon={Info} color="0, 102, 255" />
        <StatCard title="Informational" value={dynamicStats.info.toString()} subtext="System updates" icon={Activity} color="100, 100, 100" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Center: Live Heatmap Factor Inspector & Activity */}
        <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Visualized Factor Header Banner & Color Legend Bar */}
          <div style={{ padding: '1rem 1.5rem', background: 'rgba(0, 240, 255, 0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={16} color="var(--accent-blue)" /> Visualized Factor: <span style={{ color: 'var(--accent-blue)' }}>Trial Site Adverse Event Density & Patient Safety Risk</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Mapping real-time toxicity rates, protocol adherence, and trial site anomaly concentrations across global medical hubs.
              </div>
            </div>

            {/* Heatmap Color Scale Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'rgba(0,0,0,0.4)', padding: '0.45rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff0000', boxShadow: '0 0 8px #ff0000' }} />
                <span><strong style={{ color: '#ff3d00' }}>High Risk (&gt;12%)</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffd600', boxShadow: '0 0 8px #ffd600' }} />
                <span><strong style={{ color: '#ffd600' }}>Moderate (5-12%)</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00e676', boxShadow: '0 0 8px #00e676' }} />
                <span><strong style={{ color: '#00e676' }}>Optimal (&lt;5%)</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', height: '440px' }}>
            {/* Heat Map Controls Sidebar */}
            <div style={{ width: '270px', background: 'rgba(0,0,0,0.4)', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', fontSize: '0.8rem', zIndex: 10 }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                <Activity size={16} color="var(--accent-blue)" /> {heatMapConfigMock.title}
              </div>
              
              <div style={{ padding: '1.25rem', overflowY: 'auto' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ marginBottom: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>1. SELECT FACTOR MEASURED</div>
                  <select style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.45rem', borderRadius: '4px', fontSize: '0.78rem' }}>
                    <option>Represents Adverse Event Density</option>
                    <option>Represents Patient Volume Density</option>
                    <option>Represents Protocol Adherence Rate</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ marginBottom: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>2. SELECT TRIAL FILTER</div>
                  <select style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.45rem', borderRadius: '4px', fontSize: '0.78rem' }}>
                    {heatMapConfigMock.samples.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    Factor Density Radius
                  </div>
                  
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div className="flex-between" style={{ marginBottom: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                      <span>Radius Scope</span>
                      <span>{heatMapRadius}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={heatMapRadius} onChange={(e) => setHeatMapRadius(e.target.value)} style={{ width: '100%', accentColor: 'var(--accent-blue)' }} />
                  </div>
                  
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div className="flex-between" style={{ marginBottom: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                      <span>Opacity</span>
                      <span>{heatMapOpacity}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={heatMapOpacity} onChange={(e) => setHeatMapOpacity(e.target.value)} style={{ width: '100%', accentColor: 'var(--accent-blue)' }} />
                  </div>
                  
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div className="flex-between" style={{ marginBottom: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                      <span>Sensitivity Threshold</span>
                      <span>{heatMapThreshold}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={heatMapThreshold} onChange={(e) => setHeatMapThreshold(e.target.value)} style={{ width: '100%', accentColor: 'var(--accent-blue)' }} />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Interactive World Canvas with Labeled Factor Hotspots */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a101f', overflow: 'hidden' }}>
              {/* World Map Background SVG */}
              <svg viewBox="0 0 1000 500" style={{ width: '100%', height: '100%', opacity: 0.2, fill: 'var(--accent-blue)', position: 'absolute', top: 0, left: 0 }}>
                 <path d="M 233,138 L 221,123 L 209,114 L 182,109 L 165,116 L 158,111 L 138,110 L 115,103 L 95,108 L 84,103 L 53,109 L 52,117 L 33,115 L 29,119 L 34,136 L 43,134 L 46,141 L 62,143 L 64,151 L 52,159 L 55,166 L 52,168 L 54,179 L 60,183 L 56,189 L 61,192 L 60,202 L 67,205 L 75,201 L 79,203 L 73,207 L 87,215 L 94,213 L 96,217 L 105,214 L 105,221 L 110,227 L 116,236 L 110,246 L 118,252 L 126,249 L 135,257 L 131,265 L 140,277 L 149,275 L 157,281 L 157,287 L 169,292 L 175,291 L 180,296 L 180,311 L 195,317 L 204,334 L 204,342 L 210,347 L 221,372 L 222,382 L 234,394 L 235,404 L 246,420 L 253,423 L 258,416 L 258,421 L 263,422 L 264,435 L 273,436 L 279,444 L 286,442 L 289,451 L 297,458 L 303,456 L 311,465 L 309,475 L 316,478 L 316,488 L 324,489 L 325,482 L 318,470 L 320,466 L 310,457 L 314,449 L 305,441 L 306,432 L 294,424 L 297,419 L 285,405 L 292,398 L 291,387 L 299,380 L 296,373 L 306,366 L 301,363 L 302,347 L 317,330 L 317,314 L 328,310 L 326,303 L 341,296 L 343,285 L 341,273 L 348,272 L 348,266 L 338,252 L 331,253 L 328,247 L 321,248 L 311,241 L 312,234 L 304,233 L 300,227 L 291,228 L 288,221 L 275,221 L 269,228 L 268,235 L 260,237 L 250,226 L 243,227 L 235,217 L 232,204 L 235,199 L 229,195 L 232,187 L 225,183 L 230,175 L 226,168 L 234,159 L 230,154 Z M 483,164 L 471,159 L 452,159 L 444,166 L 431,164 L 420,173 L 418,179 L 413,180 L 410,186 L 401,189 L 398,198 L 402,204 L 398,211 L 392,212 L 388,218 L 393,227 L 393,234 L 403,243 L 408,242 L 413,248 L 413,258 L 418,257 L 423,264 L 433,268 L 437,276 L 444,281 L 445,286 L 452,284 L 459,291 L 459,298 L 476,293 L 485,302 L 493,303 L 507,312 L 513,312 L 519,307 L 514,297 L 519,293 L 536,295 L 544,290 L 553,293 L 560,286 L 558,277 L 566,274 L 569,267 L 565,263 L 575,257 L 573,251 L 581,248 L 582,241 L 591,236 L 590,226 L 602,223 L 604,213 L 597,204 L 600,197 L 595,192 L 600,184 L 593,181 L 594,173 L 588,168 L 594,157 L 584,151 L 587,143 L 576,140 L 571,146 L 561,142 L 556,149 L 546,149 L 539,157 L 526,155 L 517,163 L 505,160 Z M 715,162 L 702,156 L 688,157 L 678,166 L 666,163 L 658,170 L 655,178 L 647,180 L 644,188 L 634,191 L 631,200 L 635,207 L 631,215 L 626,216 L 622,223 L 629,234 L 629,242 L 640,253 L 646,252 L 653,261 L 653,272 L 659,271 L 665,281 L 676,285 L 681,295 L 689,301 L 690,307 L 698,305 L 707,315 L 707,323 L 726,317 L 736,329 L 746,331 L 762,342 L 769,343 L 776,337 L 770,326 L 776,321 L 795,324 L 805,319 L 815,324 L 824,316 L 821,306 L 830,302 L 833,294 L 829,289 L 840,283 L 838,276 L 847,272 L 849,264 L 859,258 L 858,247 L 871,244 L 874,233 L 866,223 L 869,215 L 863,209 L 869,200 L 862,196 L 863,187 L 856,181 L 862,169 L 851,162 L 854,153 L 842,149 L 836,156 L 825,151 L 819,160 L 808,160 L 800,169 L 785,167 L 775,177 L 761,173 Z" />
              </svg>
              
              {/* Heat Map Overlay rendering with explicit site pins */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: heatMapOpacity / 100 }}>
                {[
                  { region: 'North America (East Hub)', top: '35%', left: '26%', rate: '14.2% AE Rate', status: 'High Risk', color: '#ff0000', trial: 'LUNG-2024-02', patients: 1240 },
                  { region: 'North America (West Hub)', top: '40%', left: '18%', rate: '11.5% AE Rate', status: 'Moderate', color: '#ffd600', trial: 'IMMNOVA-2024-07', patients: 980 },
                  { region: 'Europe Central (Berlin)', top: '48%', left: '54%', rate: '6.8% Review', status: 'Moderate', color: '#ffd600', trial: 'CARDIO-2024-01', patients: 840 },
                  { region: 'Asia-Pacific (Tokyo Hub)', top: '55%', left: '76%', rate: '0.4% Low Risk', status: 'Optimal Safety', color: '#00e676', trial: 'ONCO-2024-04', patients: 1450 }
                ].map((site, idx) => {
                  const size = 45 + (heatMapRadius / 100 * 60);
                  return (
                    <div key={idx} style={{ position: 'absolute', top: site.top, left: site.left, transform: 'translate(-50%, -50%)', zIndex: 20 }}>
                      {/* Radial Heatmap Gradient Spot */}
                      <div style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${site.color} 0%, transparent 70%)`,
                        filter: `blur(${10 - (heatMapThreshold / 20)}px)`,
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none'
                      }} />

                      {/* Interactive Site Marker Pin & Label Card */}
                      <div
                        className="glass-panel"
                        style={{
                          position: 'relative',
                          padding: '0.45rem 0.75rem',
                          background: 'rgba(10, 20, 35, 0.9)',
                          border: `1px solid ${site.color}`,
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          boxShadow: `0 0 15px ${site.color}40`,
                          cursor: 'pointer'
                        }}
                      >
                        <MapPin size={16} color={site.color} />
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>{site.region}</div>
                          <div style={{ fontSize: '0.68rem', color: site.color, fontWeight: 800 }}>{site.rate} ({site.patients} Patients)</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Hotspots Factor Breakdown Data Table */}
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldAlert size={15} color="var(--accent-purple)" /> Detailed Heatmap Factors & Clinical Measurements Breakdown
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Region Site</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Primary Factor Measured</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Adverse Event / Risk Rate</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Patient Cohort</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Associated Trial</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Action Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { site: 'North America (East Hub)', factor: 'Adverse Event Concentration (Toxicity)', rate: '14.2% (High Toxicity)', cohort: '1,240 Patients', trial: 'LUNG-2024-02', status: 'Critical Review Required', color: 'var(--accent-red)' },
                    { site: 'North America (West Hub)', factor: 'Protocol Anomaly Density', rate: '11.5% (Review Needed)', cohort: '980 Patients', trial: 'IMMNOVA-2024-07', status: 'Audit Dispatched', color: 'var(--accent-yellow)' },
                    { site: 'Europe Central (Berlin)', factor: 'Consent & Verification Lag', rate: '6.8% (Pending Verification)', cohort: '840 Patients', trial: 'CARDIO-2024-01', status: 'Under Monitoring', color: 'var(--accent-yellow)' },
                    { site: 'Asia-Pacific (Tokyo Hub)', factor: 'Patient Safety & Adherence', rate: '0.4% (Optimal Safety)', cohort: '1,450 Patients', trial: 'ONCO-2024-04', status: 'Compliant & Optimal', color: 'var(--accent-green)' }
                  ].map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: 'white' }}>{row.site}</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>{row.factor}</td>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: row.color }}>{row.rate}</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-primary)' }}>{row.cohort}</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--accent-blue)', fontWeight: 600 }}>{row.trial}</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}><span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', background: `${row.color}18`, color: row.color, fontSize: '0.72rem', fontWeight: 600 }}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic SOC Vulnerability Matrix Radar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
             <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '0.35rem' }}>SOC Vulnerability Matrix</div>
             <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Multi-axis risk vector evaluation across 6 governance domains</div>
             
             <div style={{ width: '100%', height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                   <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                      <Radar name="Vulnerability" dataKey="A" stroke="var(--accent-red)" fill="var(--accent-red)" fillOpacity={0.3} />
                   </RadarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>

      {/* Live Event Stream (Replaces Table) */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="var(--accent-green)" /> Live Event Stream
          </h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
             <div style={{ position: 'relative', width: '250px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" placeholder="Filter stream..." style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.4rem 1rem 0.4rem 2.25rem', borderRadius: '4px', color: 'white', fontSize: '0.85rem', width: '100%', outline: 'none' }} />
             </div>
             <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Filter size={14} /> Options</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {activeAlerts.map((evt, i) => {
            const isCritical = evt.severity === 'Critical';
            const isHigh = evt.severity === 'Medium' || evt.severity === 'High';
            const color = isCritical ? 'var(--accent-red)' : isHigh ? 'var(--accent-yellow)' : 'var(--accent-blue)';
            
            return (
              <div key={i} className="fade-in" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.85rem',
                padding: '1.15rem 1.35rem', 
                background: 'rgba(255,255,255,0.02)', 
                border: '1px solid rgba(255,255,255,0.07)', 
                borderLeft: `4px solid ${color}`,
                borderRadius: '8px',
                position: 'relative'
              }}>
                {isCritical && <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(90deg, rgba(255,61,0,0.1) 0%, transparent 50%)', pointerEvents: 'none', animation: 'pulse 2s infinite' }}></div>}
                
                {/* Header Line */}
                <div className="flex-between" style={{ alignItems: 'center' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {isCritical ? <AlertTriangle size={17} color={color} /> : isHigh ? <AlertCircle size={17} color={color} /> : <Info size={17} color={color} />}
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: color, letterSpacing: '0.3px', lineHeight: '1.3' }}>{evt.issue.toUpperCase()}</span>
                      <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '10px', background: `${color}18`, color: color, border: `1px solid ${color}40`, fontWeight: 700 }}>
                        {evt.severity || (isCritical ? 'CRITICAL' : isHigh ? 'HIGH' : 'INFO')}
                      </span>
                   </div>
                   <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{evt.time}</div>
                </div>
                
                {/* Details & Action Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.82rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Entity</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-blue)', lineHeight: '1.3' }}>Trial: {evt.trial}</span>
                   </div>
                   
                   <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)' }}></div>
                   
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Team</span>
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)', lineHeight: '1.3' }}>{evt.team || 'Clinical Ops (Triage)'}</span>
                   </div>
                   
                   <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)' }}></div>
                   
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
                      <div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: evt.status === 'Resolved' ? 'var(--accent-green)' : 'var(--accent-yellow)', background: evt.status === 'Resolved' ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 214, 0, 0.12)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                          {evt.status || 'Awaiting Action'}
                        </span>
                      </div>
                   </div>
                   
                   {evt.status !== 'Resolved' && (
                     <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                        <button className="btn btn-secondary" onClick={() => showToast(`Investigation opened for ${evt.trial}`)} style={{ padding: '0.4rem 0.95rem', fontSize: '0.78rem' }}>Investigate</button>
                        <button className="btn btn-primary" onClick={() => { setActiveAlerts(prev => prev.filter((_, idx) => idx !== i)); showToast(`Alert resolved for ${evt.trial}`); }} style={{ padding: '0.4rem 0.95rem', fontSize: '0.78rem', background: isCritical ? 'rgba(255,61,0,0.15)' : '', borderColor: isCritical ? 'var(--accent-red)' : '' }}>Resolve</button>
                     </div>
                   )}
                </div>
              </div>
            );
          })}
          


        </div>
      </div>
    </div>
  );
};

export default Monitoring;
