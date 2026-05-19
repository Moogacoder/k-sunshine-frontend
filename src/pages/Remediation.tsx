import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

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
      const response = await fetch('https://k-sunshine-backend-381662135057.us-central1.run.app/api/remediation');
      if (response.ok) {
        const data = await response.json();
        setFlags(data);
      }
    } catch (err) {
      console.error("Failed to fetch remediation flags:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (id: string, status: 'RESOLVED' | 'REJECTED') => {
    setIsProcessing(id);
    try {
      const response = await fetch(`https://k-sunshine-backend-381662135057.us-central1.run.app/api/remediation/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          comments: `Manually marked as ${status} by user.`
        })
      });

      if (response.ok) {
        // Update local state to reflect the change immediately
        setFlags(flags.map(f => f.id === id ? { ...f, status } : f));
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
