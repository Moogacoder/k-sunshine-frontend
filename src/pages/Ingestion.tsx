import { useState, useCallback } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle, AlertTriangle, Sparkles, ArrowRight, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { APIGateway } from '../datacenter/api_gateway';
import { parseAmount } from '../datacenter/validation';

interface UploadResult {
  filename: string;
  date: string;
  ingested: number;
  flagged: number;
}

// Universal Schema attributes to map to
const REQUIRED_SCHEMA_FIELDS = [
  { key: 'recipientType', label: 'Recipient Type', desc: 'HCP, THO, or INSTITUTION' },
  { key: 'recipientName', label: 'Recipient Name', desc: 'Name of clinician or organization' },
  { key: 'licenseNumber', label: 'License / ID Number', desc: 'NPI, Codice Fiscale, NIT, RPPS, etc.' },
  { key: 'workplaceInstitution', label: 'Workplace Institution', desc: 'Workplace hospital or clinic name' },
  { key: 'specialtyDepartment', label: 'Specialty Department', desc: 'Medical specialty or department' },
  { key: 'spendCategory', label: 'Category of Spend', desc: 'Spend type/category' },
  { key: 'dateOfProvision', label: 'Provision Date', desc: 'Date of value transfer' },
  { key: 'placeOfProvision', label: 'Place of Provision', desc: 'City or state location' },
  { key: 'purposeOfBenefit', label: 'Purpose of Benefit', desc: 'Reason or event name' },
  { key: 'amountOriginal', label: 'Amount (Original)', desc: 'Transaction value' },
  { key: 'details', label: 'Additional Details', desc: 'Notes or equipment descriptions' }
];

const Ingestion = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isItaly = location.pathname.includes('/italy');
  const isColombia = location.pathname.includes('/colombia');
  const isEFPIA = location.pathname.includes('/efpia');
  const isKorea = location.pathname.includes('/korea');
  
  const countryCode = isEFPIA ? 'EU' : (isColombia ? 'CO' : (isItaly ? 'IT' : (isKorea ? 'KR' : '')));

  if (!countryCode) {
    return <Navigate to="/datacenter" replace />;
  }

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recentUploads, setRecentUploads] = useState<UploadResult[]>([]);

  // AI Schema Mapping Modal states
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [tempJsonData, setTempJsonData] = useState<any[]>([]);
  const [tempFileName, setTempFileName] = useState('');
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isMappingLoading, setIsMappingLoading] = useState(false);

  // Ingestion Summary & Stats Modal states
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsData, setStatsData] = useState<{
    filename: string;
    totalRows: number;
    ingested: number;
    flagged: number;
    mapping: Record<string, string>;
  } | null>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      if (json.length === 0) {
        alert("The uploaded file is empty.");
        setIsUploading(false);
        return;
      }

      // Verify country relevance (Contamination Check)
      const hasItalianHeaders = json.some((row: any) => 
        row['Codice Fiscale'] !== undefined || 
        row['Struttura'] !== undefined || 
        row['Tipologia'] !== undefined
      );

      const hasKoreanHeaders = json.some((row: any) => 
        row['Amount (KRW)'] !== undefined ||
        row['Reporting Template'] !== undefined
      );

      const hasColombianHeaders = json.some((row: any) =>
        row['Nit o Identificacion'] !== undefined ||
        row['Nombre del Beneficiario'] !== undefined ||
        row['Valor Transferencia (COP)'] !== undefined
      );

      const hasEFPIAHeaders = json.some((row: any) =>
        row['Company Name'] !== undefined ||
        row['Recipient Type'] !== undefined ||
        row['Tax ID / License Number'] !== undefined ||
        row['Contribution Amount (EUR)'] !== undefined
      );

      const hasEuropeanIdentifiers = json.some((row: any) =>
        Object.values(row as object).some(val => 
          typeof val === 'string' && 
          (/HCP-(ITA|FRA|POL|GER|SWI|SWE|BEL|SPA|IRE|UNI|AUS|NET)/i.test(val) || 
           /^(Italy|France|Poland|Germany|Switzerland|Sweden|Belgium|Spain|Ireland|United Kingdom|Austria|Netherlands)$/i.test(val))
        )
      );

      if (countryCode === 'KR' && (hasItalianHeaders || hasColombianHeaders || hasEFPIAHeaders || hasEuropeanIdentifiers)) {
        alert("Contamination Warning: The uploaded dataset contains European or Colombian disclosures, which cannot be loaded into the South Korea Sunshine Act registry. Ingestion rejected to prevent database contamination.");
        setIsUploading(false);
        return;
      }

      if (countryCode === 'IT' && (hasKoreanHeaders || hasColombianHeaders || hasEFPIAHeaders)) {
        alert("Contamination Warning: The uploaded dataset contains South Korean Won (KRW), EFPIA, or Colombian Peso disclosures, which cannot be loaded into the Italy Sanità Trasparente registry. Ingestion rejected to prevent database contamination.");
        setIsUploading(false);
        return;
      }

      if (countryCode === 'CO' && (hasKoreanHeaders || hasItalianHeaders || hasEFPIAHeaders || hasEuropeanIdentifiers)) {
        alert("Contamination Warning: The uploaded dataset contains South Korean Won (KRW), European EFPIA, or Italian disclosures, which cannot be loaded into the Colombia RTVSS registry. Ingestion rejected to prevent database contamination.");
        setIsUploading(false);
        return;
      }

      if (countryCode === 'EU' && (hasKoreanHeaders || hasColombianHeaders)) {
        alert("Contamination Warning: The uploaded dataset contains South Korean or Colombian disclosures, which cannot be loaded into the Europe EFPIA registry. Ingestion rejected to prevent database contamination.");
        setIsUploading(false);
        return;
      }

      // Extract raw column headers from spreadsheet keys
      const headers = Object.keys(json[0] as object);
      setAvailableHeaders(headers);
      setTempJsonData(json);
      setTempFileName(file.name);
      
      // Open mapping panel and request dynamic AI column mappings
      setShowMappingModal(true);
      setIsMappingLoading(true);

      try {
        const aiMapping = await APIGateway.mapColumns(headers);
        
        // Formulate an initial state with AI recommendations
        const finalMapping: Record<string, string> = {};
        REQUIRED_SCHEMA_FIELDS.forEach(field => {
          // Find if there's an AI suggested header that maps to this universal key
          const matchedHeader = Object.keys(aiMapping).find(k => aiMapping[k] === field.key);
          if (matchedHeader) {
            finalMapping[field.key] = matchedHeader;
          } else {
            // Static fallback heuristics if AI misses it
            const fallback = headers.find(h => 
              h.toLowerCase().includes(field.key.toLowerCase()) || 
              (field.key === 'spendCategory' && (h.toLowerCase().includes('category') || h.toLowerCase().includes('spend') || h.toLowerCase().includes('benefit') || h.toLowerCase().includes('tipologia') || h.toLowerCase().includes('tipo') || h.toLowerCase().includes('convenzione') || h.toLowerCase().includes('donazione') || h.toLowerCase().includes('desembolso'))) ||
              (field.key === 'recipientName' && (h.toLowerCase().includes('name') || h.toLowerCase().includes('nom') || h.toLowerCase().includes('beneficiario'))) ||
              (field.key === 'licenseNumber' && (h.toLowerCase().includes('license') || h.toLowerCase().includes('tax') || h.toLowerCase().includes('nit') || h.toLowerCase().includes('fiscale') || h.toLowerCase().includes('rpps') || h.toLowerCase().includes('npi'))) ||
              (field.key === 'amountOriginal' && (h.toLowerCase().includes('amount') || h.toLowerCase().includes('valore') || h.toLowerCase().includes('value') || h.toLowerCase().includes('importo') || h.toLowerCase().includes('valor')))
            );
            finalMapping[field.key] = fallback || '';
          }
        });
        setColumnMapping(finalMapping);
      } catch (err) {
        console.warn("AI Mapping failed, using standard mapping:", err);
      } finally {
        setIsMappingLoading(false);
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to process file. Check console for details.');
      setIsUploading(false);
    }
  };

  const handleConfirmMapping = async () => {
    setIsUploading(true);
    setShowMappingModal(false);
    try {
      // Map the Excel row cells using the confirmed dropdown mappings
      const mappedData = tempJsonData.map((row: any) => {
        const mappedRow: any = {};
        REQUIRED_SCHEMA_FIELDS.forEach(field => {
          const selectedHeader = columnMapping[field.key];
          let val = selectedHeader ? row[selectedHeader] : '';
          
          if (field.key === 'amountOriginal') {
            mappedRow[field.key] = parseAmount(val);
          } else if (field.key === 'dateOfProvision') {
            mappedRow[field.key] = val ? new Date(val).toISOString() : new Date().toISOString();
          } else {
            mappedRow[field.key] = val !== undefined && val !== null ? String(val) : '';
          }
        });
        return mappedRow;
      });

      // Commit Ingestion via API Gateway
      const currentYear = new Date().getFullYear();
      const result = await APIGateway.ingestData(countryCode, currentYear, tempFileName, mappedData);

      if (result.success) {
        setRecentUploads(prev => [{
          filename: tempFileName,
          date: new Date().toLocaleDateString(),
          ingested: result.ingested,
          flagged: result.flagged
        }, ...prev]);

        // Capture stats data for the summary stats modal
        setStatsData({
          filename: tempFileName,
          totalRows: tempJsonData.length,
          ingested: result.ingested,
          flagged: result.flagged,
          mapping: { ...columnMapping }
        });
        setShowStatsModal(true);
      } else {
        throw new Error('Failed to ingest mapped records');
      }
    } catch (error: any) {
      console.error('Mapping ingestion error:', error);
      alert('Failed to commit records. ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDropdownChange = (fieldKey: string, headerValue: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [fieldKey]: headerValue
    }));
  };

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div>
      <h1 className="page-title">Local Data Ingestion ({isEFPIA ? 'Europe (EFPIA)' : (isColombia ? 'Colombia' : (isItaly ? 'Italy' : 'South Korea'))})</h1>
      <p className="page-subtitle">Upload spend records from external sources for {isEFPIA ? 'Europe EFPIA Disclosure Code' : (isColombia ? 'Colombia Resolution 2881' : (isItaly ? 'Italy Sanità Trasparente' : 'K-Sunshine Act'))} validation.</p>

      {/* Drag & Drop Card */}
      <div 
        className="card" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '60px', 
          border: `2px dashed ${isDragging ? 'var(--primary-accent)' : 'var(--border-color)'}`, 
          background: isDragging ? 'rgba(56, 189, 248, 0.1)' : 'rgba(30, 41, 59, 0.4)',
          transition: 'all 0.2s ease',
          position: 'relative'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <>
            <Loader2 size={64} color="var(--primary-accent)" style={{ marginBottom: '20px', animation: 'spin 1s linear infinite' }} />
            <h3 style={{ marginBottom: '8px' }}>Processing Data...</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Extracting records and running Remediation Engine validation</p>
          </>
        ) : (
          <>
            <UploadCloud size={64} color="var(--primary-accent)" style={{ marginBottom: '20px' }} />
            <h3 style={{ marginBottom: '8px' }}>Drag & Drop Files Here</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Supports CSV, Excel (XLSX), or JSON structured payload.</p>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                Select Files to Upload
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  style={{ display: 'none' }} 
                  onChange={handleFileInput} 
                />
              </label>
              
              <a 
                href={isEFPIA ? "/eu_efpia_transactions_1000.csv" : (isColombia ? "/colombian_hcp_transactions_1000.csv" : (isItaly ? "/italian_hcp_transactions_1000.csv" : "/K_Sunshine_Upload_Template.csv"))} 
                download 
                className="btn btn-secondary" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  textDecoration: 'none', 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  border: '1px solid var(--border-color)', 
                  color: 'var(--text-primary)', 
                  padding: '10px 20px', 
                  borderRadius: '6px', 
                  fontWeight: '600' 
                }}
              >
                Download CSV Template
              </a>
            </div>
          </>
        )}
      </div>

      {/* AI Smart Schema-Mapping Modal */}
      {showMappingModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px'
        }}>
          <div className="card animate-scale-up" style={{ 
            width: '100%', maxWidth: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', 
            padding: 0, border: '1px solid var(--border-color)', overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)', background: 'var(--bg-surface)'
          }}>
            
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)' }}>
              <Sparkles size={24} color="var(--primary-glow)" style={{ marginRight: '10px' }} />
              <div>
                <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>AI-Powered Smart Schema Mapper</h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>File: <strong style={{ color: 'var(--text-primary)' }}>{tempFileName}</strong> • Records: <strong>{tempJsonData.length}</strong></span>
              </div>
              <button 
                onClick={() => setShowMappingModal(false)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <Sparkles size={16} color="var(--primary-glow)" style={{ flexShrink: 0 }} />
                <span>Our Gemini model analyzed your uploaded columns and auto-mapped them to our compliance schema keys. Please verify before importing.</span>
              </div>

              {isMappingLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '16px' }}>
                  <Loader2 size={40} color="var(--primary-accent)" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Gemini is analyzing columns and aligning schemas...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {REQUIRED_SCHEMA_FIELDS.map(field => {
                    const mappedValue = columnMapping[field.key] || '';
                    return (
                      <div key={field.key} style={{ display: 'grid', gridTemplateColumns: '1.8fr 2.5fr', alignItems: 'center', gap: '16px', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{field.label}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{field.desc}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <select 
                            value={mappedValue} 
                            onChange={(e) => handleDropdownChange(field.key, e.target.value)}
                            style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                          >
                            <option value="">-- Leave empty --</option>
                            {availableHeaders.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                          {mappedValue && (
                            <span className="badge badge-success" style={{ padding: '6px 10px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Sparkles size={10} /> AI Mapped
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', justifyContent: 'flex-end', background: 'var(--bg-elevated)' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowMappingModal(false)}
                style={{ border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleConfirmMapping}
                disabled={isMappingLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Confirm Mapping & Ingest <ArrowRight size={16} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Ingestion Summary & Stats Modal */}
      {showStatsModal && statsData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1150, padding: '20px'
        }}>
          <div className="card animate-scale-up" style={{ 
            width: '100%', maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', 
            padding: 0, border: '1px solid var(--border-color)', overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)', background: 'var(--bg-surface)'
          }}>
            
            {/* Modal Header */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)' }}>
              <CheckCircle size={26} color="#10B981" style={{ marginRight: '12px' }} />
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 'bold', color: 'var(--text-primary)' }}>Ingestion Summary & Performance Metrics</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>File: <strong style={{ color: 'var(--text-primary)' }}>{statsData.filename}</strong></span>
              </div>
              <button 
                onClick={() => setShowStatsModal(false)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Stats High-Impact Counters Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>Total Rows Parsed</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{statsData.totalRows}</div>
                </div>
                <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--success)', marginBottom: '6px', fontWeight: 600 }}>Successfully Ingested</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--success)' }}>{statsData.ingested}</div>
                </div>
                <div style={{ 
                  padding: '16px', 
                  background: statsData.flagged > 0 ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-elevated)', 
                  border: statsData.flagged > 0 ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid var(--border-color)', 
                  borderRadius: '10px', textAlign: 'center' 
                }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: statsData.flagged > 0 ? 'var(--warning)' : 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Remediation Flags</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: statsData.flagged > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>{statsData.flagged}</div>
                </div>
              </div>

              {/* Contamination Clean Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '14px 18px', borderRadius: '8px' }}>
                <CheckCircle size={18} color="#10B981" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Filing Registry Cleared:</strong> Automated contamination check completed successfully. 0 records from foreign registries detected.
                </div>
              </div>

              {/* Column Mapping Section */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="var(--primary-glow)" /> Confirmed Column Mapping Config
                </h3>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-surface)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Universal Schema Field</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Mapped Excel Header</th>
                      </tr>
                    </thead>
                    <tbody>
                      {REQUIRED_SCHEMA_FIELDS.map(field => {
                        const sourceHeader = statsData.mapping[field.key];
                        return (
                          <tr key={field.key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)', fontWeight: 500 }}>{field.label}</td>
                            <td style={{ padding: '8px 12px' }}>
                              {sourceHeader ? (
                                <span className="badge badge-success" style={{ padding: '3px 8px', fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}>
                                  {sourceHeader}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>-- Unmapped / Skipped --</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '20px 28px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', justifyContent: 'flex-end', background: 'var(--bg-elevated)' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowStatsModal(false)}
                style={{ border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', padding: '10px 20px', borderRadius: '6px' }}
              >
                Close Summary
              </button>
              
              {statsData.flagged > 0 && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    setShowStatsModal(false);
                     navigate(isEFPIA ? '/efpia/remediation' : (isColombia ? '/colombia/remediation' : (isItaly ? '/italy/remediation' : (isKorea ? '/korea/remediation' : '/datacenter'))));
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '6px', background: 'var(--warning)', border: '1px solid var(--warning)', color: 'white', fontWeight: 600 }}
                >
                  Resolve Flags ({statsData.flagged}) <ArrowRight size={16} />
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Recent Uploads Card */}
      <div className="card" style={{ marginTop: '32px' }}>
        <h3 style={{ marginBottom: '20px' }}>Recent Uploads</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Date Uploaded</th>
                <th>Records Ingested</th>
                <th>Remediation Flags</th>
              </tr>
            </thead>
            <tbody>
              {recentUploads.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No recent uploads</td>
                </tr>
              ) : (
                recentUploads.map((upload, idx) => (
                  <tr key={idx}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileSpreadsheet size={16} color="var(--primary-accent)" />
                      {upload.filename}
                    </td>
                    <td>{upload.date}</td>
                    <td>{upload.ingested}</td>
                    <td>
                      {upload.flagged > 0 ? (
                        <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                          <AlertTriangle size={14} /> {upload.flagged} Flagged
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                          <CheckCircle size={14} /> Clean
                        </span>
                      )}
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

export default Ingestion;
