import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { APIGateway } from '../datacenter/api_gateway';

interface RemediationFlag {
  id: string;
  status: string;
  reason: string;
  createdAt: string;
  transaction: {
    id: string;
    amountKRW: number;
    currency: string;
    entity: {
      recipientName: string;
    }
  }
}

const Remediation = () => {
  const [flags, setFlags] = useState<RemediationFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      const krSpend = APIGateway.getTransactions('KR');
      const flaggedTransactions = krSpend.filter(t => t.remediationStatus === 'PENDING_REVIEW' || t.remediationStatus === 'RESOLVED' || t.remediationStatus === 'REJECTED');
      
      const mappedFlags = flaggedTransactions.map(t => ({
        id: `FLAG-${t.id}`,
        status: t.remediationStatus === 'PENDING_REVIEW' ? 'PENDING' : t.remediationStatus,
        reason: t.amountOriginal > 500000 
          ? 'Exceeds South Korean individual spend limit policy threshold (₩500,000)'
          : 'Advisory Panel Board Session - Pending Fair Market Value (FMV) assessment verification',
        createdAt: t.dateOfProvision,
        transaction: {
          id: t.id,
          amountKRW: t.amountOriginal,
          currency: t.currencyOriginal,
          entity: {
            recipientName: t.recipientName
          }
        }
      }));
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
      const success = APIGateway.updateTransactionStatus(txId, status);
      if (success) {
        setFlags(prev => prev.map(f => f.id === id ? { ...f, status } : f));
      }
    } catch (err) {
      console.error(`Failed to mark flag as ${status}:`, err);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div>
      <h1 className="page-title">Data Remediation Workflow</h1>
      <p className="page-subtitle">Review flagged transactions that violate K-PIA compliance thresholds or contain data anomalies.</p>

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
                  <th>Status / Actions</th>
                </tr>
              </thead>
              <tbody>
                {flags.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>No flagged records found.</td>
                  </tr>
                ) : (
                  flags.map(flag => (
                    <tr key={flag.id}>
                      <td>{new Date(flag.createdAt).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 500 }}>{flag.transaction.entity.recipientName}</td>
                      <td style={{ color: flag.status === 'PENDING' ? 'var(--danger)' : 'inherit' }}>{flag.reason}</td>
                      <td style={{ fontWeight: 500 }}>₩{flag.transaction.amountKRW.toLocaleString()}</td>
                      <td>
                        {flag.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn" 
                              onClick={() => handleResolve(flag.id, 'RESOLVED')}
                              disabled={isProcessing === flag.id}
                              style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', padding: '6px 12px' }}
                            >
                              <CheckCircle size={16} /> Approve
                            </button>
                            <button 
                              className="btn" 
                              onClick={() => handleResolve(flag.id, 'REJECTED')}
                              disabled={isProcessing === flag.id}
                              style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '6px 12px' }}
                            >
                              <AlertCircle size={16} /> Reject
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
  );
};

export default Remediation;
