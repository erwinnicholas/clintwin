import React, { useState } from 'react';
import { Search, Filter, Calendar, Download } from 'lucide-react';
import { SectionHeader } from '../components/common/UIComponents';
import { ExportReportModal } from '../components/common/ExportReportModal';

import { mockLogs } from './AuditLog_mock_data';

const AuditLog = () => {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All Modules');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [showExportModal, setShowExportModal] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };
  
  const filteredLogs = mockLogs.filter(log => {
    const matchesSearch = log.event.toLowerCase().includes(search.toLowerCase()) || 
                          log.entity.toLowerCase().includes(search.toLowerCase()) ||
                          log.user.toLowerCase().includes(search.toLowerCase());
    const matchesModule = moduleFilter === 'All Modules' || log.module === moduleFilter;
    const matchesStatus = statusFilter === 'All Statuses' || log.status === statusFilter;
    return matchesSearch && matchesModule && matchesStatus;
  });

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Security & System Audit Log"
        pdfTitle="ClinTwin Audit Log & Data Access Governance Report"
        columns={['Timestamp', 'User / Principal', 'Event Description', 'System Module', 'Target Entity', 'Outcome Status']}
        data={filteredLogs.map(e => ({ time: e.time, user: e.user, event: e.event, module: e.module, entity: e.entity, status: e.status }))}
        fileNamePrefix="system_audit_log"
        onSuccess={showToast}
      />
      <SectionHeader 
        title="Global Audit Log" 
        subtitle="Immutable record of system events, data access, and user actions" 
        action={<button onClick={() => setShowExportModal(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Download size={16} /> Export Report</button>}
      />

      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search events, users, entities..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.4rem 1rem 0.4rem 2.25rem', borderRadius: '4px', color: 'white', fontSize: '0.85rem', width: '100%', outline: 'none' }} 
            />
          </div>
          <div style={{ position: 'relative' }}>
             <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
             <select style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.4rem 1rem 0.4rem 2.25rem', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}>
               <option>Last 24 Hours</option>
               <option>Last 7 Days</option>
               <option>Last 30 Days</option>
             </select>
          </div>
          <select 
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.4rem 1rem', borderRadius: '4px', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
          >
            <option>All Modules</option>
            <option>Infrastructure</option>
            <option>Ingestion Engine</option>
            <option>Twin Engine</option>
            <option>Trial Administration</option>
            <option>IAM</option>
            <option>Integration</option>
            <option>Compliance</option>
          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.4rem 1rem', borderRadius: '4px', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
          >
            <option>All Statuses</option>
            <option>Success</option>
            <option>Info</option>
            <option>Warning</option>
            <option>Error</option>
          </select>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
           <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                  <th style={{ padding: '0.75rem 1rem' }}>User / Service</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Action / Event</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Module</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Target Entity</th>
                  <th style={{ padding: '0.75rem 1rem', width: '120px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length > 0 ? filteredLogs.map((log, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }} className="table-row-hover">
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{log.time}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{log.user}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{log.event}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{log.module}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--accent-blue)' }}>{log.entity}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ 
                        color: log.status === 'Success' ? 'var(--accent-green)' : log.status === 'Warning' ? 'var(--accent-yellow)' : log.status === 'Error' ? 'var(--accent-red)' : 'var(--accent-blue)',
                        fontSize: '0.75rem',
                        background: log.status === 'Success' ? 'rgba(0, 230, 118, 0.1)' : log.status === 'Warning' ? 'rgba(255, 214, 0, 0.1)' : log.status === 'Error' ? 'rgba(255, 61, 0, 0.1)' : 'rgba(0, 102, 255, 0.1)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px'
                      }}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No logs found matching your filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
