import { useState, useCallback } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle, AlertTriangle, Sparkles, ArrowRight, X, SlidersHorizontal } from 'lucide-react';
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

// Synonyms for client-side fuzzy column mapping across English, Italian, Spanish, Korean, and Japanese
const SCHEMA_SYNONYMS: Record<string, string[]> = {
  recipientType: [
    'recipient type', 'type', 'recipienttype', 'tipo', '区分', '対象区分', '対象者区分', '대상 구분', '대상구분', 'tipologia', 'recipient_type'
  ],
  recipientName: [
    'recipient name', 'name', 'nom', 'beneficiario', '医師名', 'お名前', '施設名', '対象者名', '수령인', '수령인명', 'nombre', 'nombre del beneficiario', 'recipient_name', 'recipient institution/hco', 'recipient organization', 'hcp name'
  ],
  licenseNumber: [
    'license', 'tax', 'nit', 'fiscale', 'rpps', 'npi', 'code', '医師免許番号', '登録番号', '免許番号', '識別番号', '면허번호', '등록번호', 'codice fiscale', 'partita iva', 'nit o identificacion', 'tax id / license number', 'registration code', 'hco registration code', 'license number / id'
  ],
  workplaceInstitution: [
    'workplace', 'institution', 'hospital', 'clinic', 'struttura', 'lugar de trabajo', '勤務先', '所属機関', '所属施設', '病院名', '근무지', '소속기관', 'hospital/clinic', 'affiliated institution', 'affiliated healthcare institution', 'workplace institution'
  ],
  specialtyDepartment: [
    'specialty', 'department', '診療科', '所属部局', '専門分野', '部局', '진료과', '전공', 'specialty department', 'specialty/department'
  ],
  spendCategory: [
    'category', 'spend', 'benefit', 'tipologia', 'tipo', 'convenzione', 'donazione', 'desembolso', '資金区分', '費用区分', '区分項目', '지급 항목', '지급항목', 'spend category', 'category of benefit', 'jpma category', 'benefit category'
  ],
  dateOfProvision: [
    'date', 'provision', 'transfer', 'fecha', 'data', '支払年月日', '提供年月日', '日付', '年月日', '제공 일자', '제공일자', 'date of provision', 'date of transfer', 'date of value transfer'
  ],
  placeOfProvision: [
    'place', 'city', 'state', 'location', 'luogo', '提供場所', '実施場所', '場所', '제공 장소', '제공장소', 'place of provision'
  ],
  purposeOfBenefit: [
    'purpose', 'purpose of benefit', 'agreement', 'collaboration', 'event', 'meeting', 'congress', 'reunión', 'viaje', '目的', '使途', '提供目的', '内容', '제공 목적', '제공목적', 'clinical trial / study name', 'purpose of donation', 'consulting / lecture description', 'information dissemination details', 'meeting/event purpose', 'purpose (meeting/congress name)'
  ],
  amountOriginal: [
    'amount', 'valore', 'value', 'importo', 'valor', 'montant', '金額', '支払金額', '支払額', '価格', '금액', '지급액', 'amount original', 'amount (krw)', 'amount (eur)', 'amount (cop)', 'amount (usd)', 'amount (jpy)', 'contribution amount (eur)', 'r&d spend (jpy)', 'lecture fees (jpy)', 'cost (jpy)'
  ],
  details: [
    'details', 'notes', 'description', 'phase', 'project', 'materials', 'spec', '詳細', '備考', '内訳', '製品名', '상세', '비고', 'additional details', 'phase/details', 'project details', 'materials details', 'expense details'
  ]
};

const findBestHeaderMatch = (fieldKey: string, headers: string[]): string => {
  const synonyms = SCHEMA_SYNONYMS[fieldKey] || [];
  const normalize = (str: string) => 
    str.toLowerCase().replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uac00-\ud7a3]/g, '');

  const normalizedSynonyms = synonyms.map(s => normalize(s));

  // 1. Exact normalized match
  for (const header of headers) {
    const normHeader = normalize(header);
    if (normalizedSynonyms.includes(normHeader)) {
      return header;
    }
  }

  // 2. Substring match fallback
  for (const header of headers) {
    const normHeader = normalize(header);
    for (const normSyn of normalizedSynonyms) {
      if (normSyn.length > 3 && (normHeader.includes(normSyn) || normSyn.includes(normHeader))) {
        return header;
      }
    }
  }

  return '';
};

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
  const isJapan = location.pathname.includes('/japan');
  
  const countryCode = isEFPIA ? 'EU' : (isColombia ? 'CO' : (isItaly ? 'IT' : (isKorea ? 'KR' : (isJapan ? 'JP' : ''))));

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
  const [aiMappedKeys, setAiMappedKeys] = useState<string[]>([]);

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
        row['Tax ID / License Number'] !== undefined ||
        row['Contribution Amount (EUR)'] !== undefined
      );

      const hasJapanHeaders = json.some((row: any) => 
        row['Amount (JPY)'] !== undefined || 
        row['JPMA Category'] !== undefined || 
        row['医師免許番号'] !== undefined || 
        row['Japan Sunshine'] !== undefined
      );

      const hasEuropeanIdentifiers = json.some((row: any) =>
        Object.values(row as object).some(val => 
          typeof val === 'string' && 
          (/HCP-(ITA|FRA|POL|GER|SWI|SWE|BEL|SPA|IRE|UNI|AUS|NET)/i.test(val) || 
           /^(Italy|France|Poland|Germany|Switzerland|Sweden|Belgium|Spain|Ireland|United Kingdom|Austria|Netherlands)$/i.test(val))
        )
      );

      if (countryCode === 'KR' && (hasItalianHeaders || hasColombianHeaders || hasEFPIAHeaders || hasEuropeanIdentifiers || hasJapanHeaders)) {
        alert("Contamination Warning: The uploaded dataset contains European, Colombian or Japanese disclosures, which cannot be loaded into the South Korea Sunshine Act registry. Ingestion rejected to prevent database contamination.");
        setIsUploading(false);
        return;
      }

      if (countryCode === 'IT' && (hasKoreanHeaders || hasColombianHeaders || hasEFPIAHeaders || hasJapanHeaders)) {
        alert("Contamination Warning: The uploaded dataset contains South Korean Won (KRW), EFPIA, Colombian Peso or Japanese disclosures, which cannot be loaded into the Italy Sanità Trasparente registry. Ingestion rejected to prevent database contamination.");
        setIsUploading(false);
        return;
      }

      if (countryCode === 'CO' && (hasKoreanHeaders || hasItalianHeaders || hasEFPIAHeaders || hasEuropeanIdentifiers || hasJapanHeaders)) {
        alert("Contamination Warning: The uploaded dataset contains South Korean Won (KRW), European EFPIA, Italian or Japanese disclosures, which cannot be loaded into the Colombia RTVSS registry. Ingestion rejected to prevent database contamination.");
        setIsUploading(false);
        return;
      }

      if (countryCode === 'EU' && (hasKoreanHeaders || hasColombianHeaders || hasJapanHeaders)) {
        alert("Contamination Warning: The uploaded dataset contains South Korean, Colombian or Japanese disclosures, which cannot be loaded into the Europe EFPIA registry. Ingestion rejected to prevent database contamination.");
        setIsUploading(false);
        return;
      }

      if (countryCode === 'JP' && (hasKoreanHeaders || hasItalianHeaders || hasColombianHeaders || hasEFPIAHeaders || hasEuropeanIdentifiers)) {
        alert("Contamination Warning: The uploaded dataset contains other country specific disclosures, which cannot be loaded into the Japan JPMA registry. Ingestion rejected to prevent database contamination.");
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
        const mappedByAI: string[] = [];

        REQUIRED_SCHEMA_FIELDS.forEach(field => {
          // Find if there's an AI suggested header that maps to this universal key
          const matchedHeader = Object.keys(aiMapping).find(k => aiMapping[k] === field.key);
          if (matchedHeader) {
            finalMapping[field.key] = matchedHeader;
            mappedByAI.push(field.key);
          } else {
            // Client-side fallback fuzzy matching
            const fallback = findBestHeaderMatch(field.key, headers);
            finalMapping[field.key] = fallback || '';
          }
        });
        setColumnMapping(finalMapping);
        setAiMappedKeys(mappedByAI);
      } catch (err) {
        console.warn("AI Mapping failed, using standard mapping:", err);
        const finalMapping: Record<string, string> = {};
        REQUIRED_SCHEMA_FIELDS.forEach(field => {
          finalMapping[field.key] = findBestHeaderMatch(field.key, headers);
        });
        setColumnMapping(finalMapping);
        setAiMappedKeys([]);
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

  const downloadTemplate = (code: string) => {
    let headers: string[] = [];
    let sampleData: Record<string, any>[] = [];
    let filename = '';

    if (code === 'KR') {
      headers = [
        'Recipient Type', 'Recipient Name', 'License Number', 
        'Workplace', 'Specialty', 'Category of Benefit', 
        'Date of Provision', 'Place', 'Purpose', 'Details', 'Amount (KRW)'
      ];
      sampleData = [{
        'Recipient Type': 'HCP',
        'Recipient Name': 'Dr. Min-Seok Kim',
        'License Number': 'MD-74829',
        'Workplace': 'Seoul National University Hospital',
        'Specialty': 'Cardiology',
        'Category of Benefit': 'CONSULTANCY',
        'Date of Provision': '2026-04-12',
        'Place': 'Seoul',
        'Purpose': 'Advisory Board Meeting',
        'Details': 'Q2 Cardiology Panel',
        'Amount (KRW)': 350000
      }];
      filename = 'template_south_korea_sunshine.xlsx';
    } else if (code === 'IT') {
      headers = [
        'Recipient Type', 'Recipient Name', 'License Number', 
        'Workplace', 'Specialty', 'Category of Benefit', 
        'Date of Provision', 'Place', 'Purpose', 'Details', 'Amount (EUR)'
      ];
      sampleData = [{
        'Recipient Type': 'HCP',
        'Recipient Name': 'Dr. Giovanni Rossi',
        'License Number': 'RSSGNN80A01H501Z',
        'Workplace': 'Ospedale San Raffaele',
        'Specialty': 'Neurology',
        'Category of Benefit': 'CONVENZIONI',
        'Date of Provision': '2026-03-24',
        'Place': 'Milano',
        'Purpose': 'Clinical Study Collaboration Agreement',
        'Details': 'Protocol 4082-A',
        'Amount (EUR)': 1200
      }];
      filename = 'template_italy_sanita_trasparente.xlsx';
    } else if (code === 'CO') {
      headers = [
        'Recipient Type', 'Recipient Name', 'License Number', 
        'Workplace', 'Specialty', 'Category of Benefit', 
        'Date of Provision', 'Place', 'Purpose', 'Details', 'Amount (COP)'
      ];
      sampleData = [{
        'Recipient Type': 'HCP',
        'Recipient Name': 'Dr. Carlos Mendoza',
        'License Number': '80192834',
        'Workplace': 'Clinica de Marly',
        'Specialty': 'Pediatrics',
        'Category of Benefit': 'SAMPLES',
        'Date of Provision': '2026-01-20',
        'Place': 'Bogotá',
        'Purpose': 'Medical Samples Provision',
        'Details': 'Infant nutrition formula samples',
        'Amount (COP)': 320000
      }];
      filename = 'template_colombia_rtvss.xlsx';
    } else if (code === 'EU') {
      headers = [
        'Company Name', 'Recipient Name', 'Recipient Type', 
        'Tax ID / License Number', 'Affiliated Healthcare Institution', 'Date of Value Transfer', 
        'Purpose (Meeting/Congress Name)', 'Contribution Amount (EUR)'
      ];
      sampleData = [{
        'Company Name': 'Qordata Europe (Demo)',
        'Recipient Name': 'Dr. Hans Mueller',
        'Recipient Type': 'HCP',
        'Tax ID / License Number': 'DE-1928472',
        'Affiliated Healthcare Institution': 'Charite Berlin',
        'Date of Value Transfer': '2026-03-15',
        'Purpose (Meeting/Congress Name)': 'European Cardiology Congress 2026',
        'Contribution Amount (EUR)': 450
      }];
      filename = 'template_europe_efpia.xlsx';
    } else if (code === 'JP') {
      headers = [
        'Recipient Type', 'Recipient Name', 'License Number', 
        'Workplace', 'Specialty', 'Category of Benefit', 
        'Date of Provision', 'Place', 'Purpose', 'Details', 'Amount (JPY)'
      ];
      sampleData = [{
        'Recipient Type': 'HCP',
        'Recipient Name': 'Dr. Taro Yamada (山田 太郎)',
        'License Number': 'JP-8849201',
        'Workplace': 'Tokyo University Hospital',
        'Specialty': 'Oncology',
        'Category of Benefit': 'LECTURE_FEES',
        'Date of Provision': '2026-03-22',
        'Place': 'Tokyo',
        'Purpose': 'JPMA Oncology Symposium Lecture',
        'Details': 'Speaker Fee',
        'Amount (JPY)': 50000
      }];
      filename = 'template_japan_jpma.xlsx';
    }

    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporting Template');
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div>
      <h1 className="page-title">Local Data Ingestion ({isEFPIA ? 'Europe (EFPIA)' : (isColombia ? 'Colombia' : (isItaly ? 'Italy' : (isKorea ? 'South Korea' : (isJapan ? 'Japan' : ''))))})</h1>
      <p className="page-subtitle">Upload spend records from external sources for {isEFPIA ? 'Europe EFPIA Disclosure Code' : (isColombia ? 'Colombia Resolution 2881' : (isItaly ? 'Italy Sanità Trasparente' : (isKorea ? 'K-Sunshine Act' : (isJapan ? 'JPMA Transparency Guidelines' : ''))))} validation.</p>

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
              
              <button 
                type="button"
                onClick={() => downloadTemplate(countryCode)}
                className="btn btn-secondary" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  border: '1px solid var(--border-color)', 
                  color: 'var(--text-primary)', 
                  padding: '10px 20px', 
                  borderRadius: '6px', 
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Download Excel Template
              </button>
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
                            aiMappedKeys.includes(field.key) ? (
                              <span className="badge badge-success" style={{ padding: '6px 10px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                <Sparkles size={10} /> AI Mapped
                              </span>
                            ) : (
                              <span className="badge" style={{ padding: '6px 10px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                                <SlidersHorizontal size={10} /> Auto-Matched
                              </span>
                            )
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
                     navigate(isEFPIA ? '/efpia/remediation' : (isColombia ? '/colombia/remediation' : (isItaly ? '/italy/remediation' : (isKorea ? '/korea/remediation' : (isJapan ? '/japan/remediation' : '/datacenter')))));
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
