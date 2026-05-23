import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { APIGateway } from '../datacenter/api_gateway';

interface Transaction {
  id: string;
  categoryOfBenefit: string;
  dateOfProvision: string;
  amountEUR: number;
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

const ItalyDashboard = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [remediationFlags, setRemediationFlags] = useState<RemediationFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Query the Central Data Center's Italy stream feeds
        const itSpend = await APIGateway.getTransactions('IT');
        
        // Map central spend items back onto Italy local dashboard columns
        const mappedTx = itSpend.map(t => ({
          id: t.id,
          categoryOfBenefit: t.spendCategory,
          dateOfProvision: t.dateOfProvision,
          amountEUR: t.amountOriginal,
          entity: {
            recipientName: t.recipientName,
            workplaceInstitution: t.workplaceInstitution
          }
        }));

        const mockFlags = itSpend.map(t => ({
          id: `FLAG-${t.id}`,
          status: t.remediationStatus === 'PENDING_REVIEW' ? 'PENDING' : 'RESOLVED',
          transactionId: t.id
        }));

        setTransactions(mappedTx);
        setRemediationFlags(mockFlags);
      } catch (err) {
        console.error("Failed to fetch Italy dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute Total YTD Spend in EUR
  const currentYear = new Date().getFullYear();
  const ytdSpend = transactions
    .filter(t => new Date(t.dateOfProvision).getFullYear() === currentYear)
    .reduce((sum, t) => sum + t.amountEUR, 0);

  // Compute Pending Remediation
  const pendingCount = remediationFlags.filter(f => f.status === 'PENDING').length;

  // Compute Category Spend for Chart
  const categoryMap: Record<string, number> = {};
  transactions.forEach(t => {
    categoryMap[t.categoryOfBenefit] = (categoryMap[t.categoryOfBenefit] || 0) + t.amountEUR;
  });
  
  const chartData = Object.keys(categoryMap).map(key => ({
    name: key === 'CONVENZIONI' ? 'Conventions' : key === 'DONAZIONI' ? 'Donations' : key,
    amount: categoryMap[key]
  })).sort((a, b) => b.amount - a.amount);

  const formatEUR = (value: number) => {
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
    return `€${value}`;
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
      <h1 className="page-title">Sanità Trasparente Overview</h1>
      <p className="page-subtitle">Summary of Italian pharma transparency disclosures under Law 31/2022 (Loi Sanità Trasparente).</p>

      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Syncing live Italian records...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Total YTD Disclosures (€ EUR)</h3>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-glow)' }}>
                €{ytdSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Pending Auditor Reviews</h3>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: pendingCount > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {pendingCount} Alerts
              </div>
            </div>
            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Ministry Submission Status</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>On Track</div>
                <span className="badge badge-success">Ready</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            <div className="card">
              <h3 style={{ marginBottom: '20px' }}>Spend by Category (EUR)</h3>
              <div style={{ height: '300px' }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <XAxis type="number" tickFormatter={formatEUR} stroke="var(--text-secondary)" fontSize={12} />
                      <YAxis dataKey="name" type="category" width={100} stroke="var(--text-secondary)" fontSize={12} tick={{fill: 'var(--text-secondary)'}} />
                      <Tooltip 
                         formatter={(value: any) => [`€${Number(value).toLocaleString()}`, 'Amount']}
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
              <h3 style={{ marginBottom: '20px' }}>Recent Italian Value Transfers</h3>
              <div className="table-container" style={{ margin: 0 }}>
                <table style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Recipient Name</th>
                      <th>Workplace / Institution</th>
                      <th>Disclosure Category</th>
                      <th>Amount (EUR)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>No transfers registered yet</td>
                      </tr>
                    ) : (
                      transactions.slice(0, 5).map(tx => (
                        <tr key={tx.id}>
                          <td style={{ fontWeight: 500 }}>{tx.entity.recipientName}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{tx.entity.workplaceInstitution || "N/A"}</td>
                          <td>
                            <span className="badge" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                              {tx.categoryOfBenefit}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500 }}>€{tx.amountEUR.toLocaleString()}</td>
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

export default ItalyDashboard;
