import React, { useState } from 'react';
import { Users, FileX, HardDrive, CheckCircle, Search, Filter, Download } from 'lucide-react';
import { SectionHeader, StatCard, StatusBadge } from '../components/common/UIComponents';
import { useGlobalData } from '../context/GlobalDataContext';
import { patientsData } from '../mockData';

import { liveAdminPatientsMock } from './AdminPatients_mock_data';

const AdminPatients = () => {
  const { metrics } = useGlobalData();
  const [isScanning, setIsScanning] = useState(false);
  const [patientsList, setPatientsList] = useState(liveAdminPatientsMock.data);

  const handleFixData = (patientId) => {
    setPatientsList(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'Processed', quality: '98%' } : p
    ));
  };

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      alert('Data Quality Scan complete. 12 records flagged for missing core fields.');
    }, 2000);
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Patient ID,Name,Ingestion Date,Source,Data Quality,Status\n" +
      patientsList.map(e => `${e.id},${e.name},"${e.date}",${e.source},${e.quality},${e.status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "patient_ingestion_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <SectionHeader 
        title="Patient Administration" 
        subtitle="Manage patient records, ingestion quality, and data issues" 
        action={
          <div style={{ display: 'flex', gap: '1rem' }}>
             <button onClick={handleExportCSV} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <Download size={16} /> Export CSV
             </button>
             <button 
               onClick={handleScan} 
               disabled={isScanning}
               className="btn btn-primary" 
               style={{ padding: '0.5rem 1rem', opacity: isScanning ? 0.7 : 1, cursor: isScanning ? 'wait' : 'pointer' }}
             >
               {isScanning ? 'Scanning Records...' : 'Data Quality Scan'}
             </button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard title="Total Patients" value={metrics.total.toLocaleString()} subtext="Live synced twin pool" icon={Users} color="0, 102, 255" />
        <StatCard title="New Today" value="24" subtext="Successfully processed" icon={HardDrive} color="0, 230, 118" />
        <StatCard title="Incomplete Records" value="12" subtext="Missing core fields" icon={FileX} color="255, 214, 0" />
        <StatCard title="Data Quality Avg" value="96.5%" subtext="Across all records" icon={CheckCircle} color="0, 230, 118" />
      </div>

      <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
        <div className="flex-between" style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '1.1rem' }}>{liveAdminPatientsMock.title}</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Search patient ID..." style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.4rem 1rem 0.4rem 2rem', borderRadius: '4px', color: 'white', fontSize: '0.8rem' }} />
            </div>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Filter size={14} /> Filter</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem 1.5rem' }}>Patient ID</th>
                <th style={{ padding: '1rem' }}>Name (Admin View)</th>
                <th style={{ padding: '1rem' }}>Ingestion Date</th>
                <th style={{ padding: '1rem' }}>Source</th>
                <th style={{ padding: '1rem', width: '150px' }}>Data Quality</th>
                <th style={{ padding: '1rem', width: '120px' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patientsList.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }} className="table-row-hover">
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--accent-blue)' }}>{p.id}</td>
                  <td style={{ padding: '1rem' }}>{p.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{p.date}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{p.source}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', width: '35px' }}>{p.quality}</span>
                      <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', minWidth: '50px' }}>
                        <div style={{ 
                          width: p.quality, 
                          height: '100%', 
                          background: parseInt(p.quality) > 90 ? 'var(--accent-green)' : parseInt(p.quality) > 75 ? 'var(--accent-yellow)' : 'var(--accent-red)', 
                          borderRadius: '2px' 
                        }}></div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      color: p.status === 'Processed' ? 'var(--accent-green)' : p.status === 'Incomplete' ? 'var(--accent-yellow)' : 'var(--accent-red)',
                      fontSize: '0.75rem',
                      background: p.status === 'Processed' ? 'rgba(0, 230, 118, 0.1)' : p.status === 'Incomplete' ? 'rgba(255, 214, 0, 0.1)' : 'rgba(255, 61, 0, 0.1)',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      display: 'inline-block',
                      textAlign: 'center',
                      minWidth: '85px',
                      border: `1px solid ${p.status === 'Processed' ? 'rgba(0, 230, 118, 0.3)' : p.status === 'Incomplete' ? 'rgba(255, 214, 0, 0.3)' : 'rgba(255, 61, 0, 0.3)'}`
                    }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', color: 'var(--accent-blue)', borderColor: 'transparent', background: 'rgba(0, 102, 255, 0.1)' }}>Review</button>
                      {p.status !== 'Processed' && <button onClick={() => handleFixData(p.id)} className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', color: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' }}>Fix Data</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPatients;
