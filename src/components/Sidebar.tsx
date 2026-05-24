import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, AlertCircle, FileText, LogOut, Database, Shield, Sparkles, FileUp, Globe } from 'lucide-react';
import { useAuth } from './AuthContext';

const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="/qordata_logo.png" alt="Qordata" style={{ height: '32px' }} />
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)', paddingRight: '4px' }}>
        {/* Administrative Control Hub */}
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', margin: '8px 0 4px 12px', fontWeight: 'bold', opacity: 0.8 }}>Administrative Hub</div>
        <NavLink to="/datacenter" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ borderLeft: '3px solid var(--secondary-accent)', background: 'rgba(124, 58, 237, 0.05)', fontWeight: 'bold' }}>
          <Database size={20} color="var(--primary-glow)" />
          <span style={{ color: 'var(--primary-glow)' }}>Global Data Center</span>
        </NavLink>

        <NavLink to="/global-data-status" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Globe size={20} />
          <span>Global Data Status</span>
        </NavLink>

        <NavLink to="/audit" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Shield size={20} />
          <span>Audit Trail</span>
        </NavLink>

        <NavLink to="/assistant" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Sparkles size={20} />
          <span>AI Assistant</span>
        </NavLink>

        <div style={{ margin: '6px 0', borderTop: '1px solid var(--border-color)', opacity: 0.3 }}></div>

        {/* South Korea Portal */}
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', margin: '6px 0 4px 12px', fontWeight: 'bold', opacity: 0.8 }}>🇰🇷 South Korea Sunshine</div>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard (Korea)</span>
        </NavLink>
        
        <NavLink to="/data" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Database size={20} />
          <span>Data Explorer</span>
        </NavLink>

        <NavLink to="/source-files" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileUp size={20} />
          <span>Source Files</span>
        </NavLink>

        <NavLink to="/remediation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <AlertCircle size={20} />
          <span>Remediation</span>
        </NavLink>

        <NavLink to="/ingestion" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <UploadCloud size={20} />
          <span>Local Ingestion</span>
        </NavLink>
        
        <NavLink to="/reporting" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileText size={20} />
          <span>MOHW Reports</span>
        </NavLink>

        <div style={{ margin: '6px 0', borderTop: '1px solid var(--border-color)', opacity: 0.3 }}></div>

        {/* Italy Portal */}
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', margin: '6px 0 4px 12px', fontWeight: 'bold', opacity: 0.8 }}>🇮🇹 Italy Sanità Trasparente</div>
        <NavLink to="/italy/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard (Italy)</span>
        </NavLink>

        <NavLink to="/italy/data" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Database size={20} />
          <span>Data Explorer</span>
        </NavLink>

        <NavLink to="/italy/source-files" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileUp size={20} />
          <span>Source Files</span>
        </NavLink>

        <NavLink to="/italy/remediation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <AlertCircle size={20} />
          <span>Remediation</span>
        </NavLink>

        <NavLink to="/italy/ingestion" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <UploadCloud size={20} />
          <span>Local Ingestion</span>
        </NavLink>

        <NavLink to="/italy/reporting" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileText size={20} />
          <span>Statutory Disclosures</span>
        </NavLink>
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={{ margin: 0 }}><strong>Version:</strong> v1.0.0 (Commercial)</p>
          <p style={{ margin: 0 }}><strong>Project:</strong> k-sunshine-act-com-2026</p>
          <p style={{ margin: 0, wordBreak: 'break-all' }}><strong>Database:</strong> k-sunshine-db (Cloud SQL)</p>
        </div>
        <button 
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '8px 0',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            textAlign: 'left'
          }}
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
