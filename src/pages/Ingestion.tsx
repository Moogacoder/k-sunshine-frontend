import { useState, useCallback } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLocation } from 'react-router-dom';
import { APIGateway } from '../datacenter/api_gateway';
import { parseAmount } from '../datacenter/validation';

interface UploadResult {
  filename: string;
  date: string;
  ingested: number;
  flagged: number;
}

const Ingestion = () => {
  const location = useLocation();
  const isItaly = location.pathname.includes('/italy');
  const isColombia = location.pathname.includes('/colombia');
  
  const countryCode = isColombia ? 'CO' : (isItaly ? 'IT' : 'KR');

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recentUploads, setRecentUploads] = useState<UploadResult[]>([]);

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

      // Verify country relevance (Contamination Check)
      const hasItalianHeaders = json.some((row: any) => 
        row['Codice Fiscale'] !== undefined || 
        row['Struttura'] !== undefined || 
        row['Tipologia'] !== undefined ||
        row['Amount (EUR)'] !== undefined
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

      if (countryCode === 'KR' && (hasItalianHeaders || hasColombianHeaders)) {
        alert("Contamination Warning: The uploaded dataset contains European or Colombian disclosures, which cannot be loaded into the South Korea Sunshine Act registry. Ingestion rejected to prevent database contamination.");
        setIsUploading(false);
        return;
      }

      if (countryCode === 'IT' && (hasKoreanHeaders || hasColombianHeaders)) {
        alert("Contamination Warning: The uploaded dataset contains South Korean Won (KRW) or Colombian Peso disclosures, which cannot be loaded into the Italy Sanità Trasparente registry. Ingestion rejected to prevent database contamination.");
        setIsUploading(false);
        return;
      }

      if (countryCode === 'CO' && (hasKoreanHeaders || hasItalianHeaders)) {
        alert("Contamination Warning: The uploaded dataset contains South Korean Won (KRW) or Italian disclosures, which cannot be loaded into the Colombia RTVSS registry. Ingestion rejected to prevent database contamination.");
        setIsUploading(false);
        return;
      }

      // Map the Excel headers to our backend schema
      const mappedData = json.map((row: any) => {
        const rawAmount = 
          row['Amount (EUR)'] ||
          row['Amount (KRW)'] ||
          row['Amount (USD)'] ||
          row['Amount'] ||
          row['amount'] ||
          row['Valore'] ||
          row['valore'] ||
          row['Importo'] ||
          row['importo'] ||
          row['Montant'] ||
          row['montant'] ||
          row['Value'] ||
          row['value'] ||
          0;
        
        return {
          recipientType: row['Recipient Type'] || 'HCP',
          recipientName: row['Recipient Name'] || row['Nom'] || row['Name'] || '',
          licenseNumber: String(row['License Number'] || row['RPPS'] || row['NPI'] || row['Codice Fiscale'] || ''),
          workplaceInstitution: row['Workplace'] || row['Hopital'] || row['Institution'] || row['Struttura'] || '',
          specialtyDepartment: row['Specialty'] || row['Specialite'] || row['Specializzazione'] || '',
          categoryOfBenefit: row['Category of Benefit'] || row['Categorie'] || row['Tipologia'] || row['Categoria de la Transferencia'] || (isColombia ? 'HONORARIOS' : (isItaly ? 'CONVENZIONI' : 'PRESENTATION')),
          dateOfProvision: row['Date of Provision'] || row['Date'] || row['Data'] ? new Date(row['Date of Provision'] || row['Date'] || row['Data']).toISOString() : new Date().toISOString(),
          placeOfProvision: row['Place'] || row['Lieu'] || row['Lieu'] || '',
          purposeOfBenefit: row['Purpose'] || row['Objet'] || row['Oggetto'] || '',
          amountOriginal: parseAmount(rawAmount),
          details: row['Details'] || row['Dettagli'] || ''
        };
      });

      // Ingest via the Central Data Center's target stream feeds
      const currentYear = new Date().getFullYear();
      const result = await APIGateway.ingestData(countryCode, currentYear, file.name, mappedData);

      if (result.success) {
        setRecentUploads(prev => [{
          filename: file.name,
          date: new Date().toLocaleDateString(),
          ingested: result.ingested,
          flagged: result.flagged
        }, ...prev]);
      } else {
        throw new Error('Failed to ingest data');
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to process file. Check console for details.');
    } finally {
      setIsUploading(false);
    }
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
      <h1 className="page-title">Local Data Ingestion ({isColombia ? 'Colombia' : (isItaly ? 'Italy' : 'South Korea')})</h1>
      <p className="page-subtitle">Upload spend records from external sources for {isColombia ? 'Colombia Resolution 2881' : (isItaly ? 'Italy Sanità Trasparente' : 'K-Sunshine Act')} validation.</p>

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
                href={isColombia ? "/colombian_hcp_transactions_1000.csv" : (isItaly ? "/italian_hcp_transactions_1000.csv" : "/K_Sunshine_Upload_Template.csv")} 
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
