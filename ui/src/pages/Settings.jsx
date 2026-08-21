import React, { useState } from 'react';
import { 
  Camera, Edit, Lock, Monitor, Smartphone, Save, Bell, Globe, 
  Shield, RefreshCw, Settings as SettingsIcon, Activity, 
  Building2, Users, Key, Link, AlertTriangle, FileText, ToggleRight, ToggleLeft
} from 'lucide-react';
import { SectionHeader, TabBar, StatusBadge } from '../components/common/UIComponents';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SYSTEM_ADMIN';
  
  const adminTabs = ['My Profile', 'Organization', 'Users & Roles', 'Security', 'Integrations', 'System Preferences', 'Audit Log'];
  const analystTabs = ['My Profile', 'Notifications', 'Preferences', 'Security'];
  const tabs = isAdmin ? adminTabs : analystTabs;
  
  const [activeTab, setActiveTab] = useState('My Profile');
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleExportLogs = () => {
    const logs = [
      { time: '2026-08-16 13:35:00', action: 'Updated System Preferences', user: 'admin@clintwin.com', ip: '192.168.1.45' },
      { time: '2026-08-16 12:10:15', action: 'Exported Trial Compliance Snapshot', user: 'analyst@clintwin.com', ip: '192.168.1.88' },
      { time: '2026-08-16 10:04:22', action: 'User Invitation Dispatched', user: 'admin@clintwin.com', ip: '192.168.1.45' }
    ];

    const csvContent = "data:text/csv;charset=utf-8," + 
      "Timestamp,Action,User,IP Address\n" +
      logs.map(l => `"${l.time}","${l.action}","${l.user}","${l.ip}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `security_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Security audit logs exported successfully!');
  };

  // Helper component for toggles
  const ToggleRow = ({ title, description, active }) => (
    <div className="flex-between" style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div>
        <div style={{ fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{description}</div>
      </div>
      {active ? <ToggleRight size={28} color="var(--accent-green)" /> : <ToggleLeft size={28} color="var(--text-muted)" />}
    </div>
  );

  return (
    <div style={{ paddingBottom: '2rem', maxWidth: '1200px' }}>
      <SectionHeader 
        title="Settings" 
        subtitle="Manage your account, organization, system preferences and security settings" 
      />

      <div style={{ marginBottom: '2rem' }}>
        <TabBar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {activeTab === 'My Profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Profile Card */}
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', height: 'fit-content' }}>
             <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.5rem' }}>
               <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>
                 {user?.name ? user.name.substring(0, 2).toUpperCase() : (isAdmin ? 'SA' : 'AK')}
               </div>
               <div style={{ position: 'absolute', bottom: 0, right: 0, width: '32px', height: '32px', background: 'var(--accent-green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '3px solid var(--bg-primary)' }}>
                 <Camera size={16} color="var(--bg-primary)" />
               </div>
             </div>
             <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{user?.name || (isAdmin ? 'Admin User' : 'Shwetha')}</h3>
             <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>{isAdmin ? 'System Administrator' : 'Research Physician'}</div>
             <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{user?.email || (isAdmin ? 'admin@clintwin.com' : 'shwetha@clintwin.com')}</div>
             <StatusBadge status="Active" />
          </div>

          {/* Profile Info */}
          <div className="glass-panel" style={{ padding: '2rem', height: 'fit-content' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Profile Information</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}><Edit size={14} style={{ marginRight: '0.5rem' }}/> Edit</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem 2rem', fontSize: '0.85rem' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Full Name</div>
                <div style={{ fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{user?.name || (isAdmin ? 'Admin User' : 'Shwetha')}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Role</div>
                <div style={{ fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{isAdmin ? 'System Administrator' : 'Research Physician'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Email</div>
                <div style={{ fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{user?.email || (isAdmin ? 'admin@clintwin.com' : 'arjun.k@clintwin.com')}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Department</div>
                <div style={{ fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Clinical Research</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Phone</div>
                <div style={{ fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>+91 98765 43210</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Time Zone</div>
                <div style={{ fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>(GMT +05:30) Asia/Kolkata</div>
              </div>
            </div>
            
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <button className="btn btn-primary" style={{ padding: '0.5rem 2rem' }}><Save size={16} style={{ marginRight: '0.5rem' }}/> Save Profile</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Security' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Shield size={48} color="var(--accent-green)" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Account Security</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Manage passwords, 2FA, and authentication methods</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="flex-between" style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Password</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Last changed 45 days ago</div>
                </div>
                <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem' }}>Change</button>
              </div>
              <div className="flex-between" style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Two-Factor Authentication</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>Enabled via Authenticator App</div>
                </div>
                <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem' }}>Manage</button>
              </div>
            </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Active Sessions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Monitor size={24} color="var(--accent-green)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Chrome on Windows</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Chennai, India • 192.168.1.10</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '2px' }}>Active now</div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Smartphone size={24} color="var(--text-secondary)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Safari on iPhone</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Yesterday, 09:15 AM</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chennai, India • 192.168.1.15</div>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--accent-red)', fontSize: '0.8rem', cursor: 'pointer' }}>Revoke</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Preferences' && (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Application Preferences</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="flex-between" style={{ paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Globe size={20} color="var(--accent-blue)" />
                <div>
                  <div style={{ fontWeight: 500 }}>Theme</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Choose your preferred visual theme</div>
                </div>
              </div>
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                <button style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>Light</button>
                <button style={{ padding: '0.5rem 1rem', background: 'var(--accent-blue)', border: 'none', color: 'white', cursor: 'pointer' }}>Dark</button>
                <button style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>System</button>
              </div>
            </div>
            
            <ToggleRow title="Data Density" description="Show more rows in data tables" active={false} />
            <ToggleRow title="Animations" description="Enable UI transitions and animations" active={true} />
            
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <button className="btn btn-primary" style={{ padding: '0.5rem 2rem' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Notifications' && (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Notification Settings</h3>
          <ToggleRow title="Email Alerts" description="Receive daily summaries and critical alerts via email" active={true} />
          <ToggleRow title="SMS Alerts" description="Receive text messages for critical system failures" active={false} />
          <ToggleRow title="In-App Notifications" description="Show popup toasts and badge counters" active={true} />
          <ToggleRow title="Marketing Communications" description="Updates about new ClinTwin features" active={false} />
        </div>
      )}

      {activeTab === 'Organization' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Building2 size={24} color="var(--accent-blue)" />
                <h3 style={{ fontSize: '1.1rem' }}>Organization Details</h3>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>Edit</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
              <div className="flex-between"><span style={{ color: 'var(--text-secondary)' }}>Name:</span> <span>Global Health Alliance</span></div>
              <div className="flex-between"><span style={{ color: 'var(--text-secondary)' }}>Region:</span> <span>North America (HQ)</span></div>
              <div className="flex-between"><span style={{ color: 'var(--text-secondary)' }}>License Type:</span> <span style={{ color: 'var(--accent-green)' }}>Enterprise Tier</span></div>
              <div className="flex-between"><span style={{ color: 'var(--text-secondary)' }}>Max Users:</span> <span>1000</span></div>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Active Sites</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="flex-between" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                <div><strong>Site A - New York</strong> <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>Active</div></div>
                <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>Manage</button>
              </div>
              <div className="flex-between" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                <div><strong>Site B - London</strong> <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>Active</div></div>
                <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>Manage</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Users & Roles' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>User Management</h3>
            <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>+ Add User</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem' }}>Name</th>
                <th style={{ padding: '1rem' }}>Email</th>
                <th style={{ padding: '1rem' }}>Role</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem' }}>{user?.name || 'Shwetha'}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>arjun.k@clintwin.com</td>
                <td style={{ padding: '1rem' }}><span style={{ padding: '0.2rem 0.5rem', background: 'rgba(0,102,255,0.2)', color: 'var(--accent-blue)', borderRadius: '4px', fontSize: '0.75rem' }}>Research Physician</span></td>
                <td style={{ padding: '1rem' }}><StatusBadge status="Active" /></td>
                <td style={{ padding: '1rem' }}><button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>Edit</button></td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem' }}>Sarah Jenkins</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>s.jenkins@clintwin.com</td>
                <td style={{ padding: '1rem' }}><span style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,152,0,0.2)', color: 'var(--accent-orange)', borderRadius: '4px', fontSize: '0.75rem' }}>Data Manager</span></td>
                <td style={{ padding: '1rem' }}><StatusBadge status="Active" /></td>
                <td style={{ padding: '1rem' }}><button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>Edit</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Integrations' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>System Integrations</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(0,255,100,0.3)' }}>
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Epic EHR</div>
                <ToggleRight size={24} color="var(--accent-green)" />
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Bi-directional sync of patient records and demographics.</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>Status: Connected (Last sync: 2 mins ago)</div>
            </div>
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Cerner API</div>
                <ToggleLeft size={24} color="var(--text-muted)" />
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Alternative EHR data ingestion endpoint.</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status: Disconnected</div>
            </div>
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(0,102,255,0.3)' }}>
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>AWS S3 Storage</div>
                <ToggleRight size={24} color="var(--accent-green)" />
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Secure backup storage for trial documents.</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>Status: Connected</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'System Preferences' && (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Global System Configuration</h3>
          <ToggleRow title="Strict Compliance Mode" description="Enforce FDA 21 CFR Part 11 electronic signatures on all exports" active={true} />
          <ToggleRow title="Auto-Ingestion" description="Enable automatic background parsing of new FHIR records" active={true} />
          <ToggleRow title="Debug Logging" description="Store verbose logs for LLM operations (warning: consumes more storage)" active={false} />
          <div style={{ marginTop: '2rem' }}>
            <button className="btn btn-primary">Apply Global Settings</button>
          </div>
        </div>
      )}

      {activeTab === 'Audit Log' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Security Audit Log</h3>
            <button onClick={handleExportLogs} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Export Logs</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem' }}>Timestamp</th>
                <th style={{ padding: '1rem' }}>Action</th>
                <th style={{ padding: '1rem' }}>User</th>
                <th style={{ padding: '1rem' }}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem' }}>2026-08-16 13:35:00</td>
                <td style={{ padding: '1rem' }}>Updated System Preferences</td>
                <td style={{ padding: '1rem' }}>admin@clintwin.com</td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>192.168.1.10</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem' }}>2026-08-16 09:15:22</td>
                <td style={{ padding: '1rem' }}>Successful Login</td>
                <td style={{ padding: '1rem' }}>admin@clintwin.com</td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>192.168.1.10</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem' }}>2026-08-15 17:40:12</td>
                <td style={{ padding: '1rem' }}>Role Changed: user_09 → Admin</td>
                <td style={{ padding: '1rem' }}>admin@clintwin.com</td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>192.168.1.10</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <div className="toast-notification">
          {toast}
        </div>
      )}

    </div>
  );
};

export default Settings;
