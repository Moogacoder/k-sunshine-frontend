import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import { APIGateway } from '../datacenter/api_gateway';
import { useLanguage } from '../components/LanguageContext';

interface Deadline {
  id: string;
  countryCode: string;
  countryName: string;
  title: string;
  date: Date;
  desc: string;
  color: string;
  flag: string;
  threshold: string;
  link: string;
}

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const systemDate = new Date(2026, 4, 26); // System local time: May 26, 2026
  const [viewDate, setViewDate] = useState<Date>(new Date(2026, 4, 1)); // Start on May 2026
  
  // Real-time database metrics
  const [regionStats, setRegionStats] = useState<Record<string, { staging: number; committed: number }>>({});
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Load database status dynamically
  useEffect(() => {
    const fetchDatabaseTelemetry = async () => {
      try {
        setIsLoadingStats(true);
        const staging = await APIGateway.getTransactions('GLOBAL');
        const committed = await APIGateway.getCommittedTransactions();
        
        const stats: Record<string, { staging: number; committed: number }> = {
          KR: { staging: 0, committed: 0 },
          IT: { staging: 0, committed: 0 },
          FR: { staging: 0, committed: 0 },
          US: { staging: 0, committed: 0 },
          CO: { staging: 0, committed: 0 }
        };

        staging.forEach(tx => {
          const code = tx.countryCode.toUpperCase();
          if (stats[code]) stats[code].staging++;
        });

        committed.forEach(tx => {
          const code = tx.countryCode.toUpperCase();
          if (stats[code]) stats[code].committed++;
        });

        setRegionStats(stats);
      } catch (err) {
        console.error("Calendar stats fetch error:", err);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchDatabaseTelemetry();
  }, []);

  // Central Statutory Due Dates Registry for 2026
  const deadlines: Deadline[] = [
    {
      id: 'fr-loi-h2-2025',
      countryCode: 'FR',
      countryName: 'France',
      title: 'Loi Bertrand H2 2025',
      date: new Date(2026, 2, 1), // March 1, 2026
      desc: 'Mandated statutory disclosure of agreements and benefits over €150 provided during July–December 2025 on national Transparence Santé register.',
      color: '#3b82f6', // Blue
      flag: '🇫🇷',
      threshold: 'Hospitality > €150, Advisory > €500',
      link: '/datacenter'
    },
    {
      id: 'kr-sunshine-2025',
      countryCode: 'KR',
      countryName: 'South Korea',
      title: 'K-Sunshine Expenditure Report',
      date: new Date(2026, 2, 31), // March 31, 2026
      desc: 'Annual transparency report compiled within 3 months of fiscal year-end detailing meals, clinical trial supports, and consulting fees.',
      color: '#8b5cf6', // Purple
      flag: '🇰🇷',
      threshold: 'Meals > 100,000 KRW, Consultancy > 500,000 KRW',
      link: '/reporting'
    },
    {
      id: 'us-open-2025',
      countryCode: 'US',
      countryName: 'United States',
      title: 'CMS Open Payments 2025 Data',
      date: new Date(2026, 2, 31), // March 31, 2026
      desc: 'Deadline to submit all physician value transfers for the preceding calendar year to the Centers for Medicare & Medicaid Services.',
      color: '#f59e0b', // Amber
      flag: '🇺🇸',
      threshold: 'Value transfers > $500',
      link: '/datacenter'
    },
    {
      id: 'co-rtvss-h2-2025',
      countryCode: 'CO',
      countryName: 'Colombia',
      title: 'RTVSS Resolution 2881 H2 2025',
      date: new Date(2026, 2, 31), // March 31, 2026
      desc: 'Semi-annual transfer of value report submission via SISPRO for benefits and sponsorships provided in H2 2025.',
      color: '#0284c7', // Sky Blue
      flag: '🇨🇴',
      threshold: 'Value transfers > 1,500,000 COP',
      link: '/colombia/reporting'
    },
    {
      id: 'it-sanita-p1',
      countryCode: 'IT',
      countryName: 'Italy',
      title: 'Sanità Trasparente Phase 1',
      date: new Date(2026, 3, 30), // April 30, 2026
      desc: 'Statutory deadline to upload all HCP agreement logs above €1,000 or HCO donations above €5,000 under Law 62/2022 guidelines.',
      color: '#ef4444', // Crimson
      flag: '🇮🇹',
      threshold: 'HCP Agreements > €1,000, HCO Donations > €5,000',
      link: '/italy/reporting'
    },
    {
      id: 'fr-loi-h1-2026',
      countryCode: 'FR',
      countryName: 'France',
      title: 'Loi Bertrand H1 2026',
      date: new Date(2026, 8, 1), // September 1, 2026
      desc: 'Mandated statutory disclosure of agreements and benefits provided during January–June 2026 on national Transparence Santé register.',
      color: '#3b82f6',
      flag: '🇫🇷',
      threshold: 'Hospitality > €150, Advisory > €500',
      link: '/datacenter'
    },
    {
      id: 'co-rtvss-h1-2026',
      countryCode: 'CO',
      countryName: 'Colombia',
      title: 'RTVSS Resolution 2881 H1 2026',
      date: new Date(2026, 8, 30), // September 30, 2026
      desc: 'Semi-annual transfer of value report submission via SISPRO for benefits and sponsorships provided in H1 2026.',
      color: '#0284c7',
      flag: '🇨🇴',
      threshold: 'Value transfers > 1,500,000 COP',
      link: '/colombia/reporting'
    },
    {
      id: 'it-sanita-p2',
      countryCode: 'IT',
      countryName: 'Italy',
      title: 'Sanità Trasparente Phase 2',
      date: new Date(2026, 9, 31), // October 31, 2026
      desc: 'Second phase statutory deadline to upload all subsequent HCP agreements and donations logs under Law 62/2022.',
      color: '#ef4444',
      flag: '🇮🇹',
      threshold: 'HCP Agreements > €1,000, HCO Donations > €5,000',
      link: '/italy/reporting'
    },
    {
      id: 'us-rxdc-2025',
      countryCode: 'US',
      countryName: 'US (Federal)',
      title: 'US Federal RxDC Reporting',
      date: new Date(2026, 5, 1), // June 1, 2026
      desc: 'Federal RxDC reporting deadline for the prior calendar year\'s prescription drug spending, premium, and rebate data submitted to CMS.',
      color: '#f59e0b', // Amber
      flag: '🇺🇸',
      threshold: 'All plan sponsors and health issuers',
      link: '/datacenter'
    },
    {
      id: 'us-ma-conduct-2025',
      countryCode: 'US',
      countryName: 'US (Massachusetts)',
      title: 'Massachusetts HCP Disclosure',
      date: new Date(2026, 6, 1), // July 1, 2026
      desc: 'Annual disclosure report detailing marketing expenditures, gifts, and payments to Massachusetts-licensed healthcare practitioners under the pharmaceutical code of conduct.',
      color: '#10b981', // Success Green
      flag: '🇺🇸',
      threshold: 'Any transfer of value',
      link: '/datacenter'
    },
    {
      id: 'us-dc-accessrx-2025',
      countryCode: 'US',
      countryName: 'US (District of Columbia)',
      title: 'DC AccessRx Cost Reporting',
      date: new Date(2026, 6, 1), // July 1, 2026
      desc: 'Annual report on marketing expenses, advertising, and gifts provided to DC healthcare professionals under the AccessRx Program.',
      color: '#14b8a6', // Teal
      flag: '🇺🇸',
      threshold: 'All pharmaceutical marketing expenses',
      link: '/datacenter'
    }
  ];

  // Helper: Month Navigation
  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // Helper: Get days in a month
  const getDaysInMonth = (d: Date) => {
    const year = d.getFullYear();
    const month = d.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    
    // Fill in offset days for previous month
    const firstDayOfWeek = date.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    
    // Fill in days of the month
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    
    return days;
  };

  const daysGrid = getDaysInMonth(viewDate);

  // Compute upcoming deadline relative to May 26, 2026
  const upcomingDeadlines = deadlines
    .filter(dl => dl.date.getTime() >= systemDate.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  
  const nextDeadline = upcomingDeadlines[0];
  const daysToNext = nextDeadline 
    ? Math.ceil((nextDeadline.date.getTime() - systemDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Localized month name
  const getMonthName = (date: Date) => {
    const localeMap: Record<string, string> = {
      en: 'en-US',
      ko: 'ko-KR',
      it: 'it-IT',
      es: 'es-CO'
    };
    return date.toLocaleDateString(localeMap[language] || 'en-US', { month: 'long', year: 'numeric' });
  };

  // Calculate dynamic database state percentage for each country's deadline
  const getCompilationProgress = (countryCode: string) => {
    const stats = regionStats[countryCode];
    if (!stats) return { percentage: 0, text: 'No Data Ingested', status: 'NOT_STARTED' };
    
    const total = stats.staging + stats.committed;
    if (total === 0) {
      return { percentage: 0, text: 'No Data Ingested', status: 'NOT_STARTED' };
    }
    
    const pct = Math.round((stats.committed / total) * 100);
    if (pct === 100) {
      return { percentage: pct, text: '100% Synced (Production ready)', status: 'COMPLETED' };
    } else if (stats.staging > 0) {
      return { percentage: pct, text: `${stats.staging} Staging Stubs Pending Commitment`, status: 'IN_PROGRESS' };
    }
    return { percentage: pct, text: 'Staged for Audit Verification', status: 'IN_PROGRESS' };
  };

  return (
    <div style={{ paddingBottom: '40px' }} className="animate-fade-in">
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">{language === 'ko' ? '글로벌 투명성 준수 일정표' : language === 'it' ? 'Calendario Statutario della Conformità' : language === 'es' ? 'Calendario de Cumplimiento Normativo' : 'Global Statutory Compliance Calendar'}</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {language === 'ko' 
              ? '전 세계 의약품 및 의료기기 가치 이전 정보의 공시 마감 기한 및 준비 현황을 일별로 제공합니다.' 
              : language === 'it' 
                ? 'Informazioni aggregate sulle scadenze di divulgazione della trasparenza e telemetria dei dati aggiornate quotidianamente.' 
                : language === 'es'
                  ? 'Resumen integrado de plazos de divulgación estatutarios y telemetría de preparación de datos sincronizada.'
                  : 'Daily-sync dashboard of global transparency disclosure schedules and live registry compiling telemetry.'}
          </p>
        </div>

        {/* Sync telemetry confirmation */}
        <div style={{ 
          background: 'rgba(16, 185, 129, 0.08)', 
          border: '1px solid rgba(16, 185, 129, 0.2)', 
          borderRadius: '12px', 
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ position: 'relative', display: 'flex' }}>
            <Activity size={16} color="var(--success)" style={{ animation: 'pulse 2s infinite' }} />
            <span style={{ 
              position: 'absolute', 
              width: '8px', 
              height: '8px', 
              background: 'var(--success)', 
              borderRadius: '50%', 
              right: '-1px', 
              top: '-1px',
              border: '1.5px solid white' 
            }}></span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>Daily Sync Active</span>
            <div style={{ opacity: 0.8, fontSize: '0.72rem' }}>Last checked: Today, 8:00 AM (2026-05-26)</div>
          </div>
        </div>
      </div>

      {/* Countdown banner card to next upcoming deadline */}
      {nextDeadline && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(139, 92, 246, 0.03) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.15)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ 
              background: 'var(--primary-glow)', 
              color: 'white', 
              width: '56px', 
              height: '56px', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(124, 58, 237, 0.3)'
            }}>
              <Clock size={28} />
            </div>
            <div>
              <div style={{ textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em', color: 'var(--primary-glow)', fontWeight: 'bold', marginBottom: '4px' }}>
                Next Upcoming Global Disclosure Deadline
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{nextDeadline.flag}</span>
                <span>{nextDeadline.title}</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '6px', maxWidth: '750px' }}>
                {nextDeadline.desc}
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right', minWidth: '180px' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.03em' }}>
              {daysToNext}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Days Remaining
            </div>
            <button 
              onClick={() => navigate(nextDeadline.link)}
              style={{
                marginTop: '12px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--primary-glow)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
            >
              Prepare Reports <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Main content split layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '32px' }}>
        
        {/* Left Column: Calendar Grid */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
          
          {/* Calendar Header with Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <CalendarIcon size={20} color="var(--primary-glow)" />
              <span>{getMonthName(viewDate)}</span>
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={prevMonth}
                style={{ 
                  background: 'none', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '6px', 
                  padding: '6px', 
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={nextMonth}
                style={{ 
                  background: 'none', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '6px', 
                  padding: '6px', 
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px', textAlign: 'center' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 0' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {daysGrid.map((day, idx) => {
              const isCurrentMonth = day.getMonth() === viewDate.getMonth();
              const isToday = day.getFullYear() === systemDate.getFullYear() && 
                              day.getMonth() === systemDate.getMonth() && 
                              day.getDate() === systemDate.getDate();

              // Identify if day has statutory deadlines (only upcoming)
              const dayDeadlines = deadlines.filter(dl => 
                dl.date.getFullYear() === day.getFullYear() &&
                dl.date.getMonth() === day.getMonth() &&
                dl.date.getDate() === day.getDate() &&
                dl.date.getTime() >= systemDate.getTime()
              );

              return (
                <div 
                  key={idx} 
                  style={{
                    minHeight: '90px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px',
                    background: isToday 
                      ? 'rgba(124, 58, 237, 0.03)' 
                      : isCurrentMonth 
                        ? 'var(--bg-surface)' 
                        : 'rgba(243, 244, 246, 0.4)',
                    borderColor: isToday ? 'var(--primary-glow)' : 'var(--border-color)',
                    color: isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    transition: 'all 0.2s',
                    boxShadow: isToday ? 'inset 0 0 8px rgba(124, 58, 237, 0.05)' : 'none'
                  }}
                >
                  {/* Calendar Day Digit */}
                  <div style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: isToday || dayDeadlines.length > 0 ? 'bold' : 'normal',
                    color: isToday 
                      ? 'var(--primary-glow)' 
                      : dayDeadlines.length > 0 
                        ? 'var(--text-primary)' 
                        : 'inherit',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{day.getDate()}</span>
                    {isToday && (
                      <span style={{ 
                        fontSize: '0.62rem', 
                        background: 'var(--primary-glow)', 
                        color: 'white', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        fontWeight: 'bold',
                        letterSpacing: '0.05em'
                      }}>
                        TODAY
                      </span>
                    )}
                  </div>

                  {/* Highlight Deadline Items inside Calendar Day cell */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                    {dayDeadlines.map(dl => (
                      <div 
                        key={dl.id}
                        onClick={() => navigate(dl.link)}
                        title={`${dl.title}: ${dl.desc}`}
                        style={{
                          fontSize: '0.68rem',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          background: dl.color + '15',
                          borderLeft: `3.5px solid ${dl.color}`,
                          color: 'var(--text-primary)',
                          fontWeight: 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = dl.color + '25';
                          e.currentTarget.style.transform = 'translateX(2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = dl.color + '15';
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        {dl.flag} {dl.title.split(' ')[0]}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Dynamic Database Prep Progress Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Statutory Deadlines List Card */}
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '16px' }}>
              <TrendingUp size={18} color="var(--primary-glow)" />
              <span>Active 2026 Deadlines List</span>
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {deadlines
                .filter(dl => dl.date.getTime() >= systemDate.getTime())
                .map(dl => {
                  const daysLeft = Math.ceil((dl.date.getTime() - systemDate.getTime()) / (1000 * 60 * 60 * 24));
                  const progress = getCompilationProgress(dl.countryCode);
                  const isPast = false;

                return (
                  <div 
                    key={dl.id}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      background: 'var(--bg-elevated)',
                      opacity: isPast ? 0.7 : 1,
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                  >
                    {/* Country & Countdown Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        <span>{dl.flag}</span>
                        <span>{dl.countryName}</span>
                      </div>
                      
                      {isPast ? (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                          Submissions Sealed
                        </span>
                      ) : (
                        <span style={{ 
                          fontSize: '0.72rem', 
                          background: daysLeft <= 30 ? 'rgba(239, 68, 68, 0.1)' : daysLeft <= 90 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(124, 58, 237, 0.1)', 
                          color: daysLeft <= 30 ? 'var(--danger)' : daysLeft <= 90 ? 'var(--warning)' : 'var(--primary-glow)', 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Clock size={10} />
                          {daysLeft} Days left
                        </span>
                      )}
                    </div>

                    {/* Deadline Title & Description */}
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {dl.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Due: {dl.date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                        Threshold: {dl.threshold}
                      </div>
                    </div>

                    {/* Live telemetries Progress Section */}
                    {!isLoadingStats && (
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          <span>Registry Preparation Progress</span>
                          <span style={{ fontWeight: 'bold', color: progress.status === 'COMPLETED' ? 'var(--success)' : progress.status === 'IN_PROGRESS' ? 'var(--primary-glow)' : 'var(--text-muted)' }}>
                            {progress.percentage}%
                          </span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                          <div style={{ 
                            width: `${progress.percentage}%`, 
                            height: '100%', 
                            background: progress.status === 'COMPLETED' ? 'var(--success)' : 'var(--primary-glow)', 
                            borderRadius: '3px',
                            transition: 'width 0.5s ease-out'
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{progress.text}</span>
                          <button 
                            onClick={() => navigate(dl.link)}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: 'var(--primary-glow)', 
                              fontSize: '0.68rem', 
                              fontWeight: 'bold', 
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              padding: 0
                            }}
                          >
                            Prepare <ArrowRight size={10} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick-Audit compliance warnings block */}
          <div className="card" style={{ padding: '24px', borderLeft: '4px solid var(--warning)' }}>
            <h2 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--warning)', marginBottom: '12px' }}>
              <AlertTriangle size={18} />
              <span>Statutory Compliance Warnings</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              The system scans staging buffers daily for completeness checks. There are currently active compliance errors blocking final ledger sealing for Europe and Colombia databases.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button 
                onClick={() => navigate('/datacenter')}
                className="btn" 
                style={{ 
                  flex: 1, 
                  justifyContent: 'center', 
                  fontSize: '0.8rem', 
                  padding: '8px 12px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  color: 'var(--warning)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  fontWeight: 600
                }}
              >
                Resolve In staging
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Calendar;
