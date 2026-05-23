import React, { useState, useEffect } from 'react';
import { UploadCloud, Globe, Database, ShieldAlert, CheckCircle, Clock, Search, Filter } from 'lucide-react';
import { APIGateway, type UniversalTransaction, type IngestionBatch } from '../datacenter/api_gateway';
import * as XLSX from 'xlsx';

const DataCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'uploader' | 'transactions'>('overview');
  const [countryFilter, setCountryFilter] = useState<string>('GLOBAL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // States holding mock central database feeds
  const [transactions, setTransactions] = useState<UniversalTransaction[]>([]);
  const [batches, setBatches] = useState<IngestionBatch[]>([]);

  // Ingestion form state
  const [targetCountry, setTargetCountry] = useState<string>('KR');
  const [targetYear, setTargetYear] = useState<number>(2026);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    // Load live central database feed
    setTransactions(APIGateway.getTransactions(countryFilter));
    setBatches(APIGateway.getBatches());
  }, [countryFilter]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setTimeout(async () => {
      try {
        const data = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet) as any[];

        // Standardize headers dynamically based on target country rules
        const mockRows = json.map((row: any) => ({
          recipientType: row['Recipient Type'] || row['Type'] || 'HCP',
          recipientName: row['Recipient Name'] || row['Nom'] || row['Name'] || 'Dr. Target HCP',
          licenseNumber: String(row['License Number'] || row['RPPS'] || row['NPI'] || ''),
          workplaceInstitution: row['Workplace'] || row['Hopital'] || row['Institution'] || '',
          specialtyDepartment: row['Specialty'] || row['Specialite'] || '',
          spendCategory: row['Category of Benefit'] || row['Categorie'] || 'PRESENTATION',
          dateOfProvision: row['Date of Provision'] || row['Date'] || new Date().toISOString(),
          placeOfProvision: row['Place'] || row['Lieu'] || '',
          purposeOfBenefit: row['Purpose'] || row['Objet'] || '',
          details: row['Details'] || '',
          amountKRW: row['Amount (KRW)'] || (targetCountry === 'KR' ? Number(row['Amount']) : 0),
          amountEUR: row['Amount (EUR)'] || (targetCountry === 'FR' ? Number(row['Amount']) : 0),
          amountUSD: row['Amount (USD)'] || (targetCountry === 'US' ? Number(row['Amount']) : 0)
        }));

        const result = APIGateway.ingestData(targetCountry, targetYear, selectedFile.name, mockRows);
        if (result.success) {
          // Reload central ledger
          setTransactions(APIGateway.getTransactions(countryFilter));
          setBatches(APIGateway.getBatches());
          alert(`Successfully ingested ${result.ingested} records. ${result.flagged} records flagged for remediation review.`);
          setActiveTab('overview');
          setSelectedFile(null);
        }
      } catch (err) {
        console.error('Failed central data mapping:', err);
        alert('Data center mapping failed. Check file column structure.');
      } finally {
        setIsUploading(false);
      }
    }, 500);
  };

  // Computations
  const globalTotalUSD = transactions.reduce((sum, t) => sum + t.amountUSD, 0);
  const activeAlertsCount = transactions.filter(t => t.remediationStatus === 'PENDING_REVIEW').length;
  
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.workplaceInstitution.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.spendCategory.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Globe size={32} color="var(--primary-accent)" />
          <h1 className="page-title" style={{ margin: 0 }}>Global Pharma Transparency Data Center</h1>
        </div>
        <p className="page-subtitle" style={{ marginBottom: '16px' }}>
          Central administrative portal for multi-jurisdiction data ingestion, Universal Data Model matching, and downstream localized feeds.
        </p>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : ''}`}
          style={{ background: activeTab === 'overview' ? '' : 'transparent', color: activeTab === 'overview' ? '' : 'var(--text-secondary)' }}
        >
          <Database size={18} /> Global Ledger Overview
        </button>
        <button 
          onClick={() => setActiveTab('uploader')}
          className={`btn ${activeTab === 'uploader' ? 'btn-primary' : ''}`}
          style={{ background: activeTab === 'uploader' ? '' : 'transparent', color: activeTab === 'uploader' ? '' : 'var(--text-secondary)' }}
        >
          <UploadCloud size={18} /> Ingest Multi-Country Data
        </button>
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`btn ${activeTab === 'transactions' ? 'btn-primary' : ''}`}
          style={{ background: activeTab === 'transactions' ? '' : 'transparent', color: activeTab === 'transactions' ? '' : 'var(--text-secondary)' }}
        >
          <Search size={18} /> Universal Records Grid
        </button>
      </div>

      {/* Overview Dashboard */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* KPI Dashboard */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>GLOBAL CONSOLIDATED SPEND</h3>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary-glow)' }}>
                ${globalTotalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Aggregated & normalized globally</p>
            </div>
            
            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>TOTAL INGESTED TRANSACTIONS</h3>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {transactions.length} Records
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Synced from active country feeds</p>
            </div>

            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>PENDING COMPLIANCE REMEDIATIONS</h3>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: activeAlertsCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {activeAlertsCount} Alerts
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Awaiting statutory override</p>
            </div>

            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>DOWNSTREAM COUNTRY FEEDS</h3>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--success)' }}>
                3 Jurisdictions
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>South Korea [KR] | France [FR] | USA [US]</p>
            </div>
          </div>

          {/* Central Ingestion Batch Ledger */}
          <div className="card">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color="var(--primary-glow)" /> Central Ingestion Batch Ledger
            </h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Jurisdiction</th>
                    <th>Target Year</th>
                    <th>Source File Name</th>
                    <th>Uploaded At</th>
                    <th>Total Records</th>
                    <th>Remediation Flags</th>
                    <th>Downstream Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map(batch => (
                    <tr key={batch.batchId}>
                      <td style={{ fontWeight: 'bold' }}>{batch.batchId}</td>
                      <td>
                        <span className="badge" style={{ background: '#f1f5f9', border: '1px solid var(--border-color)', color: '#334155' }}>
                          {batch.countryCode === 'KR' ? '🇰🇷 South Korea' : batch.countryCode === 'FR' ? '🇫🇷 France' : '🇺🇸 USA'}
                        </span>
                      </td>
                      <td>{batch.reportingYear}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{batch.sourceFileName}</td>
                      <td>{new Date(batch.uploadTimestamp).toLocaleString()}</td>
                      <td>{batch.totalRecords}</td>
                      <td>
                        {batch.flaggedRecords > 0 ? (
                          <span className="badge badge-danger">
                            <ShieldAlert size={14} /> {batch.flaggedRecords} Flagged
                          </span>
                        ) : (
                          <span className="badge badge-success">
                            <CheckCircle size={14} /> 0 Flags
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${batch.status === 'PROCESSED' ? 'badge-success' : 'badge-warning'}`}>
                          {batch.status === 'PROCESSED' ? 'FEED_SYNC_OK' : 'PENDING_AUDIT'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Country Ingestion Uploader */}
      {activeTab === 'uploader' && (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadCloud size={22} color="var(--primary-glow)" /> Ingest Multi-Country Dataset
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
            Upload raw manufacturer spend spreadsheets. The Ingestion Engine will map source headers onto the Universal Data Model (UDM) based on your selected target country's legal boundaries.
          </p>

          <form onSubmit={handleIngest} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 'bold' }}>Target Jurisdiction</label>
                <select 
                  value={targetCountry} 
                  onChange={(e) => setTargetCountry(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                >
                  <option value="KR">🇰🇷 South Korea (Physician Sunshine Act)</option>
                  <option value="FR">🇫🇷 France (Loi Bertrand transparency)</option>
                  <option value="US">🇺🇸 United States (CMS Open Payments)</option>
                </select>
              </div>
              <div style={{ width: '120px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 'bold' }}>Reporting Year</label>
                <select 
                  value={targetYear} 
                  onChange={(e) => setTargetYear(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 'bold' }}>Source Spend Sheet (.xlsx, .csv)</label>
              <div style={{ border: '2px dashed var(--border-color)', padding: '30px', borderRadius: '8px', textAlign: 'center', background: 'rgba(0,0,0,0.02)' }}>
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileChange}
                  style={{ display: 'block', margin: '0 auto 12px auto' }}
                  required
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Column normalization is run instantly on upload.</span>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isUploading || !selectedFile}
              style={{ padding: '12px', justifyContent: 'center' }}
            >
              {isUploading ? 'Validating & Normalizing...' : 'Submit & Normalize to Universal UDM'}
            </button>
          </form>
        </div>
      )}

      {/* Universal Records Grid */}
      {activeTab === 'transactions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Filters Bar */}
          <div className="card" style={{ display: 'flex', gap: '16px', padding: '16px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Search across centralized database (HCP Name, Category, Hospital, ID...)" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 40px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={18} color="var(--text-secondary)" />
              <select 
                value={countryFilter} 
                onChange={(e) => setCountryFilter(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontWeight: 500 }}
              >
                <option value="GLOBAL">🌍 Global (All Downstream Feeds)</option>
                <option value="KR">🇰🇷 South Korea [KR]</option>
                <option value="FR">🇫🇷 France [FR]</option>
                <option value="US">🇺🇸 United States [US]</option>
              </select>
            </div>
          </div>

          {/* Table Ledger */}
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container" style={{ margin: 0 }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Record ID</th>
                    <th>Jurisdiction</th>
                    <th>Recipient Details</th>
                    <th>Category</th>
                    <th>Expenditure Details</th>
                    <th>Original Amount</th>
                    <th>Normalized (USD)</th>
                    <th>Compliance Check</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                        No records matching the selected country filter or query.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(tx => (
                      <tr key={tx.id}>
                        <td style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{tx.id}</td>
                        <td>
                          <span className="badge" style={{ background: '#f1f5f9', border: '1px solid var(--border-color)', color: '#334155' }}>
                            {tx.countryCode}
                          </span>
                        </td>
                        <td>
                          <div><strong>{tx.recipientName}</strong></div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {tx.licenseNumber} | {tx.workplaceInstitution}
                          </div>
                        </td>
                        <td>{tx.spendCategory}</td>
                        <td>
                          <div>{tx.purposeOfBenefit}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tx.details}</div>
                        </td>
                        <td>
                          {tx.currencyOriginal} {tx.amountOriginal.toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 'bold', color: 'var(--primary-accent)' }}>
                          ${tx.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <span className={`badge ${tx.remediationStatus === 'APPROVED' ? 'badge-success' : 'badge-warning'}`}>
                            {tx.remediationStatus === 'APPROVED' ? 'Compliant' : 'Audit Flag'}
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
      )}
    </div>
  );
};

export default DataCenter;
