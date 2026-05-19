import { useState, useEffect } from 'react';
import { Search, Database, ArrowUpDown } from 'lucide-react';

interface Transaction {
  id: string;
  categoryOfBenefit: string;
  dateOfProvision: string;
  placeOfProvision: string;
  purposeOfBenefit: string;
  amountKRW: number;
  currency: string;
  sourceFile: string;
  entity: {
    recipientType: string;
    recipientName: string;
    licenseNumber: string;
    workplaceInstitution: string;
  }
}

const DataExplorer = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc'|'desc' } | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('https://k-sunshine-backend-381662135057.us-central1.run.app/api/reports/transactions');
        if (response.ok) {
          const data = await response.json();
          setTransactions(data);
          setFilteredTransactions(data);
        }
      } catch (err) {
        console.error("Failed to fetch reports data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  useEffect(() => {
    let result = transactions;

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.entity.recipientName.toLowerCase().includes(lowerSearch) ||
        (t.entity.licenseNumber && t.entity.licenseNumber.toLowerCase().includes(lowerSearch)) ||
        t.categoryOfBenefit.toLowerCase().includes(lowerSearch) ||
        (t.sourceFile && t.sourceFile.toLowerCase().includes(lowerSearch))
      );
    }

    if (sortConfig !== null) {
      result.sort((a: any, b: any) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle nested entity fields
        if (sortConfig.key === 'recipientName') { aVal = a.entity.recipientName; bVal = b.entity.recipientName; }
        if (sortConfig.key === 'licenseNumber') { aVal = a.entity.licenseNumber; bVal = b.entity.licenseNumber; }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredTransactions([...result]);
  }, [searchTerm, sortConfig, transactions]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Data Explorer</h1>
          <p className="page-subtitle">View, search, and sort all ingested raw data and trace data lineage.</p>
        </div>
        
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Search name, license, source..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '10px 16px 10px 40px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'rgba(30, 41, 59, 0.4)',
              color: 'var(--text-primary)',
              width: '300px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <div className="table-container" style={{ margin: 0, border: 'none' }}>
          <table style={{ margin: 0 }}>
            <thead>
              <tr>
                <th onClick={() => handleSort('recipientName')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Recipient <ArrowUpDown size={14} /></div>
                </th>
                <th onClick={() => handleSort('licenseNumber')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>License <ArrowUpDown size={14} /></div>
                </th>
                <th onClick={() => handleSort('categoryOfBenefit')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Category <ArrowUpDown size={14} /></div>
                </th>
                <th onClick={() => handleSort('amountKRW')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Amount (KRW) <ArrowUpDown size={14} /></div>
                </th>
                <th onClick={() => handleSort('dateOfProvision')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Date <ArrowUpDown size={14} /></div>
                </th>
                <th onClick={() => handleSort('sourceFile')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Source File <ArrowUpDown size={14} /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading data...</td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No transactions found</td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.entity.recipientName}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{t.entity.licenseNumber}</td>
                    <td>{t.categoryOfBenefit}</td>
                    <td style={{ fontWeight: 500 }}>{t.amountKRW.toLocaleString()}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(t.dateOfProvision).toLocaleDateString()}</td>
                    <td>
                      <span className="badge" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>
                        <Database size={12} /> {t.sourceFile || "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataExplorer;
