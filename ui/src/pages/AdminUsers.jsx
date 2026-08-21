import React, { useState } from 'react';
import { Search, Filter, UserPlus, FileText, Download } from 'lucide-react';
import { SectionHeader, StatusBadge } from '../components/common/UIComponents';

import { mockUsersData } from './AdminUsers_mock_data';

import { ExportReportModal } from '../components/common/ExportReportModal';

const AdminUsers = () => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Research Analyst');
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleInvite = () => {
    if (!inviteEmail) return;
    showToast(`Invitation sent to ${inviteEmail}`);
    setShowInviteModal(false);
    setInviteEmail('');
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Platform Users & Access Roles"
        pdfTitle="ClinTwin User Permissions & Security Roster Report"
        columns={['User Name', 'Email Address', 'Platform Role', 'Organization', 'Status', 'Last Activity']}
        data={mockUsersData.data.map(u => ({ name: u.name, email: u.email, role: u.role, org: u.org, status: u.status, active: u.lastActive }))}
        fileNamePrefix="users_roles_export"
        onSuccess={showToast}
      />
      <SectionHeader 
        title="Users & Roles" 
        subtitle="Manage platform access, permissions, and organizations" 
        action={
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setShowExportModal(true)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Download size={16} /> Export Users
            </button>
            <button onClick={() => setShowInviteModal(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={16} /> Invite User
            </button>
          </div>
        }
      />

      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', marginTop: '1.5rem' }}>
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Search users by name or email..." style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem 0.5rem 2.5rem', borderRadius: '4px', color: 'white', fontSize: '0.9rem', width: '100%', outline: 'none' }} />
            </div>
            <select style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.9rem', outline: 'none' }}>
              <option>All Roles</option>
              <option>Research Analyst</option>
              <option>System Admin</option>
              <option>Compliance Officer</option>
            </select>
            <select style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.9rem', outline: 'none' }}>
              <option>All Statuses</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Locked</option>
            </select>
          </div>
          <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Filter size={16} /> Advanced Filters</button>
        </div>

        <div style={{ flex: 1, overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}>User Name</th>
                <th style={{ padding: '1rem' }}>Email</th>
                <th style={{ padding: '1rem' }}>Role</th>
                <th style={{ padding: '1rem' }}>Organization</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Last Active</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockUsersData.data.map((u, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="table-row-hover">
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{u.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ padding: '1rem', color: 'var(--accent-blue)' }}>{u.role}</td>
                  <td style={{ padding: '1rem' }}>{u.org}</td>
                  <td style={{ padding: '1rem' }}>
                    <StatusBadge status={u.status} />
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{u.lastActive}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <span style={{ cursor: 'pointer', color: 'var(--accent-blue)', marginRight: '1rem' }}>Edit</span>
                    <span style={{ cursor: 'pointer', color: 'var(--accent-red)' }}>Revoke</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex-between" style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
           <div>Showing 1 to 5 of 2,845 Users</div>
           <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>«</button>
              <button style={{ background: 'var(--accent-purple)', border: 'none', color: 'white', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer' }}>1</button>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>2</button>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>3</button>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>4</button>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>»</button>
           </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '400px', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Invite New User</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Email Address</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'white', outline: 'none' }} placeholder="colleague@organization.com" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'white', outline: 'none' }}>
                  <option value="Research Analyst">Research Analyst</option>
                  <option value="System Admin">System Admin</option>
                  <option value="Compliance Officer">Compliance Officer</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setShowInviteModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleInvite} className="btn btn-primary">Send Invite</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-notification">
          {toast}
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
