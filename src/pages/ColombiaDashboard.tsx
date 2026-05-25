import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { APIGateway } from '../datacenter/api_gateway';

interface Transaction {
  id: string;
  categoryOfBenefit: string;
  dateOfProvision: string;
  amountCOP: number;
  licenseNumber: string;
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

const ColombiaDashboard = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [remediationFlags, setRemediationFlags] = useState<RemediationFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Query the Central Data Center's Colombia stream feeds (CO)
        const coSpend = await APIGateway.getTransactions('CO');
        
        // Map central spend items back onto Colombia local dashboard columns
        const mappedTx = coSpend.map(t => ({
          id: t.id,
          categoryOfBenefit: t.spendCategory,
          dateOfProvision: t.dateOfProvision,
          amountCOP: t.amountOriginal,
          licenseNumber: t.licenseNumber,
          entity: {
            recipientName: t.recipientName,
            workplaceInstitution: t.workplaceInstitution
          }
        }));

        const mockFlags = coSpend.map(t => ({
          id: `FLAG-${t.id}`,
          status: t.remediationStatus === 'PENDING_REVIEW' ? 'PENDING' : 'RESOLVED',
          transactionId: t.id
        }));

        setTransactions(mappedTx);
        setRemediationFlags(mockFlags);
      } catch (err) {
        console.error("Failed to fetch Colombia dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute Total YTD Spend in COP
  const currentYear = new Date().getFullYear();
  const ytdSpend = transactions
    .filter(t => new Date(t.dateOfProvision).getFullYear() === currentYear)
    .reduce((sum, t) => sum + t.amountCOP, 0);

  // Compute Pending Remediation
  const pendingCount = remediationFlags.filter(f => f.status === 'PENDING').length;

  // Compute Category Spend for Chart
  const categoryMap: Record<string, number> = {};
  transactions.forEach(t => {
    categoryMap[t.categoryOfBenefit] = (categoryMap[t.categoryOfBenefit] || 0) + t.amountCOP;
  });
  
  const chartData = Object.keys(categoryMap).map(key => ({
    name: key,
    amount: categoryMap[key]
  })).sort((a, b) => b.amount - a.amount);

  const formatCOP = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B COP`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M COP`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K COP`;
    return `$${value} COP`;
  };

  const getStatusBadge = (txId: string) => {
    const flag = remediationFlags.find(f => f.transactionId === txId);
    if (!flag) return <span className="badge badge-success" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.3)' }}>Approved</span>;
    if (flag.status === 'PENDING') return <span className="badge badge-warning">Review</span>;
    if (flag.status === 'RESOLVED') return <span className="badge badge-success" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.3)' }}>Resolved</span>;
    return <span className="badge">Rejected</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
        <span style={{ fontSize: '2.5rem' }}>🇨🇴</span>
        <div>
          <h1 className="page-title" style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Colombia RTVSS Dashboard</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Registry of Value Transfers between Health Sector Actors (Resolution 2881 of 2018 / Ministerio de Salud).
          </p>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Syncing live Colombian records...</p>
      ) : (
        <>
          {/* Main KPI cards with beautiful sky blue gradient accent borders */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
            <div className="card" style={{ borderLeft: '4px solid #0284c7', background: 'linear-gradient(to right, rgba(2, 132, 199, 0.02), transparent)' }}>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>
                Total YTD Disclosures (COP)
              </h3>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0284c7', letterSpacing: '-0.025em' }}>
                ${ytdSpend.toLocaleString(undefined, { minimumFractionDigits: 0 })} COP
              </div>
            </div>
            
            <div className="card" style={{ borderLeft: '4px solid var(--warning)', background: 'linear-gradient(to right, rgba(217, 119, 6, 0.02), transparent)' }}>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>
                Pending Resolution 2881 Audits
              </h3>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: pendingCount > 0 ? 'var(--warning)' : '#0284c7', letterSpacing: '-0.025em' }}>
                {pendingCount} Alerts
              </div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #10b981', background: 'linear-gradient(to right, rgba(16, 185, 129, 0.02), transparent)' }}>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>
                Ministerio de Salud Submission
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#10b981', letterSpacing: '-0.025em' }}>On Track</div>
                <span className="badge badge-success" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>Ready</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            {/* Left side chart component */}
            <div className="card">
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                Spend by Category (COP)
              </h3>
              <div style={{ height: '300px' }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <XAxis type="number" tickFormatter={formatCOP} stroke="var(--text-secondary)" fontSize={11} />
                      <YAxis dataKey="name" type="category" width={110} stroke="var(--text-secondary)" fontSize={11} tick={{fill: 'var(--text-secondary)'}} />
                      <Tooltip 
                         formatter={(value: any) => [`$${Number(value).toLocaleString()} COP`, 'Amount']}
                         contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                         itemStyle={{ color: '#0284c7' }}
                      />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#0284c7' : '#38bdf8'} />
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

            {/* Right side transactions list */}
            <div className="card">
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                Recent Colombian Value Transfers
              </h3>
              <div className="table-container" style={{ margin: 0 }}>
                <table style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Recipient Name</th>
                      <th>NIT / CC / CE ID</th>
                      <th>Affiliated Workplace</th>
                      <th>ToV Category</th>
                      <th>Amount (COP)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>No transfers registered yet</td>
                      </tr>
                    ) : (
                      transactions.slice(0, 5).map(tx => (
                        <tr key={tx.id}>
                          <td style={{ fontWeight: 600, color: '#1e293b' }}>{tx.entity.recipientName}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                            {tx.licenseNumber}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{tx.entity.workplaceInstitution || "N/A"}</td>
                          <td>
                            <span className="badge" style={{ background: '#f0f9ff', border: '1px solid rgba(2, 132, 199, 0.2)', color: '#0284c7', fontSize: '0.75rem', fontWeight: 600 }}>
                              {tx.categoryOfBenefit}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: '#1e293b' }}>
                            ${tx.amountCOP.toLocaleString()} COP
                          </td>
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

export default ColombiaDashboard;
