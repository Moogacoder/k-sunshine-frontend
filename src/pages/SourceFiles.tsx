import { useState, useEffect } from 'react';
import { FileText, Database, Calendar } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { APIGateway } from '../datacenter/api_gateway';

interface FileStat {
  filename: string;
  recordCount: number;
  totalAmountKRW: number;
  earliestDate: string;
  latestDate: string;
}

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

const SourceFiles = () => {
  const location = useLocation();
  const isItaly = location.pathname.includes('/italy');
  const isColombia = location.pathname.includes('/colombia');
  const countryCode = isColombia ? 'CO' : (isItaly ? 'IT' : 'KR');
  const currencySymbol = isColombia ? '$' : (isItaly ? '€' : '₩');

  const [files, setFiles] = useState<FileStat[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [records, setRecords] = useState<Transaction[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  useEffect(() => {
    fetchFiles();
    setSelectedFile(null);
    setRecords([]);
  }, [location.pathname]);

  const fetchFiles = async () => {
    try {
      setIsLoadingFiles(true);
      const targetBatches = (await APIGateway.getBatches()).filter(b => b.countryCode === countryCode);
      const targetTransactions = await APIGateway.getTransactions(countryCode);
      
      const mappedFiles: FileStat[] = targetBatches.map(b => {
        const batchTx = targetTransactions.filter(t => t.batchId === b.batchId);
        const totalAmount = batchTx.reduce((sum, t) => sum + t.amountOriginal, 0);
        return {
          filename: b.sourceFileName,
          recordCount: b.totalRecords,
          totalAmountKRW: totalAmount,
          earliestDate: b.uploadTimestamp,
          latestDate: b.uploadTimestamp
        };
      });
      setFiles(mappedFiles);
    } catch (err) {
      console.error("Failed to fetch source files:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const loadRecords = async (filename: string) => {
    setSelectedFile(filename);
    setIsLoadingRecords(true);
    setRecords([]);
    
    try {
      const targetBatches = (await APIGateway.getBatches()).filter(b => b.countryCode === countryCode);
      const targetBatch = targetBatches.find(b => b.sourceFileName === filename);
      
      if (targetBatch) {
        const targetTransactions = await APIGateway.getTransactions(countryCode);
        const batchTx = targetTransactions.filter(t => t.batchId === targetBatch.batchId);
        
        const mappedTx = batchTx.map(t => ({
          id: t.id,
          categoryOfBenefit: t.spendCategory,
          dateOfProvision: t.dateOfProvision,
          placeOfProvision: t.placeOfProvision,
          purposeOfBenefit: t.purposeOfBenefit,
          amountKRW: t.amountOriginal,
          currency: t.currencyOriginal,
          details: t.details,
          sourceFile: filename,
          entity: {
            recipientType: t.recipientType,
            recipientName: t.recipientName,
            licenseNumber: t.licenseNumber,
            workplaceInstitution: t.workplaceInstitution,
            specialtyDepartment: t.specialtyDepartment
          }
        }));
        setRecords(mappedTx);
      }
    } catch (err) {
      console.error("Failed to fetch records for file:", err);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 40px)', alignItems: 'stretch' }}>
      
      {/* Left Pane: File List */}
      <div className="card" style={{ width: '320px', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={20} className="text-primary" /> Source Files
          </h2>
          <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            View raw data records as they were ingested into the system.
          </p>
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {isLoadingFiles ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading files...</div>
          ) : files.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No source files found.</div>
          ) : (
            files.map(f => (
              <div 
                key={f.filename}
                onClick={() => loadRecords(f.filename)}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  background: selectedFile === f.filename ? 'rgba(74, 144, 226, 0.05)' : 'transparent',
                  borderLeft: selectedFile === f.filename ? '3px solid var(--primary-color)' : '3px solid transparent',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FileText size={16} /> {f.filename}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>{f.recordCount} records</span>
                  <span>{currencySymbol}{f.totalAmountKRW.toLocaleString(undefined, { minimumFractionDigits: isItaly ? 2 : 0 })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Pane: Raw Data Grid */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        {selectedFile ? (
          <>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={20} className="text-primary" /> {selectedFile}
                </h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Showing raw, unmodified data rows exactly as loaded from this file.
                </p>
              </div>
              <div className="badge" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                {records.length} Records Loaded
              </div>
            </div>

            <div style={{ overflow: 'auto', flex: 1, margin: 0 }} className="table-container">
              {isLoadingRecords ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Fetching raw rows...</div>
              ) : (
                <table style={{ margin: 0, width: 'max-content', minWidth: '100%' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Recipient Name</th>
                      <th>License Number</th>
                      <th>Institution</th>
                      <th>Category</th>
                      <th>Purpose</th>
                      <th>Amount ({isColombia ? 'COP' : (isItaly ? 'EUR' : 'KRW')})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(tx => (
                      <tr key={tx.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} style={{ opacity: 0.5 }} />
                            {new Date(tx.dateOfProvision).toLocaleDateString()}
                          </div>
                        </td>
                        <td style={{ fontWeight: 500 }}>{tx.entity.recipientName}</td>
                        <td style={{ fontFamily: 'monospace' }}>{tx.entity.licenseNumber}</td>
                        <td>{tx.entity.workplaceInstitution || '-'}</td>
                        <td>{tx.categoryOfBenefit}</td>
                        <td>{tx.purposeOfBenefit || '-'}</td>
                        <td style={{ fontWeight: 500 }}>
                          {tx.currency} {tx.amountKRW.toLocaleString(undefined, { minimumFractionDigits: isItaly ? 2 : 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            <Database size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <h3>Select a Source File</h3>
            <p>Choose a file from the left pane to view its raw data records.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default SourceFiles;
