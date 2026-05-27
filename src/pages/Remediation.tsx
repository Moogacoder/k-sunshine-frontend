import { useState, useEffect } from 'react';
import { CheckCircle, Sparkles, Loader2, X, AlertTriangle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { APIGateway } from '../datacenter/api_gateway';
import type { UniversalTransaction } from '../datacenter/api_gateway';
import { validateReportingCompleteness } from '../datacenter/validation';

interface RemediationFlag {
  id: string;
  status: string;
  reason: string;
  createdAt: string;
  rawTransaction: UniversalTransaction;
  transaction: {
    id: string;
    amountOriginal: number;
    currency: string;
    entity: {
      recipientName: string;
    }
  }
}

const Remediation = () => {
  const location = useLocation();
  const isItaly = location.pathname.includes('/italy');
  const isColombia = location.pathname.includes('/colombia');
  const countryCode = isColombia ? 'CO' : (isItaly ? 'IT' : 'KR');

  const [flags, setFlags] = useState<RemediationFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // AI Explainer Panel states
  const [selectedFlag, setSelectedFlag] = useState<RemediationFlag | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiSuggestedFix, setAiSuggestedFix] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchFlags();
    setSelectedFlag(null);
    setAiExplanation('');
    setAiSuggestedFix({});
  }, [location.pathname]);

  const fetchFlags = async () => {
    try {
      setIsLoading(true);
      const allSpend = await APIGateway.getTransactions('GLOBAL');
      const flaggedTransactions = allSpend.filter(t => t.countryCode === countryCode && (t.remediationStatus === 'PENDING_REVIEW' || t.remediationStatus === 'RESOLVED' || t.remediationStatus === 'REJECTED'));
      
      const mappedFlags = flaggedTransactions.map(t => {
        const completeness = validateReportingCompleteness(t.countryCode, t);
        const limitExceeded = 
          (t.countryCode === 'KR' && t.amountOriginal > 500000) ||
          ((t.countryCode === 'FR' || t.countryCode === 'IT') && t.amountOriginal > 150) ||
          (t.countryCode === 'CO' && t.amountOriginal > 1500000) ||
          (t.countryCode === 'US' && t.amountOriginal > 500);

        const issues = [];
        if (limitExceeded) {
          const limitVal = t.countryCode === 'KR' ? '₩500,000' : t.countryCode === 'CO' ? '$1,500,000 COP' : t.countryCode === 'US' ? '$500' : '€150';
          issues.push(`Statutory Policy Threshold Exceeded (${limitVal})`);
        }
        if (!completeness.isComplete) {
          issues.push(`Missing required fields: ${completeness.missingFields.join(', ')}`);
        }
        const reason = issues.join(' | ') || 'Advisory Panel Board Session - Pending Fair Market Value (FMV) verification';

        return {
          id: `FLAG-${t.id}`,
          status: t.remediationStatus === 'PENDING_REVIEW' ? 'PENDING' : t.remediationStatus,
          reason,
          createdAt: t.dateOfProvision,
          rawTransaction: t,
          transaction: {
            id: t.id,
            amountOriginal: t.amountOriginal,
            currency: t.currencyOriginal,
            entity: {
              recipientName: t.recipientName
            }
          }
        };
      });
      setFlags(mappedFlags);
    } catch (err) {
      console.error("Failed to fetch remediation flags:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (id: string, status: 'RESOLVED' | 'REJECTED') => {
    setIsProcessing(id);
    try {
      const txId = id.replace('FLAG-', '');
      const success = await APIGateway.updateTransactionStatus(txId, status);
      if (success) {
        setFlags(prev => prev.map(f => f.id === id ? { ...f, status } : f));
        if (selectedFlag?.id === id) {
          setSelectedFlag(prev => prev ? { ...prev, status } : null);
        }
      }
    } catch (err) {
      console.error(`Failed to mark flag as ${status}:`, err);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleOpenAiExplainer = async (flag: RemediationFlag) => {
    setSelectedFlag(flag);
    setIsAiLoading(true);
    setAiExplanation('');
    setAiSuggestedFix({});

    try {
      const res = await APIGateway.explainViolation(flag.rawTransaction);
      setAiExplanation(res.explanation);
      setAiSuggestedFix(res.suggestedFix || {});
    } catch (err) {
      console.error("Failed to fetch AI explanation:", err);
      setAiExplanation("Failed to query the regulatory intelligence service. Under regional limits, all value transfers must comply with statutory meal caps and document requirements.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyAiFix = async () => {
    if (!selectedFlag) return;
    setIsAiLoading(true);
    try {
      const txId = selectedFlag.transaction.id;
      
      // Map suggested fields back onto universal structure
      const updatedFields: Partial<UniversalTransaction> = {};
      if (aiSuggestedFix.spendCategory) updatedFields.spendCategory = aiSuggestedFix.spendCategory;
      if (aiSuggestedFix.details) updatedFields.details = aiSuggestedFix.details;
      if (aiSuggestedFix.recipientName) updatedFields.recipientName = aiSuggestedFix.recipientName;
      if (aiSuggestedFix.amountOriginal) updatedFields.amountOriginal = Number(aiSuggestedFix.amountOriginal);

      // Call staging update
      const success = await APIGateway.updateTransaction(txId, updatedFields);
      if (success) {
        // Automatically approve the staging item as it's now fully resolved
        await APIGateway.updateTransactionStatus(txId, 'RESOLVED');
        
        // Refresh local queues
        await fetchFlags();
        setSelectedFlag(null);
        alert("Compliance correction applied! Transaction updated and marked as Approved.");
      } else {
        alert("Failed to apply transaction edits to the staging database.");
      }
    } catch (err) {
      console.error("Error applying AI correction:", err);
      alert("Failed to execute data corrections.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      
      {/* Flagged Records List */}
      <div style={{ flex: 1 }}>
        <h1 className="page-title">Data Remediation Workflow ({isColombia ? 'Colombia' : (isItaly ? 'Italy' : 'South Korea')})</h1>
        <p className="page-subtitle">Review flagged transactions that violate local {isColombia ? 'Colombia Resolution 2881' : (isItaly ? 'Italy Sanità Trasparente Law 31/2022' : 'K-Sunshine Act')} compliance thresholds or contain data anomalies.</p>

        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Flagged Records Queue</h3>
          
          {isLoading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading flagged records...</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date Flagged</th>
                    <th>HCP Name</th>
                    <th>Issue Description</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flags.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>No flagged records found.</td>
                    </tr>
                  ) : (
                    flags.map(flag => (
                      <tr 
                        key={flag.id} 
                        style={{ 
                          cursor: 'pointer',
                          background: selectedFlag?.id === flag.id ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                          transition: 'background 0.2s ease'
                        }}
                        onClick={() => handleOpenAiExplainer(flag)}
                      >
                        <td>{new Date(flag.createdAt).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 500 }}>{flag.transaction.entity.recipientName}</td>
                        <td style={{ color: flag.status === 'PENDING' ? 'var(--danger)' : 'inherit' }}>{flag.reason}</td>
                        <td style={{ fontWeight: 500 }}>
                          {flag.transaction.currency} {flag.transaction.amountOriginal.toLocaleString(undefined, { minimumFractionDigits: flag.transaction.currency === 'KRW' ? 0 : 2 })}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {flag.status === 'PENDING' ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn"
                                onClick={() => handleOpenAiExplainer(flag)}
                                style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--primary-glow)', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Sparkles size={14} /> AI Assist
                              </button>
                              <button 
                                className="btn" 
                                onClick={() => handleResolve(flag.id, 'RESOLVED')}
                                disabled={isProcessing === flag.id}
                                style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', padding: '6px 12px' }}
                              >
                                <CheckCircle size={16} /> Approve
                              </button>
                            </div>
                          ) : (
                            <span className={`badge ${flag.status === 'RESOLVED' ? 'badge-success' : 'badge-danger'}`}>
                              {flag.status === 'RESOLVED' ? 'Resolved (Approved)' : 'Rejected'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Slide-out AI Compliance Explainer Drawer */}
      {selectedFlag && (
        <div className="card animate-scale-up" style={{ 
          width: '420px', 
          border: '1px solid var(--border-color)', 
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(12px)',
          position: 'sticky', 
          top: '20px',
          padding: 0,
          overflow: 'hidden'
        }}>
          
          {/* Explainer Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', background: 'var(--bg-main)' }}>
            <Sparkles size={20} color="var(--primary-glow)" style={{ marginRight: '8px' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>AI Compliance Explainer</h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>ID: {selectedFlag.transaction.id}</span>
            </div>
            <button 
              onClick={() => setSelectedFlag(null)} 
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Explainer Body */}
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '75vh', overflowY: 'auto' }}>
            
            {/* Metadata Summary */}
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><strong>Recipient:</strong> <span style={{ color: 'var(--text-primary)' }}>{selectedFlag.rawTransaction.recipientName}</span></div>
                <div><strong>License:</strong> <span style={{ color: 'var(--text-primary)' }}>{selectedFlag.rawTransaction.licenseNumber}</span></div>
                <div><strong>Category:</strong> <span style={{ color: 'var(--text-primary)' }}>{selectedFlag.rawTransaction.spendCategory}</span></div>
                <div><strong>Amount:</strong> <span style={{ color: 'var(--text-primary)' }}>{selectedFlag.transaction.currency} {selectedFlag.transaction.amountOriginal.toLocaleString()}</span></div>
              </div>
            </div>

            {isAiLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px', gap: '12px' }}>
                <Loader2 size={32} color="var(--primary-accent)" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Analyzing local regulatory statutes...</span>
              </div>
            ) : (
              <>
                {/* AI Explanation Text */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.05em' }}>Statutory Rule Evaluation</h4>
                  <div 
                    style={{ fontSize: '0.88rem', lineHeight: '1.5', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    dangerouslySetInnerHTML={{ __html: aiExplanation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                  />
                </div>

                {/* AI Proposed Corrections Diff Grid */}
                {Object.keys(aiSuggestedFix).length > 0 && selectedFlag.status === 'PENDING' && (
                  <div>
                    <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={14} color="var(--warning)" /> AI Suggested Resolution Diff
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Object.keys(aiSuggestedFix).map(fieldKey => {
                        const originalValue = selectedFlag.rawTransaction[fieldKey as keyof UniversalTransaction];
                        const suggestedValue = aiSuggestedFix[fieldKey];
                        
                        if (String(originalValue) === String(suggestedValue)) return null;

                        return (
                          <div key={fieldKey} style={{ fontSize: '0.82rem', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--primary-glow)', textTransform: 'capitalize', marginBottom: '4px' }}>{fieldKey.replace('Original', ' Original')}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>- {String(originalValue)}</div>
                              <div style={{ color: 'var(--success)', fontWeight: 500 }}>+ {String(suggestedValue)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Explainer Footer */}
          {selectedFlag.status === 'PENDING' && !isAiLoading && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', background: 'var(--bg-main)' }}>
              {Object.keys(aiSuggestedFix).length > 0 ? (
                <button 
                  className="btn btn-primary" 
                  onClick={handleApplyAiFix}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Sparkles size={16} /> Apply AI Resolution
                </button>
              ) : (
                <button 
                  className="btn" 
                  onClick={() => handleResolve(selectedFlag.id, 'RESOLVED')}
                  style={{ flex: 1, background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}
                >
                  <CheckCircle size={16} /> Approve Record
                </button>
              )}
              <button 
                className="btn btn-secondary"
                onClick={() => setSelectedFlag(null)}
                style={{ border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default Remediation;
