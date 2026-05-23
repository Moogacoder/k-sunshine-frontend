import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { APIGateway } from '../datacenter/api_gateway';

interface Transaction {
  id: string;
  categoryOfBenefit: string;
  dateOfProvision: string;
  amountKRW: number;
  entity: {
    recipientName: string;
    workplaceInstitution: string;
  }
}

interface RemediationFlag {
  id: string;
  status: string;
  transactionId: string;
}

const Dashboard = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [remediationFlags, setRemediationFlags] = useState<RemediationFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      try {
        // Query the Central Data Center's South Korea stream feeds
        const krSpend = APIGateway.getTransactions('KR');
        
        // Map central spend items back onto South Korea local dashboard columns
        const mappedTx = krSpend.map(t => ({
          id: t.id,
          categoryOfBenefit: t.spendCategory,
          dateOfProvision: t.dateOfProvision,
          amountKRW: t.amountOriginal,
          entity: {
            recipientName: t.recipientName,
            workplaceInstitution: t.workplaceInstitution
          }
        }));

        const mockFlags = krSpend.map(t => ({
          id: `FLAG-${t.id}`,
          status: t.remediationStatus === 'PENDING_REVIEW' ? 'PENDING' : 'RESOLVED',
          transactionId: t.id
        }));

        setTransactions(mappedTx);
        setRemediationFlags(mockFlags);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute Total YTD Spend
  const currentYear = new Date().getFullYear();
  const ytdSpend = transactions
    .filter(t => new Date(t.dateOfProvision).getFullYear() === currentYear)
    .reduce((sum, t) => sum + t.amountKRW, 0);

  // Compute Pending Remediation
  const pendingCount = remediationFlags.filter(f => f.status === 'PENDING').length;

  // Compute Category Spend for Chart
  const categoryMap: Record<string, number> = {};
  transactions.forEach(t => {
    categoryMap[t.categoryOfBenefit] = (categoryMap[t.categoryOfBenefit] || 0) + t.amountKRW;
  });
  
  const chartData = Object.keys(categoryMap).map(key => ({
    name: key,
    amount: categoryMap[key]
  })).sort((a, b) => b.amount - a.amount); // Sort descending

  const formatKRW = (value: number) => {
    if (value >= 1000000) return `₩${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `₩${(value / 1000).toFixed(0)}K`;
    return `₩${value}`;
  };

  const getStatusBadge = (txId: string) => {
    const flag = remediationFlags.find(f => f.transactionId === txId);
    if (!flag) return <span className="badge badge-success">Approved</span>;
    if (flag.status === 'PENDING') return <span className="badge badge-warning">Review</span>;
    if (flag.status === 'RESOLVED') return <span className="badge badge-success">Resolved</span>;
    return <span className="badge">Rejected</span>;
  };

  return (
    <div>
      <h1 className="page-title">Compliance Overview</h1>
      <p className="page-subtitle">High-level summary of South Korean spend data and remediation status.</p>

      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Syncing live data...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Total YTD Spend (KRW)</h3>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-glow)' }}>
                ₩{ytdSpend.toLocaleString()}
              </div>
            </div>
            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Pending Remediation</h3>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: pendingCount > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {pendingCount} Records
              </div>
            </div>
            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Reporting Status</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>On Track</div>
                <span className="badge badge-success">Ready</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            <div className="card">
              <h3 style={{ marginBottom: '20px' }}>Spend by Category</h3>
              <div style={{ height: '300px' }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <XAxis type="number" tickFormatter={formatKRW} stroke="var(--text-secondary)" fontSize={12} />
                      <YAxis dataKey="name" type="category" width={120} stroke="var(--text-secondary)" fontSize={12} tick={{fill: 'var(--text-secondary)'}} />
                      <Tooltip 
                        formatter={(value: any) => [`₩${Number(value).toLocaleString()}`, 'Amount']}
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        itemStyle={{ color: 'var(--primary-glow)' }}
                      />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--primary-glow)' : 'var(--primary-color)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    No spend data available
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '20px' }}>Recent Activity</h3>
              <div className="table-container" style={{ margin: 0 }}>
                <table style={{ margin: 0 }}>
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
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>No activity yet</td>
                      </tr>
                    ) : (
                      transactions.slice(0, 5).map(tx => (
                        <tr key={tx.id}>
                          <td style={{ fontWeight: 500 }}>{tx.entity.recipientName}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{tx.entity.workplaceInstitution || "N/A"}</td>
                          <td>{tx.categoryOfBenefit}</td>
                          <td style={{ fontWeight: 500 }}>₩{tx.amountKRW.toLocaleString()}</td>
                          <td>{getStatusBadge(tx.id)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
