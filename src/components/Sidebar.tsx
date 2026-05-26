import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, AlertCircle, FileText, LogOut, Database, Shield, Sparkles, FileUp, Globe, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import type { Language } from './translations';

const Sidebar = () => {
  const { logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
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
        setIsItalyExpanded(false);
        setIsColombiaExpanded(false);
      } else if (isItalyActive) {
        setIsKoreaExpanded(false);
        setIsItalyExpanded(true);
        setIsColombiaExpanded(false);
      } else if (isColombiaActive) {
        setIsKoreaExpanded(false);
        setIsItalyExpanded(false);
        setIsColombiaExpanded(true);
      } else {
        setIsKoreaExpanded(false);
        setIsItalyExpanded(false);
        setIsColombiaExpanded(false);
      }
      prevPathRef.current = currentPath;
    }
  }, [currentPath, isKoreaActive, isItalyActive, isColombiaActive]);

  // Unified mutual-exclusion toggle handlers
  const handleKoreaToggle = () => {
    const nextState = !isKoreaExpanded;
    setIsKoreaExpanded(nextState);
    if (nextState) {
      setIsItalyExpanded(false);
      setIsColombiaExpanded(false);
    }
  };

  const handleItalyToggle = () => {
    const nextState = !isItalyExpanded;
    setIsItalyExpanded(nextState);
    if (nextState) {
      setIsKoreaExpanded(false);
      setIsColombiaExpanded(false);
    }
  };

  const handleColombiaToggle = () => {
    const nextState = !isColombiaExpanded;
    setIsColombiaExpanded(nextState);
    if (nextState) {
      setIsKoreaExpanded(false);
      setIsItalyExpanded(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <img src="/qordata_logo.png" alt="Qordata" style={{ height: '32px', alignSelf: 'flex-start' }} />
        
        {/* Premium Language Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '12px' }}>
          <Globe size={14} style={{ color: 'var(--primary-glow)' }} />
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value as Language)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-primary)', 
              fontSize: '0.85rem', 
              fontWeight: 500, 
              outline: 'none', 
              cursor: 'pointer',
              width: '100%',
              fontFamily: 'inherit'
            }}
          >
            <option value="en" style={{ background: 'var(--bg-surface)' }}>🇺🇸 English</option>
            <option value="ko" style={{ background: 'var(--bg-surface)' }}>🇰🇷 한국어 (Korean)</option>
            <option value="it" style={{ background: 'var(--bg-surface)' }}>🇮🇹 Italiano (Italian)</option>
            <option value="es" style={{ background: 'var(--bg-surface)' }}>🇨🇴 Español (Spanish)</option>
          </select>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '20px' }}>
        {/* Administrative Control Hub */}
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', margin: '8px 0 4px 12px', fontWeight: 'bold', opacity: 0.8 }}>{t('sidebar.adminHub')}</div>
        <NavLink to="/datacenter" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ borderLeft: '3px solid var(--secondary-accent)', background: 'rgba(124, 58, 237, 0.05)', fontWeight: 'bold' }}>
          <Database size={20} color="var(--primary-glow)" />
          <span style={{ color: 'var(--primary-glow)' }}>{t('sidebar.globalDataCenter')}</span>
        </NavLink>

        <NavLink to="/global-data-status" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Globe size={20} />
          <span>{t('sidebar.globalDataStatus')}</span>
        </NavLink>

        <NavLink to="/audit" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Shield size={20} />
          <span>{t('sidebar.auditTrail')}</span>
        </NavLink>

        <NavLink to="/assistant" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Sparkles size={20} />
          <span>{t('sidebar.aiAssistant')}</span>
        </NavLink>

        <NavLink to="/calendar" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Calendar size={20} />
          <span>{t('sidebar.complianceCalendar')}</span>
        </NavLink>

        <div style={{ margin: '6px 0', borderTop: '1px solid var(--border-color)', opacity: 0.3 }}></div>

        {/* South Korea Portal Accordion */}
        <button
          onClick={handleKoreaToggle}
          style={{
            border: 'none',
            width: '100%',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
          className={`accordion-header ${isKoreaActive ? 'active' : ''}`}
        >
          <span>🇰🇷 {t('sidebar.southKorea')}</span>
          {isKoreaExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <div style={{
          display: isKoreaExpanded ? 'flex' : 'none',
          flexDirection: 'column',
          paddingLeft: '4px'
        }}>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>{t('sidebar.dashboardKorea')}</span>
          </NavLink>
          
          <NavLink to="/data" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Database size={20} />
            <span>{t('sidebar.dataExplorer')}</span>
          </NavLink>

          <NavLink to="/source-files" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <FileUp size={20} />
            <span>{t('sidebar.sourceFiles')}</span>
          </NavLink>

          <NavLink to="/remediation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <AlertCircle size={20} />
            <span>{t('sidebar.remediation')}</span>
          </NavLink>

          <NavLink to="/ingestion" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <UploadCloud size={20} />
            <span>{t('sidebar.localIngestion')}</span>
          </NavLink>
          
          <NavLink to="/reporting" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <FileText size={20} />
            <span>{t('sidebar.mohwReports')}</span>
          </NavLink>
        </div>

        <div style={{ margin: '6px 0', borderTop: '1px solid var(--border-color)', opacity: 0.3 }}></div>

        {/* Italy Portal Accordion */}
        <button
          onClick={handleItalyToggle}
          style={{
            border: 'none',
            width: '100%',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
          className={`accordion-header ${isItalyActive ? 'active' : ''}`}
        >
          <span>🇮🇹 {t('sidebar.italy')}</span>
          {isItalyExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <div style={{
          display: isItalyExpanded ? 'flex' : 'none',
          flexDirection: 'column',
          paddingLeft: '4px'
        }}>
          <NavLink to="/italy/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>{t('sidebar.dashboardItaly')}</span>
          </NavLink>

          <NavLink to="/italy/data" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Database size={20} />
            <span>{t('sidebar.dataExplorer')}</span>
          </NavLink>

          <NavLink to="/italy/source-files" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <FileUp size={20} />
            <span>{t('sidebar.sourceFiles')}</span>
          </NavLink>

          <NavLink to="/italy/remediation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <AlertCircle size={20} />
            <span>{t('sidebar.remediation')}</span>
          </NavLink>

          <NavLink to="/italy/ingestion" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <UploadCloud size={20} />
            <span>{t('sidebar.localIngestion')}</span>
          </NavLink>

          <NavLink to="/italy/reporting" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <FileText size={20} />
            <span>{t('sidebar.statutoryDisclosures')}</span>
          </NavLink>
        </div>

        <div style={{ margin: '6px 0', borderTop: '1px solid var(--border-color)', opacity: 0.3 }}></div>

        {/* Colombia Portal Accordion */}
        <button
          onClick={handleColombiaToggle}
          style={{
            border: 'none',
            width: '100%',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
          className={`accordion-header ${isColombiaActive ? 'active' : ''}`}
        >
          <span>🇨🇴 {t('sidebar.colombia')}</span>
          {isColombiaExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <div style={{
          display: isColombiaExpanded ? 'flex' : 'none',
          flexDirection: 'column',
          paddingLeft: '4px'
        }}>
          <NavLink to="/colombia/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>{t('sidebar.dashboardColombia')}</span>
          </NavLink>

          <NavLink to="/colombia/data" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Database size={20} />
            <span>{t('sidebar.dataExplorer')}</span>
          </NavLink>

          <NavLink to="/colombia/source-files" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <FileUp size={20} />
            <span>{t('sidebar.sourceFiles')}</span>
          </NavLink>

          <NavLink to="/colombia/remediation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <AlertCircle size={20} />
            <span>{t('sidebar.remediation')}</span>
          </NavLink>

          <NavLink to="/colombia/ingestion" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <UploadCloud size={20} />
            <span>{t('sidebar.localIngestion')}</span>
          </NavLink>

          <NavLink to="/colombia/reporting" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <FileText size={20} />
            <span>{t('sidebar.statutoryDisclosures')}</span>
          </NavLink>
        </div>
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={{ margin: 0 }}><strong>{t('common.version')}:</strong> v1.0.0 (Commercial)</p>
          <p style={{ margin: 0 }}><strong>{t('common.project')}:</strong> global-transparency-manager-2026</p>
          <p style={{ margin: 0, wordBreak: 'break-all' }}><strong>{t('common.database')}:</strong> global-transparency-db (Cloud SQL)</p>
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
          <LogOut size={16} /> {t('common.logout')}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
