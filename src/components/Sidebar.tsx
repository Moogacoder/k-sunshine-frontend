import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, AlertCircle, FileText, LogOut, Database, Shield, Sparkles, FileUp, Globe, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from './AuthContext';

const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Detect which country is currently active
  const isKoreaActive = ['/dashboard', '/data', '/source-files', '/remediation', '/ingestion', '/reporting'].includes(currentPath);
  const isItalyActive = currentPath.startsWith('/italy');
  const isColombiaActive = currentPath.startsWith('/colombia');

  // Accordion toggle states (auto-expand active portal country)
  const [isKoreaExpanded, setIsKoreaExpanded] = useState(isKoreaActive);
  const [isItalyExpanded, setIsItalyExpanded] = useState(isItalyActive);
  const [isColombiaExpanded, setIsColombiaExpanded] = useState(isColombiaActive);

  // Track the previous path to only auto-expand on actual navigation events
  const prevPathRef = useRef(currentPath);

  // Sync accordion expansion when URL changes (e.g. clicking from map marker)
  useEffect(() => {
    if (currentPath !== prevPathRef.current) {
      if (isKoreaActive) {
        setIsKoreaExpanded(true);
      }
      if (isItalyActive) {
        setIsItalyExpanded(true);
      }
      if (isColombiaActive) {
        setIsColombiaExpanded(true);
      }
      prevPathRef.current = currentPath;
    }
  }, [currentPath, isKoreaActive, isItalyActive, isColombiaActive]);

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

        {/* South Korea Portal Accordion */}
        <button
          onClick={() => setIsKoreaExpanded(!isKoreaExpanded)}
          style={{
            background: 'none',
            border: 'none',
            width: '100%',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            color: isKoreaExpanded ? 'var(--primary-accent)' : 'var(--text-secondary)',
            letterSpacing: '0.05em',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            fontFamily: 'inherit',
            borderRadius: '6px'
          }}
          className="accordion-header"
        >
          <span>🇰🇷 South Korea Sunshine</span>
          {isKoreaExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <div style={{
          maxHeight: isKoreaExpanded ? '340px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          paddingLeft: '4px'
        }}>
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
        </div>

        <div style={{ margin: '6px 0', borderTop: '1px solid var(--border-color)', opacity: 0.3 }}></div>

        {/* Italy Portal Accordion */}
        <button
          onClick={() => setIsItalyExpanded(!isItalyExpanded)}
          style={{
            background: 'none',
            border: 'none',
            width: '100%',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            color: isItalyExpanded ? 'var(--primary-accent)' : 'var(--text-secondary)',
            letterSpacing: '0.05em',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            fontFamily: 'inherit',
            borderRadius: '6px'
          }}
          className="accordion-header"
        >
          <span>🇮🇹 Italy Sanità Trasparente</span>
          {isItalyExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <div style={{
          maxHeight: isItalyExpanded ? '340px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          paddingLeft: '4px'
        }}>
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
        </div>

        <div style={{ margin: '6px 0', borderTop: '1px solid var(--border-color)', opacity: 0.3 }}></div>

        {/* Colombia Portal Accordion */}
        <button
          onClick={() => setIsColombiaExpanded(!isColombiaExpanded)}
          style={{
            background: 'none',
            border: 'none',
            width: '100%',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            color: isColombiaExpanded ? 'var(--primary-accent)' : 'var(--text-secondary)',
            letterSpacing: '0.05em',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            fontFamily: 'inherit',
            borderRadius: '6px'
          }}
          className="accordion-header"
        >
          <span>🇨🇴 Colombia RTVSS</span>
          {isColombiaExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <div style={{
          maxHeight: isColombiaExpanded ? '340px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          paddingLeft: '4px'
        }}>
          <NavLink to="/colombia/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard (Colombia)</span>
          </NavLink>

          <NavLink to="/colombia/data" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Database size={20} />
            <span>Data Explorer</span>
          </NavLink>

          <NavLink to="/colombia/source-files" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <FileUp size={20} />
            <span>Source Files</span>
          </NavLink>

          <NavLink to="/colombia/remediation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <AlertCircle size={20} />
            <span>Remediation</span>
          </NavLink>

          <NavLink to="/colombia/ingestion" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <UploadCloud size={20} />
            <span>Local Ingestion</span>
          </NavLink>

          <NavLink to="/colombia/reporting" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <FileText size={20} />
            <span>Statutory Disclosures</span>
          </NavLink>
        </div>
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
