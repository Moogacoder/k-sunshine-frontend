import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, SlidersHorizontal, AlertCircle, Edit2, Save, X } from 'lucide-react';

interface Transaction {
  id: string;
  categoryOfBenefit: string;
  dateOfProvision: string;
  placeOfProvision: string;
  purposeOfBenefit: string;
  amountKRW: number;
  currency: string;
  details: string;
  sourceFile: string;
  entity: {
    recipientType: string;
    recipientName: string;
    licenseNumber: string;
    workplaceInstitution: string;
    specialtyDepartment: string;
  }
}

const DataExplorer = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction | 'recipientName', direction: 'asc' | 'desc' } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Transaction>>({});

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('https://k-sunshine-backend-381662135057.us-central1.run.app/api/reports/transactions');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error("Failed to fetch reports data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (key: keyof Transaction | 'recipientName') => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditFormData({
      amountKRW: tx.amountKRW,
      categoryOfBenefit: tx.categoryOfBenefit,
      placeOfProvision: tx.placeOfProvision,
      purposeOfBenefit: tx.purposeOfBenefit,
      details: tx.details
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const response = await fetch(`https://k-sunshine-backend-381662135057.us-central1.run.app/api/reports/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      
      if (response.ok) {
        const updatedTx = await response.json();
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedTx } : t));
        setEditingId(null);
        setEditFormData({});
      } else {
        console.error("Failed to save transaction");
      }
    } catch (error) {
      console.error("Error saving edit", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    setEditFormData({ ...editFormData, [field]: e.target.value });
  };

  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.entity.recipientName.toLowerCase().includes(lowerSearch) ||
        t.entity.licenseNumber?.toLowerCase().includes(lowerSearch) ||
        t.categoryOfBenefit.toLowerCase().includes(lowerSearch) ||
        t.sourceFile?.toLowerCase().includes(lowerSearch) ||
        t.entity.workplaceInstitution?.toLowerCase().includes(lowerSearch) ||
        t.purposeOfBenefit?.toLowerCase().includes(lowerSearch)
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any = sortConfig.key === 'recipientName' ? a.entity.recipientName : a[sortConfig.key as keyof Transaction];
        let valB: any = sortConfig.key === 'recipientName' ? b.entity.recipientName : b[sortConfig.key as keyof Transaction];
        
        if (sortConfig.key === 'dateOfProvision') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [transactions, searchTerm, sortConfig]);

  return (
    <div>
      <h1 className="page-title">Data Explorer</h1>
      <p className="page-subtitle">Search, sort, and securely edit ingested data records. All modifications are logged.</p>

      <div className="card" style={{ marginBottom: '24px', display: 'flex', gap: '16px', padding: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Search by HCP Name, License, Category, Institution, Source File..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
          />
        </div>
        <button className="btn" style={{ border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}><Filter size={18} /> Filters</button>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading records...</div>
        ) : (
          <div className="table-container" style={{ margin: 0, overflowX: 'auto' }}>
            <table style={{ margin: 0, width: 'max-content', minWidth: '100%' }}>
              <thead>
                <tr>
                  <th onClick={() => handleSort('dateOfProvision')} style={{ cursor: 'pointer' }}>Date <SlidersHorizontal size={12} style={{ marginLeft: '4px', display: 'inline' }} /></th>
                  <th onClick={() => handleSort('recipientName')} style={{ cursor: 'pointer' }}>Recipient Name <SlidersHorizontal size={12} style={{ marginLeft: '4px', display: 'inline' }} /></th>
                  <th>License Number</th>
                  <th>Institution</th>
                  <th>Specialty</th>
                  <th onClick={() => handleSort('categoryOfBenefit')} style={{ cursor: 'pointer' }}>Category <SlidersHorizontal size={12} style={{ marginLeft: '4px', display: 'inline' }} /></th>
                  <th>Place</th>
                  <th>Purpose</th>
                  <th>Details</th>
                  <th onClick={() => handleSort('amountKRW')} style={{ cursor: 'pointer' }}>Amount (KRW) <SlidersHorizontal size={12} style={{ marginLeft: '4px', display: 'inline' }} /></th>
                  <th>Source File (Lineage)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      <AlertCircle size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                      <div>No records found matching your search.</div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedTransactions.slice(0, 100).map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.dateOfProvision).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 500 }}>{tx.entity.recipientName}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{tx.entity.licenseNumber}</td>
                      <td>{tx.entity.workplaceInstitution || '-'}</td>
                      <td>{tx.entity.specialtyDepartment || '-'}</td>
                      
                      {editingId === tx.id ? (
                        <>
                          <td><input value={editFormData.categoryOfBenefit || ''} onChange={(e) => handleChange(e, 'categoryOfBenefit')} style={{ padding: '4px' }} /></td>
                          <td><input value={editFormData.placeOfProvision || ''} onChange={(e) => handleChange(e, 'placeOfProvision')} style={{ padding: '4px' }} /></td>
                          <td><input value={editFormData.purposeOfBenefit || ''} onChange={(e) => handleChange(e, 'purposeOfBenefit')} style={{ padding: '4px' }} /></td>
                          <td><input value={editFormData.details || ''} onChange={(e) => handleChange(e, 'details')} style={{ padding: '4px' }} /></td>
                          <td><input type="number" value={editFormData.amountKRW || ''} onChange={(e) => handleChange(e, 'amountKRW')} style={{ padding: '4px', width: '100px' }} /></td>
                        </>
                      ) : (
                        <>
                          <td>{tx.categoryOfBenefit}</td>
                          <td>{tx.placeOfProvision || '-'}</td>
                          <td>{tx.purposeOfBenefit || '-'}</td>
                          <td>{tx.details || '-'}</td>
                          <td style={{ fontWeight: 500 }}>₩{tx.amountKRW.toLocaleString()}</td>
                        </>
                      )}
                      
                      <td>
                        {tx.sourceFile ? (
                          <span className="badge" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            {tx.sourceFile}
                          </span>
                        ) : '-'}
                      </td>
                      
                      <td>
                        {editingId === tx.id ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="btn btn-primary" onClick={() => handleSaveEdit(tx.id)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}><Save size={14} /></button>
                            <button className="btn" onClick={handleCancelEdit} style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'var(--bg-main)' }}><X size={14} /></button>
                          </div>
                        ) : (
                          <button className="btn" onClick={() => handleEditClick(tx)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)' }}>
                            <Edit2 size={14} /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filteredAndSortedTransactions.length > 100 && (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', borderTop: '1px solid var(--border-color)' }}>
                Showing top 100 results for performance. Please use search to find specific records.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataExplorer;
