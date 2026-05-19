import { AlertCircle, CheckCircle } from 'lucide-react';

const Remediation = () => {
  return (
    <div>
      <h1 className="page-title">Data Remediation Workflow</h1>
      <p className="page-subtitle">Review flagged transactions that violate K-PIA compliance thresholds or contain data anomalies.</p>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Flagged Records Queue</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>HCP Name</th>
                <th>Issue Description</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>TX-99234</td>
                <td>Dr. Choi Min-ho</td>
                <td>Exceeds daily meal limit (₩100,000 max)</td>
                <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>₩125,000</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', padding: '6px 12px' }}><CheckCircle size={16} /> Approve Exception</button>
                    <button className="btn" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '6px 12px' }}><AlertCircle size={16} /> Reject</button>
                  </div>
                </td>
              </tr>
              <tr>
                <td>TX-99281</td>
                <td>Unknown HCP</td>
                <td>Missing valid Medical License Number</td>
                <td>₩450,000</td>
                <td>
                  <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Enrich Data</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Remediation;
