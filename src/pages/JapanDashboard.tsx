import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { APIGateway } from '../datacenter/api_gateway';

interface Transaction {
  id: string;
  categoryOfBenefit: string;
  dateOfProvision: string;
  amountJPY: number;
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

const JapanDashboard = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [remediationFlags, setRemediationFlags] = useState<RemediationFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Query the Central Data Center's Japan stream feeds (JP)
        const jpSpend = await APIGateway.getTransactions('JP');
        
        // Map central spend items back onto Japan local dashboard columns
        const mappedTx = jpSpend.map(t => ({
          id: t.id,
          categoryOfBenefit: t.spendCategory,
          dateOfProvision: t.dateOfProvision,
          amountJPY: t.amountOriginal,
          licenseNumber: t.licenseNumber,
          entity: {
            recipientName: t.recipientName,
            workplaceInstitution: t.workplaceInstitution
          }
        }));

        const mockFlags = jpSpend.map(t => ({
          id: `FLAG-${t.id}`,
          status: t.remediationStatus === 'PENDING_REVIEW' ? 'PENDING' : 'RESOLVED',
          transactionId: t.id
        }));

        setTransactions(mappedTx);
        setRemediationFlags(mockFlags);
      } catch (err) {
        console.error("Failed to fetch Japan dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute Total YTD Spend in JPY
  const currentYear = new Date().getFullYear();
  const ytdSpend = transactions
    .filter(t => new Date(t.dateOfProvision).getFullYear() === currentYear)
    .reduce((sum, t) => sum + t.amountJPY, 0);

  // Compute Pending Remediation
  const pendingCount = remediationFlags.filter(f => f.status === 'PENDING').length;

  // Compute Category Spend for Chart
  const categoryMap: Record<string, number> = {};
  transactions.forEach(t => {
    categoryMap[t.categoryOfBenefit] = (categoryMap[t.categoryOfBenefit] || 0) + t.amountJPY;
  });
  
  const chartData = Object.keys(categoryMap).map(key => {
    let name = key;
    if (key === 'RESEARCH_DEV') name = 'R&D Expenses';
    else if (key === 'ACADEMIC_DONATION') name = 'Academic Donations';
    else if (key === 'LECTURE_FEES') name = 'Lecture Fees';
    else if (key === 'PROMOTIONAL_INFO') name = 'Promotional Info';
    else if (key === 'OTHER_MEALS') name = 'Other & Meals';
    return {
      name,
      amount: categoryMap[key]
    };
  }).sort((a, b) => b.amount - a.amount);

  const formatJPY = (value: number) => {
    if (value >= 100000000) return `¥${(value / 100000000).toFixed(1)}億`;
    if (value >= 1000000) return `¥${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `¥${(value / 1000).toFixed(0)}K`;
    return `¥${value}`;
  };

  const getStatusBadge = (txId: string) => {
    const flag = remediationFlags.find(f => f.transactionId === txId);
    if (!flag) return <span className="badge badge-success" style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.3)' }}>Approved</span>;
    if (flag.status === 'PENDING') return <span className="badge badge-warning">Review</span>;
    if (flag.status === 'RESOLVED') return <span className="badge badge-success" style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.3)' }}>Resolved</span>;
    return <span className="badge">Rejected</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
        <span style={{ fontSize: '2.5rem' }}>🇯🇵</span>
        <div>
          <h1 className="page-title" style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Japan JPMA Dashboard</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Pharma transparency disclosures under JPMA Guidelines and the Fair Competition Code.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Syncing live Japanese records...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
            <div className="card" style={{ borderLeft: '4px solid #ec4899', background: 'linear-gradient(to right, rgba(236, 72, 153, 0.02), transparent)' }}>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>
                Total YTD Disclosures (JPY)
              </h3>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ec4899', letterSpacing: '-0.025em' }}>
                ¥{ytdSpend.toLocaleString()}
              </div>
            </div>
            
            <div className="card" style={{ borderLeft: '4px solid var(--warning)', background: 'linear-gradient(to right, rgba(217, 119, 6, 0.02), transparent)' }}>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>
                Pending JPMA Guidelines Audits
              </h3>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: pendingCount > 0 ? 'var(--warning)' : '#ec4899', letterSpacing: '-0.025em' }}>
                {pendingCount} Alerts
              </div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #10b981', background: 'linear-gradient(to right, rgba(16, 185, 129, 0.02), transparent)' }}>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>
                JPMA Guidelines Submission
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#10b981', letterSpacing: '-0.025em' }}>On Track</div>
                <span className="badge badge-success" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>Ready</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            <div className="card">
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                Spend by Category (JPY)
              </h3>
              <div style={{ height: '300px' }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <XAxis type="number" tickFormatter={formatJPY} stroke="var(--text-secondary)" fontSize={11} />
                      <YAxis dataKey="name" type="category" width={110} stroke="var(--text-secondary)" fontSize={11} tick={{fill: 'var(--text-secondary)'}} />
                      <Tooltip 
                         formatter={(value: any) => [`¥${Number(value).toLocaleString()}`, 'Amount']}
                         contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                         itemStyle={{ color: '#ec4899' }}
                      />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#ec4899' : '#f472b6'} />
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
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                Recent Japanese Value Transfers
              </h3>
              <div className="table-container" style={{ margin: 0 }}>
                <table style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Recipient Name</th>
                      <th>Registration ID</th>
                      <th>Workplace / Institution</th>
                      <th>Disclosure Category</th>
                      <th>Amount (JPY)</th>
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
                            <span className="badge" style={{ background: '#fdf2f8', border: '1px solid rgba(236, 72, 153, 0.2)', color: '#ec4899', fontSize: '0.75rem', fontWeight: 600 }}>
                              {tx.categoryOfBenefit === 'RESEARCH_DEV' ? 'R&D Expenses' : 
                               tx.categoryOfBenefit === 'ACADEMIC_DONATION' ? 'Academic Donations' :
                               tx.categoryOfBenefit === 'LECTURE_FEES' ? 'Lecture Fees' :
                               tx.categoryOfBenefit === 'PROMOTIONAL_INFO' ? 'Promotional Info' :
                               tx.categoryOfBenefit === 'OTHER_MEALS' ? 'Other & Meals' : tx.categoryOfBenefit}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: '#1e293b' }}>
                            ¥{tx.amountJPY.toLocaleString()}
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

export default JapanDashboard;
