import React, { useState } from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis,
  RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';
import { SectionHeader } from '../components/common/UIComponents';
import { Activity, Server, Network, Download } from 'lucide-react';
import toast from 'react-hot-toast';

import { loadVsQueriesMock, nodeLatencyMock, resourceQuotasMock } from './AdminReports_mock_data';

const AdminReports = () => {
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>ClinTwin System Analytics Executive Report</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0b0f19; color: #e2e8f0; padding: 2rem; }
            .header { border-bottom: 2px solid #00f0ff; padding-bottom: 1rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 24px; font-weight: bold; color: #00f0ff; }
            .subtitle { font-size: 14px; color: #94a3b8; margin-top: 4px; }
            .badge { background: rgba(0,240,255,0.15); color: #00f0ff; padding: 4px 12px; border-radius: 12px; border: 1px solid #00f0ff; font-size: 12px; }
            .section { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
            .section-title { font-size: 16px; font-weight: bold; color: #ffffff; margin-bottom: 1rem; }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
            th, td { border: 1px solid rgba(255,255,255,0.1); padding: 10px; text-align: left; font-size: 13px; }
            th { background: rgba(0,240,255,0.1); color: #00f0ff; }
            .footer { margin-top: 3rem; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">ClinTwin System Analytics & Infrastructure Report</div>
              <div class="subtitle">Generated on ${new Date().toLocaleString()} | Confidential Medical Telemetry Document</div>
            </div>
            <div class="badge">OFFICIAL REPORT</div>
          </div>

          <div class="section">
            <div class="section-title">1. Server Load vs. Query Volume Metrics</div>
            <table>
              <thead>
                <tr>
                  <th>Time Window</th>
                  <th>Server Load (%)</th>
                  <th>Query Volume</th>
                  <th>Node Latency (ms)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${loadVsQueriesMock.data.map((d, i) => `
                  <tr>
                    <td><strong>${d.time}</strong></td>
                    <td style="color: ${d.load > 70 ? '#ff3d00' : '#00e676'}">${d.load}%</td>
                    <td>${d.queries.toLocaleString()} queries</td>
                    <td>${nodeLatencyMock.data[i]?.latency || 42} ms</td>
                    <td><span style="color: #00e676">NOMINAL</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">2. Infrastructure Resource Quota Utilization</div>
            <table>
              <thead>
                <tr>
                  <th>Resource Domain</th>
                  <th>Utilization (%)</th>
                  <th>Capacity Status</th>
                </tr>
              </thead>
              <tbody>
                ${resourceQuotasMock.data.map(r => `
                  <tr>
                    <td><strong>${r.name}</strong></td>
                    <td style="color: ${r.value > 80 ? '#ffd600' : '#00f0ff'}">${r.value}%</td>
                    <td>${r.value > 80 ? 'High Utilization' : 'Optimal Capacity'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            ClinTwin Digital Twin Healthcare Platform &copy; 2026. All rights reserved. Encrypted HIPAA Audit Log #SYS-REPORT-${Math.floor(100000 + Math.random() * 900000)}
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    toast.success("Executive System Report PDF generated successfully.");
    setShowExportModal(false);
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Time,Server Load (%),Query Volume,Node Latency (ms),Quota Usage (%)\n" +
      loadVsQueriesMock.data.map((d, i) => `${d.time},${d.load},${d.queries},${nodeLatencyMock.data[i]?.latency || 45},${resourceQuotasMock.data[i]?.value || 70}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `System_Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Analytics CSV Data exported successfully!');
    setShowExportModal(false);
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <SectionHeader 
        title="System Analytics Studio" 
        subtitle="Advanced infrastructure reporting, real-time telemetry, and analytics exports"
        action={
          <button className="btn btn-primary" onClick={() => setShowExportModal(true)} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export Report
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Composed Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Server size={18} color="var(--accent-blue)" /> {loadVsQueriesMock.title}
          </h3>
          <div style={{ height: '350px', width: '100%' }}>
            <ResponsiveContainer>
              <ComposedChart data={loadVsQueriesMock.data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tickMargin={10} />
                <YAxis yAxisId="left" stroke="var(--text-secondary)" fontSize={12} tickFormatter={(val) => `${val}%`} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(10, 15, 30, 0.9)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '8px' }} 
                  itemStyle={{ color: 'white' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                <Bar yAxisId="left" dataKey="load" name="Server Load (%)" fill="url(#colorLoad)" radius={[4, 4, 0, 0]} barSize={40} />
                <Line yAxisId="right" type="monotone" dataKey="queries" name="Query Volume" stroke="var(--accent-purple)" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-primary)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                
                <defs>
                  <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Scatter Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Network size={18} color="var(--accent-purple)" /> {nodeLatencyMock.title}
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" dataKey="x" name="Time Window" unit="m" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis type="number" dataKey="y" name="Latency" unit="ms" stroke="var(--text-secondary)" fontSize={12} />
                <ZAxis type="number" dataKey="z" range={[100, 500]} name="Node Load" />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: 'rgba(10, 15, 30, 0.9)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '8px' }}
                  itemStyle={{ color: 'white' }}
                  formatter={(value, name) => [name === 'Latency' ? `${value} ms` : name === 'Time Window' ? `${value}m` : value, name]}
                />
                <Scatter name="Infrastructure Nodes" data={nodeLatencyMock.data} fill="var(--accent-purple)" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radial Bar Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="var(--accent-green)" /> {resourceQuotasMock.title}
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer>
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" barSize={15} data={resourceQuotasMock.data}>
                <RadialBar
                  minAngle={15}
                  label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }}
                  background={{ fill: 'rgba(255,255,255,0.05)' }}
                  clockWise
                  dataKey="value"
                />
                <Legend iconSize={10} layout="vertical" verticalAlign="bottom" wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(10, 15, 30, 0.9)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '8px' }}
                  itemStyle={{ color: 'white' }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Export Format Selector Modal */}
      {showExportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '480px', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(0, 240, 255, 0.3)', boxShadow: '0 0 30px rgba(0, 240, 255, 0.2)', position: 'relative' }}>
            <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Download size={20} color="var(--accent-blue)" /> Export Analytics Report
              </h3>
              <button onClick={() => setShowExportModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Select your preferred export document format below for system telemetry data:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div 
                onClick={handleExportPDF}
                style={{ padding: '1.25rem', background: 'rgba(0, 240, 255, 0.06)', border: '1px solid var(--accent-blue)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '1rem' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ padding: '0.75rem', background: 'rgba(0, 240, 255, 0.15)', borderRadius: '8px', color: 'var(--accent-blue)' }}>
                  📄
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>Export as PDF Document (.pdf)</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Executive formatted PDF report with graphs & tables ready for printing or saving</div>
                </div>
              </div>

              <div 
                onClick={handleExportCSV}
                style={{ padding: '1.25rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '1rem' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ padding: '0.75rem', background: 'rgba(0, 230, 118, 0.15)', borderRadius: '8px', color: 'var(--accent-green)' }}>
                  📊
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>Export Raw CSV Data (.csv)</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Comma-separated values data sheet for Excel / data analysis</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button onClick={() => setShowExportModal(false)} className="btn btn-secondary" style={{ padding: '0.4rem 1.25rem', fontSize: '0.85rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminReports;
