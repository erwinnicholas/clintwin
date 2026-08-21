import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Activity, FileText, FileCheck, Upload, Database,
  Settings, LogOut, ShieldAlert, Monitor, Server, BookOpen, UserPlus, FileBarChart, FolderOpen,
  MessageSquare, Sun, Moon, PieChart, X, Maximize, Minimize
} from 'lucide-react';

const SidebarItem = ({ to, icon: Icon, label }) => (
  <NavLink 
    to={to} 
    end={to === '/dashboard' || to === '/admin'}
    style={({ isActive }) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.65rem 1rem',
      borderRadius: '8px',
      color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
      background: isActive ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
      textDecoration: 'none',
      marginBottom: '0.15rem',
      transition: 'all 0.2s',
      fontSize: '0.85rem'
    })}
  >
    <Icon size={18} />
    <span style={{ fontWeight: 500 }}>{label}</span>
  </NavLink>
);

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = window.location.pathname;
  const [isLightMode, setIsLightMode] = useState(false);
  const [isLayoutFullscreen, setIsLayoutFullscreen] = useState(false);

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [isLightMode]);

  const toggleFullscreen = () => {
    const nextState = !isLayoutFullscreen;
    setIsLayoutFullscreen(nextState);
    if (nextState) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const analystLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/dashboard/patients', label: 'Patients', icon: Users },
    { to: '/dashboard/trials', label: 'Clinical Trials', icon: Activity },
    { to: '/dashboard/data-generator', label: 'Test Data', icon: Database },
    { to: '/dashboard/documents', label: 'Documents', icon: FolderOpen },
    { to: '/dashboard/rules', label: 'Hospital Rules', icon: ShieldAlert },
    { to: '/dashboard/monitoring', label: 'Monitoring', icon: Monitor },
    { to: '/dashboard/reports', label: 'Reports', icon: FileBarChart },
    { to: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const adminLinks = [
    { to: '/admin', label: 'Platform Overview', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users & Roles', icon: UserPlus },
    { to: '/admin/patients', label: 'Patient Administration', icon: Users },
    { to: '/admin/trials', label: 'Trial Administration', icon: Activity },
    { to: '/admin/compliance', label: 'Compliance & Audits', icon: BookOpen },
    { to: '/admin/monitoring', label: 'System Health', icon: Monitor },
    { to: '/admin/logs', label: 'Event Logs', icon: Server },
    { to: '/admin/reports', label: 'System Analytics', icon: PieChart },
  ];

  const links = user?.role === 'SYSTEM_ADMIN' ? adminLinks : analystLinks;

  return (
    <div className="app-container">
      {/* Sidebar */}
      {!isLayoutFullscreen && (
        <div className="sidebar" style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', padding: '0 0.5rem' }}>
            <Activity size={32} color="var(--accent-blue)" />
            <h2 className="text-gradient" style={{ fontSize: '1.5rem', margin: 0 }}>ClinTwin</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {links.map((link) => (
              <SidebarItem key={link.to} to={link.to} icon={link.icon} label={link.label} />
            ))}
          </div>

          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {user?.role === 'SYSTEM_ADMIN' && !user?.name ? 'SA' : 
                  (user?.name ? user.name.replace(/^Dr\.\s+/i, '').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'U')
                }
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {user?.name || (user?.role === 'SYSTEM_ADMIN' ? 'Admin User' : 'Shwetha')}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {user?.role === 'SYSTEM_ADMIN' ? 'System Administrator' : 'Research Physician'}
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              style={{ 
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', 
                padding: '0.5rem 1rem', background: 'transparent', border: 'none', 
                color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '8px',
                textAlign: 'left', fontSize: '0.85rem'
              }}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="main-content" style={isLayoutFullscreen ? { flex: 1, width: '100vw', height: '100vh' } : {}}>
        <div className="header flex-between">
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', width: '60%' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input 
                type="text" 
                placeholder="Search patient ID, trial name, or keyword..." 
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)',
                  padding: '0.5rem 1rem 0.5rem 2.5rem',
                  borderRadius: '20px',
                  color: 'white',
                  width: '100%',
                  outline: 'none',
                  fontSize: '0.85rem'
                }}
              />
              <Activity size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
             <button 
               onClick={() => setIsLightMode(!isLightMode)} 
               style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
               title="Toggle Theme"
             >
               {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
             </button>
             <button
               onClick={toggleFullscreen}
               style={{
                 background: isLayoutFullscreen ? 'rgba(255, 61, 0, 0.15)' : 'rgba(0, 240, 255, 0.15)',
                 border: `1px solid ${isLayoutFullscreen ? 'rgba(255, 61, 0, 0.4)' : 'rgba(0, 240, 255, 0.4)'}`,
                 color: isLayoutFullscreen ? 'var(--accent-red)' : 'var(--accent-blue)',
                 cursor: 'pointer',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '0.4rem',
                 padding: '0.38rem 0.85rem',
                 borderRadius: '6px',
                 fontSize: '0.78rem',
                 fontWeight: 600
               }}
               title={isLayoutFullscreen ? "Exit Full Screen Layout" : "Expand Layout to Full Screen Laptop View"}
             >
               {isLayoutFullscreen ? (
                 <><Minimize size={15} /> Exit Full Screen</>
               ) : (
                 <><Maximize size={15} /> Expand Full Screen</>
               )}
             </button>
             <MessageSquare size={18} color="var(--text-secondary)" cursor="pointer" title="Research Assistant" onClick={() => navigate(user?.role === 'SYSTEM_ADMIN' ? '/admin/assistant' : '/dashboard/assistant')} />
             <div style={{ position: 'relative' }}>
                <Monitor size={18} color="var(--accent-green)" cursor="pointer" title="System Status" />
                <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, background: 'var(--accent-green)', borderRadius: '50%' }}></div>
             </div>
             <Settings size={18} color="var(--text-secondary)" cursor="pointer" onClick={() => navigate(user?.role === 'SYSTEM_ADMIN' ? '/admin/settings' : '/dashboard/settings')} title="Settings" />
             {(location !== '/dashboard' && location !== '/admin') && (
               <button 
                 onClick={() => navigate(user?.role === 'SYSTEM_ADMIN' ? '/admin' : '/dashboard')}
                 style={{ background: 'rgba(255, 61, 0, 0.1)', border: '1px solid rgba(255, 61, 0, 0.3)', color: 'var(--accent-red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.3rem', borderRadius: '4px' }}
                 title="Close Page"
               >
                 <X size={16} />
               </button>
             )}
          </div>
        </div>
        
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
