const Dashboard = () => {
  return (
    <div>
      <h1 className="page-title">Compliance Overview</h1>
      <p className="page-subtitle">High-level summary of South Korean spend data and remediation status.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
        <div className="card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Total YTD Spend (KRW)</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-glow)' }}>₩450,200,000</div>
        </div>
        <div className="card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Pending Remediation</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>12 Records</div>
        </div>
        <div className="card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Reporting Status</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>On Track</div>
            <span className="badge badge-success">Ready</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Recent Activity</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>HCP Name</th>
                <th>Institution</th>
                <th>Activity Type</th>
                <th>Amount (KRW)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Dr. Kim Ji-hoon</td>
                <td>Seoul National University Hospital</td>
                <td>Consulting Fee</td>
                <td>₩1,500,000</td>
                <td><span className="badge badge-success">Approved</span></td>
              </tr>
              <tr>
                <td>Dr. Lee Seo-yeon</td>
                <td>Asan Medical Center</td>
                <td>Meal & Beverage</td>
                <td>₩50,000</td>
                <td><span className="badge badge-success">Approved</span></td>
              </tr>
              <tr>
                <td>Park Min-jun</td>
                <td>Samsung Medical Center</td>
                <td>Travel Sponsorship</td>
                <td>₩850,000</td>
                <td><span className="badge badge-warning">Review</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
