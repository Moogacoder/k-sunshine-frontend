import React, { useState, useEffect } from 'react';
import { Shield, Clock, Database, Sparkles, Loader2 } from 'lucide-react';
import { APIGateway } from '../datacenter/api_gateway';

interface AuditLog {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  previousValues: string | null;
  newValues: string | null;
  userId: string;
  timestamp: string;
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // AI Briefing states
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const [aiBriefingContent, setAiBriefingContent] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await APIGateway.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateBriefing = async () => {
    if (aiBriefingContent) {
      setIsBriefingOpen(!isBriefingOpen);
      return;
    }

    setIsBriefingOpen(true);
    setIsBriefingLoading(true);
    try {
      const summary = await APIGateway.getAuditSummary();
      setAiBriefingContent(summary);
    } catch (err) {
      console.error("Failed to fetch AI audit briefing:", err);
      setAiBriefingContent("Failed to compile the intelligent Audit Trail executive briefing. Please verify your internet connection or check the backend services.");
    } finally {
      setIsBriefingLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedLog(expandedLog === id ? null : id);
  };

  const renderJsonDiff = (prev: string | null, next: string | null) => {
    if (!prev && !next) return null;
    
    let prevObj: any = {};
    let nextObj: any = {};
    
    try { if (prev) prevObj = JSON.parse(prev); } catch (e) {}
    try { if (next) nextObj = JSON.parse(next); } catch (e) {}

    // Get all unique keys
    const allKeys = Array.from(new Set([...Object.keys(prevObj), ...Object.keys(nextObj)]));
    
    return (
      <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '6px', fontSize: '0.85rem', overflowX: 'auto', marginTop: '12px', border: '1px solid var(--border-color)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Field</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border-color)', color: 'var(--danger)' }}>Previous Value</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border-color)', color: 'var(--success)' }}>New Value</th>
            </tr>
          </thead>
          <tbody>
            {allKeys.map(key => {
              const prevVal = prevObj[key];
              const nextVal = nextObj[key];
              const isChanged = JSON.stringify(prevVal) !== JSON.stringify(nextVal);
              
              if (!isChanged) return null;
              
              return (
                <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px', fontWeight: 500, verticalAlign: 'top' }}>{key}</td>
                  <td style={{ padding: '8px', color: 'var(--danger)', verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                    {prevVal === undefined ? <span style={{opacity: 0.5}}>-</span> : String(prevVal)}
                  </td>
                  <td style={{ padding: '8px', color: 'var(--success)', verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                    {nextVal === undefined ? <span style={{opacity: 0.5}}>-</span> : String(nextVal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <Shield size={32} color="var(--primary)" />
        <h1 className="page-title" style={{ margin: 0 }}>Global Audit Trail</h1>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <p className="page-subtitle" style={{ margin: 0 }}>Immutable, cryptographic ledger of all data mutations for KOPS compliance.</p>
        
        {/* Generate AI Briefing Button */}
        <button 
          className="btn btn-primary" 
          onClick={handleGenerateBriefing}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
        >
          <Sparkles size={16} /> 
          {isBriefingOpen ? 'Hide AI Briefing' : 'AI Executive Briefing'}
        </button>
      </div>

      {/* AI Executive Briefing collapsible panel */}
      {isBriefingOpen && (
        <div className="card animate-scale-up" style={{ 
          marginBottom: '28px', 
          border: '1px solid var(--border-color)', 
          background: 'rgba(30, 41, 59, 0.4)',
          backdropFilter: 'blur(10px)',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'flex-start', gap: '8px', marginBottom: '16px' }}>
            <Sparkles size={20} color="var(--primary-glow)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 'bold' }}>Qordata AI Audit Analysis</h3>
            {isBriefingLoading && <Loader2 size={16} color="var(--primary-accent)" style={{ animation: 'spin 1s linear infinite' }} />}
          </div>

          {isBriefingLoading ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Gemini is digesting transaction mutation logs, routed countries, and compliance update frequencies...
            </p>
          ) : (
            <div 
              style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{ 
                __html: aiBriefingContent
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/### (.*?)\n/g, '<h4 style="color:var(--primary-glow);margin-top:16px;margin-bottom:8px;font-size:0.95rem;">$1</h4>')
                  .replace(/## (.*?)\n/g, '<h3 style="color:var(--text-primary);margin-top:20px;margin-bottom:10px;font-size:1.1rem;">$1</h3>')
              }}
            />
          )}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading secure audit logs...</div>
        ) : (
          <div className="table-container" style={{ margin: 0 }}>
            <table style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Timestamp</th>
                  <th style={{ width: '120px' }}>User ID</th>
                  <th style={{ width: '120px' }}>Action</th>
                  <th>Entity Type</th>
                  <th>Record ID</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <React.Fragment key={log.id}>
                      <tr style={{ background: expandedLog === log.id ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          <Clock size={12} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 500 }}>{log.userId}</td>
                        <td>
                          <span className={`badge ${log.action === 'CREATE' ? 'badge-success' : log.action === 'UPDATE' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
                            {log.action}
                          </span>
                        </td>
                        <td>
                          <Database size={12} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle', color: 'var(--text-secondary)' }} />
                          {log.entityName}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{log.entityId}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="btn" 
                            onClick={() => toggleExpand(log.id)}
                            style={{ padding: '4px 8px', fontSize: '0.8rem', background: expandedLog === log.id ? 'var(--primary)' : 'var(--bg-main)' }}
                          >
                            {expandedLog === log.id ? 'Hide Diff' : 'View Diff'}
                          </button>
                        </td>
                      </tr>
                      {expandedLog === log.id && (
                        <tr>
                          <td colSpan={6} style={{ padding: '0 24px 24px 24px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                            {renderJsonDiff(log.previousValues, log.newValues)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
