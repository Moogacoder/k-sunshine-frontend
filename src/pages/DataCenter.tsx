import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Globe, Database, ShieldAlert, CheckCircle, Clock, X, FileText, ArrowRight } from 'lucide-react';
import { APIGateway, type UniversalTransaction, type IngestionBatch, type AuditLog } from '../datacenter/api_gateway';
import * as XLSX from 'xlsx';
import { parseAmount, validateReportingCompleteness } from '../datacenter/validation';
import { useLanguage } from '../components/LanguageContext';

declare const L: any;

interface DataCenterProps {
  defaultTab?: 'overview' | 'compliance_map' | 'uploader' | 'transactions' | 'source_files';
}

const DataCenter: React.FC<DataCenterProps> = ({ defaultTab }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'compliance_map' | 'uploader' | 'transactions' | 'source_files'>(defaultTab || 'overview');
  const [mapMetricFilter, setMapMetricFilter] = useState<'ingested' | 'pushed' | 'reports'>('ingested');

  useEffect(() => {
    setActiveTab(defaultTab || 'overview');
  }, [defaultTab]);

  
  // States holding mock central database feeds
  const [transactions, setTransactions] = useState<UniversalTransaction[]>([]);
  const [committedTransactions, setCommittedTransactions] = useState<UniversalTransaction[]>([]);
  const [batches, setBatches] = useState<IngestionBatch[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Dual-view admin control center state
  const [reviewView, setReviewView] = useState<'pending' | 'committed'>('pending');
  const [selectedReviewBatchId, setSelectedReviewBatchId] = useState<string | null>(null);
  const [commitBatchId, setCommitBatchId] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [allStagingTransactions, setAllStagingTransactions] = useState<UniversalTransaction[]>([]);


  // Ingestion form state
  const [targetCountry, setTargetCountry] = useState<string>('KR');
  const [targetYear, setTargetYear] = useState<number>(2026);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Sorting and advanced filtering states



  // Inline row editor states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<UniversalTransaction>>({});

  // History audit modal state
  const [selectedHistoryTxId, setSelectedHistoryTxId] = useState<string | null>(null);

  // Source files snapshot view state
  const [selectedSourceFileId, setSelectedSourceFileId] = useState<string | null>(null);

  // Committing staging state
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [isCertified, setIsCertified] = useState<boolean>(false);
  const [workflowTrigger, setWorkflowTrigger] = useState<number>(0);

  useEffect(() => {
    // Load live central database feed asynchronously
    const loadData = async () => {
      const txs = await APIGateway.getTransactions('GLOBAL');
      const bts = await APIGateway.getBatches();
      const committedTxs = await APIGateway.getCommittedTransactions();
      setTransactions(txs);
      setBatches(bts);
      setCommittedTransactions(committedTxs);
      
      const globalStaging = await APIGateway.getTransactions('GLOBAL');
      setAllStagingTransactions(globalStaging);
    };
    loadData();
  }, [workflowTrigger]);

  // Setup Leaflet map instance ref
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  useEffect(() => {
    // If we're not on the compliance_map tab, clean up map if it exists
    if (activeTab !== 'compliance_map') {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = {};
      return;
    }

    // Leaflet map initialization
    if (typeof window === 'undefined' || !(window as any).L) {
      return;
    }

    const L = (window as any).L;

    // Check if the container element is ready in the DOM
    const container = document.getElementById('global-telemetry-map');
    if (!container) return;

    // If map isn't created yet, initialize it
    if (!mapRef.current) {
      const map = L.map('global-telemetry-map', {
        center: [25, 10],
        zoom: 2,
        minZoom: 1.5,
        maxZoom: 10,
        zoomControl: true,
        attributionControl: false
      });

      // Add CartoDB Positron elegant light theme
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(map);

      mapRef.current = map;
    }

    const map = mapRef.current;
    const countries = ['KR', 'IT', 'FR', 'US', 'CO'];

    // Coordinates mapping
    const coords: { [key: string]: [number, number] } = {
      KR: [37.5665, 126.9780], // Seoul
      IT: [41.9028, 12.4964],  // Rome
      FR: [48.8566, 2.3522],   // Paris
      US: [38.9072, -77.0369], // Washington D.C.
      CO: [4.7110, -74.0721]   // Bogotá
    };

    // Calculate max value for the active metric to normalize sizes
    const activeMetric = mapMetricFilter;
    const maxMetricValue = Math.max(
      ...countries.map(c => {
        const stats = getCountryStats(c);
        if (activeMetric === 'ingested') return stats.ingested;
        if (activeMetric === 'pushed') return stats.pushed;
        return stats.reports;
      })
    ) || 1;

    // Remove existing markers if any
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    // Loop through countries and add dynamic circle markers
    countries.forEach(code => {
      const stats = getCountryStats(code);
      const latlng = coords[code];
      if (!latlng) return;

      let val = 0;
      if (activeMetric === 'ingested') val = stats.ingested;
      else if (activeMetric === 'pushed') val = stats.pushed;
      else if (activeMetric === 'reports') val = stats.reports;

      const ratio = val / maxMetricValue;
      const radius = 10 + ratio * 24; 
      
      const circle = L.circleMarker(latlng, {
        radius: radius,
        fillColor: stats.color,
        fillOpacity: 0.6,
        color: stats.color,
        weight: 1.5,
        opacity: 0.8
      }).addTo(map);

      markersRef.current[code] = circle;

      circle.on('mouseover', () => {
        setHoveredCountry(code);
        circle.setStyle({
          weight: 3.5,
          fillOpacity: 0.9
        });
      });

      circle.on('mouseout', () => {
        setHoveredCountry(null);
        circle.setStyle({
          weight: 1.5,
          fillOpacity: 0.6
        });
      });

      circle.on('click', () => {
        if (code === 'KR') {
          navigate('/dashboard');
        } else if (code === 'IT') {
          navigate('/italy/dashboard');
        } else if (code === 'CO') {
          navigate('/colombia/dashboard');
        } else {
          alert(`Compliance Portal: The local reporting database for ${stats.name} is active in staging. Standard operations are currently logged via the primary data load queues.`);
        }
      });

      const tooltipContent = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; padding: 4px; min-width: 150px;">
          <div style="font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
            <span style="font-size: 1.15rem;">${stats.flag}</span>
            <span style="color: #0f172a;">${stats.name}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
            <span style="color: #64748b;">Uploaded Ingests:</span>
            <span style="font-weight: 600; color: #0f172a;">${stats.ingested.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
            <span style="color: #64748b;">Registries Pushed:</span>
            <span style="font-weight: 600; color: #10b981;">${stats.pushed.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem;">
            <span style="color: #64748b;">MOHW Reports (2026):</span>
            <span style="font-weight: 600; color: ${stats.color};">${stats.reports}</span>
          </div>
        </div>
      `;

      circle.bindTooltip(tooltipContent, {
        direction: 'top',
        className: 'leaflet-glass-tooltip',
        opacity: 0.96,
        sticky: true
      });
    });

  }, [activeTab, mapMetricFilter, allStagingTransactions, committedTransactions]);

  // Sync hovered state from list to map circle marker styling
  useEffect(() => {
    if (!mapRef.current) return;
    Object.entries(markersRef.current).forEach(([code, marker]) => {
      const isHovered = hoveredCountry === code;
      marker.setStyle({
        weight: isHovered ? 3.5 : 1.5,
        fillOpacity: isHovered ? 0.9 : 0.6
      });
    });
  }, [hoveredCountry]);

  // Load audit logs when modal is shown
  useEffect(() => {
    const loadLogs = async () => {
      if (selectedHistoryTxId) {
        const logs = await APIGateway.getAuditLogs();
        setAuditLogs(logs);
      }
    };
    loadLogs();
  }, [selectedHistoryTxId]);

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

        // Content-based country verification before submission
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
          row['Amount (COP)'] !== undefined ||
          row['Valor Transferencia (COP)'] !== undefined
        );

        if (targetCountry === 'KR' && (hasItalianHeaders || hasColombianHeaders)) {
          throw new Error("Validation Error: The uploaded file contains European or Colombian specific columns, but target is set to South Korea [KR]. Ingestion blocked to prevent data contamination.");
        }
        if ((targetCountry === 'IT' || targetCountry === 'FR') && (hasKoreanHeaders || hasColombianHeaders)) {
          throw new Error("Validation Error: The uploaded file contains Korean Won or Colombian Peso specific columns, but target is set to European registries.");
        }
        if (targetCountry === 'CO' && (hasKoreanHeaders || hasItalianHeaders)) {
          throw new Error("Validation Error: The uploaded file contains Korean Won or Italian specific columns, but target is set to Colombia [CO]. Ingestion blocked to prevent data contamination.");
        }

        // Standardize headers dynamically based on target country rules
        const mockRows = json.map((row: any) => {
          // Detect original local currency amount based on uploader selection and fallbacks
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
            
          const amountOriginal = parseAmount(rawAmount);

          return {
            recipientType: row['Recipient Type'] || row['Type'] || 'HCP',
            recipientName: row['Recipient Name'] || row['Nom'] || row['Name'] || '',
            licenseNumber: String(row['License Number'] || row['RPPS'] || row['NPI'] || row['Codice Fiscale'] || ''),
            workplaceInstitution: row['Workplace'] || row['Hopital'] || row['Institution'] || row['Struttura'] || '',
            specialtyDepartment: row['Specialty'] || row['Specialite'] || row['Specializzazione'] || '',
            spendCategory: row['Category of Benefit'] || row['Categorie'] || row['Tipologia'] || 'PRESENTATION',
            dateOfProvision: row['Date of Provision'] || row['Date'] || row['Data'] ? new Date(row['Date of Provision'] || row['Date'] || row['Data']).toISOString() : new Date().toISOString(),
            placeOfProvision: row['Place'] || row['Lieu'] || row['Lieu'] || '',
            purposeOfBenefit: row['Purpose'] || row['Objet'] || row['Oggetto'] || '',
            details: row['Details'] || row['Dettagli'] || '',
            amountOriginal: amountOriginal
          };
        });

        const result = await APIGateway.ingestData(targetCountry, targetYear, selectedFile.name, mockRows);
        if (result.success) {
          // Reload central ledger
          const txs = await APIGateway.getTransactions('GLOBAL');
          const bts = await APIGateway.getBatches();
          const committedTxs = await APIGateway.getCommittedTransactions();
          setTransactions(txs);
          setBatches(bts);
          setCommittedTransactions(committedTxs);
          
          const globalStaging = await APIGateway.getTransactions('GLOBAL');
          setAllStagingTransactions(globalStaging);

          alert(`Ingestion Completed: Standardized ${result.ingested} records. ${result.flagged} flagged anomalies routed to Remediation.`);
          setActiveTab('overview');
          setSelectedFile(null);
        }
      } catch (err: any) {
        console.error('Failed central data mapping:', err);
        alert(err.message || 'Data center mapping failed. Check file column structure.');
      } finally {
        setIsUploading(false);
      }
    }, 500);
  };



  const handleEditClick = (tx: UniversalTransaction) => {
    setEditingId(tx.id);
    setEditFormData({
      recipientName: tx.recipientName,
      workplaceInstitution: tx.workplaceInstitution,
      specialtyDepartment: tx.specialtyDepartment,
      spendCategory: tx.spendCategory,
      dateOfProvision: tx.dateOfProvision.split('T')[0],
      purposeOfBenefit: tx.purposeOfBenefit,
      details: tx.details,
      amountOriginal: tx.amountOriginal
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const targetTx = transactions.find(t => t.id === id);
      if (!targetTx) return;

      const origAmount = editFormData.amountOriginal !== undefined ? parseAmount(editFormData.amountOriginal) : targetTx.amountOriginal;
      
      // Calculate updated normalized USD amount based on country rules
      let amountUSD = origAmount;
      if (targetTx.countryCode === 'KR') amountUSD = origAmount / 1300;
      if (targetTx.countryCode === 'FR' || targetTx.countryCode === 'IT') amountUSD = origAmount * 1.09;
      if (targetTx.countryCode === 'CO') amountUSD = origAmount / 4000;
      
      const updatedTxFields = {
        recipientType: targetTx.recipientType,
        recipientName: editFormData.recipientName !== undefined ? editFormData.recipientName : targetTx.recipientName,
        licenseNumber: targetTx.licenseNumber,
        workplaceInstitution: editFormData.workplaceInstitution !== undefined ? editFormData.workplaceInstitution : targetTx.workplaceInstitution,
        specialtyDepartment: editFormData.specialtyDepartment !== undefined ? editFormData.specialtyDepartment : targetTx.specialtyDepartment,
        spendCategory: editFormData.spendCategory !== undefined ? editFormData.spendCategory : targetTx.spendCategory,
        dateOfProvision: editFormData.dateOfProvision ? new Date(editFormData.dateOfProvision).toISOString() : targetTx.dateOfProvision,
        placeOfProvision: targetTx.placeOfProvision,
        purposeOfBenefit: editFormData.purposeOfBenefit !== undefined ? editFormData.purposeOfBenefit : targetTx.purposeOfBenefit,
        details: editFormData.details !== undefined ? editFormData.details : targetTx.details,
        amountOriginal: origAmount
      };

      const completeness = validateReportingCompleteness(targetTx.countryCode, updatedTxFields);
      
      // Dynamic Policy Limits Re-evaluation on save
      const limitExceeded = 
        (targetTx.countryCode === 'KR' && origAmount > 500000) ||
        ((targetTx.countryCode === 'FR' || targetTx.countryCode === 'IT') && origAmount > 150) ||
        (targetTx.countryCode === 'CO' && origAmount > 1500000) ||
        (targetTx.countryCode === 'US' && origAmount > 500);

      const updatedValues: Partial<UniversalTransaction> = {
        recipientName: updatedTxFields.recipientName,
        workplaceInstitution: updatedTxFields.workplaceInstitution,
        specialtyDepartment: updatedTxFields.specialtyDepartment,
        spendCategory: updatedTxFields.spendCategory,
        dateOfProvision: updatedTxFields.dateOfProvision,
        purposeOfBenefit: updatedTxFields.purposeOfBenefit,
        details: updatedTxFields.details,
        amountOriginal: origAmount,
        amountUSD: parseFloat(amountUSD.toFixed(2)),
        remediationStatus: (limitExceeded || !completeness.isComplete) ? 'PENDING_REVIEW' : 'APPROVED'
      };

      const success = await APIGateway.updateTransaction(id, updatedValues);
      if (success) {
        // Reload transactions from the central source of truth
        const txs = await APIGateway.getTransactions('GLOBAL');
        const committedTxs = await APIGateway.getCommittedTransactions();
        setTransactions(txs);
        setCommittedTransactions(committedTxs);
        
        const globalStaging = await APIGateway.getTransactions('GLOBAL');
        setAllStagingTransactions(globalStaging);

        setEditingId(null);
        setEditFormData({});
      } else {
        alert("Failed to update transaction in database.");
      }
    } catch (err) {
      console.error("Error saving inline edit in global explorer:", err);
    }
  };

  const handleOpenReviewModal = (batchId: string | null) => {
    setIsCertified(false);
    setCommitBatchId(batchId);
    setShowReviewModal(true);
  };

  const handleConfirmCommit = async () => {
    if (!isCertified) return;
    setIsCommitting(true);
    try {
      const result = await APIGateway.commitStaging(commitBatchId || undefined);
      if (result.success) {
        const txs = await APIGateway.getTransactions('GLOBAL');
        const bts = await APIGateway.getBatches();
        const committedTxs = await APIGateway.getCommittedTransactions();
        setTransactions(txs);
        setBatches(bts);
        setCommittedTransactions(committedTxs);
        
        const globalStaging = await APIGateway.getTransactions('GLOBAL');
        setAllStagingTransactions(globalStaging);

        setShowReviewModal(false);
        setSelectedReviewBatchId(null);
        setCommitBatchId(null);
        alert(result.message || "Successfully committed records to production registries!");
      } else {
        alert("Failed to commit staging records: " + (result.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Error committing staging buffer:", err);
      alert("Failed to communicate with ETL API service.");
    } finally {
      setIsCommitting(false);
    }
  };

  const handlePurgeDatabases = async () => {
    if (window.confirm("⚠️ DANGER: Are you sure you want to purge all SQL databases? This will delete all staging records, production country registries, files, and audit logs. This action is irreversible!")) {
      try {
        const success = await APIGateway.purgeDatabases();
        if (success) {
          const txs = await APIGateway.getTransactions('GLOBAL');
          const bts = await APIGateway.getBatches();
          const committedTxs = await APIGateway.getCommittedTransactions();
          setTransactions(txs);
          setBatches(bts);
          setCommittedTransactions(committedTxs);
          
          const globalStaging = await APIGateway.getTransactions('GLOBAL');
          setAllStagingTransactions(globalStaging);

          alert("All database registries have been purged and reset successfully!");
        } else {
          alert("Failed to purge database registries.");
        }
      } catch (err) {
        console.error("Purge error:", err);
        alert("Failed to communicate with administrative service.");
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, field: string) => {
    setEditFormData({ ...editFormData, [field]: e.target.value });
  };

  const downloadTemplate = (countryCode: string) => {
    let headers: string[] = [];
    let sampleData: Record<string, any>[] = [];
    let filename = '';

    if (countryCode === 'KR') {
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
      }, {
        'Recipient Type': 'HCO',
        'Recipient Name': 'Korean Medical Association',
        'License Number': 'CO-19384',
        'Workplace': '',
        'Specialty': '',
        'Category of Benefit': 'CONFERENCE_SUPPORT',
        'Date of Provision': '2026-05-18',
        'Place': 'Busan',
        'Purpose': 'Annual Symposium Sponsor',
        'Details': 'Platinum Sponsor Package',
        'Amount (KRW)': 2500000
      }];
      filename = 'template_south_korea_sunshine.xlsx';
    } else if (countryCode === 'IT') {
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
      }, {
        'Recipient Type': 'HCO',
        'Recipient Name': 'Associazione Cardiologi Italiani',
        'License Number': '12345678901',
        'Workplace': 'Associazione',
        'Specialty': '',
        'Category of Benefit': 'DONAZIONI',
        'Date of Provision': '2026-04-05',
        'Place': 'Roma',
        'Purpose': 'Educational Grant',
        'Details': 'Echocardiograph Donation',
        'Amount (EUR)': 4500
      }];
      filename = 'template_italy_sanita_trasparente.xlsx';
    } else if (countryCode === 'FR') {
      headers = [
        'Recipient Type', 'Recipient Name', 'License Number', 
        'Workplace', 'Specialty', 'Category of Benefit', 
        'Date of Provision', 'Place', 'Purpose', 'Details', 'Amount (EUR)'
      ];
      sampleData = [{
        'Recipient Type': 'HCP',
        'Recipient Name': 'Dr. Marie Dupont',
        'License Number': '10101928472',
        'Workplace': 'Centre Hospitalier Universitaire',
        'Specialty': 'Oncology',
        'Category of Benefit': 'PRESENTATION',
        'Date of Provision': '2026-02-15',
        'Place': 'Paris',
        'Purpose': 'Symposium Speaker Fee',
        'Details': 'Immuno-Oncology breakthroughs presentation',
        'Amount (EUR)': 150
      }];
      filename = 'template_france_loi_bertrand.xlsx';
    } else if (countryCode === 'US') {
      headers = [
        'Recipient Type', 'Recipient Name', 'License Number', 
        'Workplace', 'Specialty', 'Category of Benefit', 
        'Date of Provision', 'Place', 'Purpose', 'Details', 'Amount (USD)'
      ];
      sampleData = [{
        'Recipient Type': 'HCP',
        'Recipient Name': 'Dr. Sarah Jenkins',
        'License Number': '1982740192',
        'Workplace': 'Mayo Clinic',
        'Specialty': 'Endocrinology',
        'Category of Benefit': 'CONSULTANCY',
        'Date of Provision': '2026-05-10',
        'Place': 'Rochester',
        'Purpose': 'Speaker Honorarium',
        'Details': 'Type 2 Diabetes Therapeutics',
        'Amount (USD)': 450
      }];
      filename = 'template_usa_cms_openpayments.xlsx';
    } else if (countryCode === 'CO') {
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
    }

    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporting Template');
    XLSX.writeFile(workbook, filename);
  };

  // Computations
  const getCountryStats = (code: string) => {
    const codeUpper = code.toUpperCase();
    const stagingCount = allStagingTransactions.filter(t => t.countryCode === codeUpper).length;
    const committedCount = committedTransactions.filter(t => t.countryCode === codeUpper).length;
    
    const ingested = stagingCount + committedCount;
    const pushed = committedCount;
    
    let name = '';
    let flag = '';
    let color = '';
    let coords = { x: 0, y: 0 };
    let reports = 0;
    
    if (codeUpper === 'KR') {
      name = 'South Korea';
      flag = '🇰🇷';
      color = '#8b5cf6'; // Purple
      coords = { x: 710, y: 145 };
      try {
        const cached = localStorage.getItem('k_sunshine_archived_reports');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            reports = parsed.filter((r: any) => String(r.reportYear) === '2026').length;
          }
        }
      } catch {
        reports = 0;
      }
    } else if (codeUpper === 'IT') {
      name = 'Italy';
      flag = '🇮🇹';
      color = '#ef4444'; // Crimson
      coords = { x: 455, y: 125 };
      try {
        const cached = localStorage.getItem('it_transparency_archived_reports');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            reports = parsed.filter((r: any) => String(r.reportYear) === '2026').length;
          }
        }
      } catch {
        reports = 0;
      }
    } else if (codeUpper === 'FR') {
      name = 'France';
      flag = '🇫🇷';
      color = '#3b82f6'; // Royal Blue
      coords = { x: 430, y: 110 };
      reports = 0;
    } else if (codeUpper === 'US') {
      name = 'United States';
      flag = '🇺🇸';
      color = '#f59e0b'; // Amber
      coords = { x: 200, y: 140 };
      reports = 0;
    } else if (codeUpper === 'CO') {
      name = 'Colombia';
      flag = '🇨🇴';
      color = '#0284c7'; // Sky Blue
      coords = { x: 280, y: 190 };
      try {
        const cached = localStorage.getItem('co_transparency_archived_reports');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            reports = parsed.filter((r: any) => String(r.reportYear) === '2026').length;
          }
        }
      } catch {
        reports = 0;
      }
    }
    
    return {
      name,
      flag,
      color,
      coords,
      ingested,
      pushed,
      reports
    };
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      {activeTab !== 'compliance_map' ? (
        <>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Database size={32} color="var(--primary-accent)" />
              <h1 className="page-title" style={{ margin: 0 }}>{t('datacenter.title')}</h1>
            </div>
          </div>

          {/* Tabs Menu */}
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <button 
              onClick={() => setActiveTab('overview')}
              className={`btn ${activeTab === 'overview' ? 'btn-primary' : ''}`}
              style={{ background: activeTab === 'overview' ? '' : 'transparent', color: activeTab === 'overview' ? '' : 'var(--text-secondary)', padding: '10px 16px', fontWeight: 600 }}
            >
              <Database size={18} /> {t('datacenter.incomingReview')}
            </button>
            <button 
              onClick={() => setActiveTab('uploader')}
              className={`btn ${activeTab === 'uploader' ? 'btn-primary' : ''}`}
              style={{ background: activeTab === 'uploader' ? '' : 'transparent', color: activeTab === 'uploader' ? '' : 'var(--text-secondary)', padding: '10px 16px', fontWeight: 600 }}
            >
              <UploadCloud size={18} /> {t('datacenter.loadData')}
            </button>

            <button 
              onClick={() => setActiveTab('source_files')}
              className={`btn ${activeTab === 'source_files' ? 'btn-primary' : ''}`}
              style={{ background: activeTab === 'source_files' ? '' : 'transparent', color: activeTab === 'source_files' ? '' : 'var(--text-secondary)', padding: '10px 16px', fontWeight: 600 }}
            >
              <FileText size={18} /> {t('datacenter.sourceExplorer')}
            </button>
          </div>
        </>
      ) : (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Globe size={32} color="var(--primary-accent)" />
            <h1 className="page-title" style={{ margin: 0 }}>{t('sidebar.globalDataStatus')}</h1>
          </div>
          <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {t('datacenter.telemetry')}
          </p>
        </div>
      )}

      {/* Overview Dashboard */}
      {activeTab === 'overview' && (() => {
        const pendingBatches = batches.filter(batch => transactions.some(tx => tx.batchId === batch.batchId));
        const committedBatches = batches.filter(batch => committedTransactions.some(tx => tx.batchId === batch.batchId));
        const stagingTotalUSD = transactions.reduce((sum, t) => sum + t.amountUSD, 0);
        const committedTotalUSD = committedTransactions.reduce((sum, t) => sum + t.amountUSD, 0);
        const pendingAlerts = transactions.filter(t => t.remediationStatus === 'PENDING_REVIEW').length;
        const activeBatchList = reviewView === 'pending' ? pendingBatches : committedBatches;
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Dual-View Toggler */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <div style={{
                display: 'flex',
                background: 'var(--bg-elevated)',
                padding: '4px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.01)'
              }}>
                <button
                  onClick={() => {
                    setReviewView('pending');
                    setSelectedReviewBatchId(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: reviewView === 'pending' ? 'var(--primary-accent)' : 'transparent',
                    color: reviewView === 'pending' ? 'white' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Clock size={16} />
                  <span>Pending Import (Staging)</span>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    background: reviewView === 'pending' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                    color: reviewView === 'pending' ? 'white' : 'var(--text-primary)'
                  }}>
                    {transactions.length}
                  </span>
                </button>
                
                <button
                  onClick={() => {
                    setReviewView('committed');
                    setSelectedReviewBatchId(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: reviewView === 'committed' ? 'var(--primary-accent)' : 'transparent',
                    color: reviewView === 'committed' ? 'white' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <CheckCircle size={16} />
                  <span>Committed Archives (Prod DB)</span>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    background: reviewView === 'committed' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                    color: reviewView === 'committed' ? 'white' : 'var(--text-primary)'
                  }}>
                    {committedTransactions.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Commit / Success Action Banners */}
            {reviewView === 'pending' ? (
              (() => {
                if (!selectedReviewBatchId) {
                  return null;
                }
                
                const targetBatch = batches.find(b => b.batchId === selectedReviewBatchId);
                const batchRecords = transactions.filter(t => t.batchId === selectedReviewBatchId);
                if (!targetBatch || batchRecords.length === 0) return null;
                
                return (
                  <div className="card" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(139, 92, 246, 0.12) 100%)',
                    border: '1px solid rgba(124, 58, 237, 0.25)',
                    borderRadius: '12px',
                    padding: '24px 30px',
                    boxShadow: '0 8px 32px 0 rgba(124, 58, 237, 0.03)',
                    backdropFilter: 'blur(8px)'
                  }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--primary-glow)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Database size={20} /> Ingest File Commit Queue - {targetBatch.sourceFileName}
                      </h3>
                      <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        This source file contains <strong>{batchRecords.length} records</strong>. Once approved and committed, they will be routed strictly to the <strong>{targetBatch.countryCode}</strong> compliance database.
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Workflow Status Dropdown Selection */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('workflow.statusTitle')}:</span>
                        <select
                          value={localStorage.getItem(`file_workflow_${targetBatch.countryCode}_${targetBatch.batchId}`) || 'NEEDS_REVIEW'}
                          onChange={(e) => {
                            const statusKey = `file_workflow_${targetBatch.countryCode}_${targetBatch.batchId}`;
                            localStorage.setItem(statusKey, e.target.value);
                            setWorkflowTrigger(prev => prev + 1);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            outline: 'none',
                            cursor: 'pointer',
                            fontFamily: 'inherit'
                          }}
                        >
                          <option value="NEEDS_REVIEW" style={{ background: 'var(--bg-surface)' }}>🔴 {t('workflow.needsReview')}</option>
                          <option value="IN_PROCESS" style={{ background: 'var(--bg-surface)' }}>🟡 {t('workflow.inProcess')}</option>
                          <option value="APPROVED" style={{ background: 'var(--bg-surface)' }}>🟢 {t('workflow.approved')}</option>
                        </select>
                      </div>

                      <button
                        onClick={() => handleOpenReviewModal(selectedReviewBatchId)}
                        disabled={isCommitting}
                        className="btn btn-primary"
                        style={{
                          padding: '12px 24px',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)'
                        }}
                      >
                        {isCommitting ? 'Pushing...' : (
                          <>Push to Country Database <ArrowRight size={18} /></>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              committedTransactions.length > 0 && (
                <div className="card" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(52, 211, 153, 0.06) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '12px',
                  padding: '24px 30px',
                  boxShadow: '0 8px 32px 0 rgba(16, 185, 129, 0.01)'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle size={20} /> Production Registry Feed Active
                    </h3>
                    <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      All <strong>{committedTransactions.length} records</strong> are successfully audited, cryptographically sealed, and archived inside regional databases.
                    </p>
                  </div>
                  <div className="badge badge-success" style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600 }}>
                    FEED_SYNC_OK
                  </div>
                </div>
              )
            )}

            {/* Dynamic KPI Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
              <div className="card">
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '8px' }}>
                  {reviewView === 'pending' ? 'STAGING CONSOLIDATED SPEND' : 'PRODUCTION ARCHIVED SPEND'}
                </h3>
                <div style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--primary-glow)' }}>
                  ${(reviewView === 'pending' ? stagingTotalUSD : committedTotalUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Normalized globally</p>
              </div>
              
              <div className="card">
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '8px' }}>
                  {reviewView === 'pending' ? 'STAGING SOURCE FILES' : 'COMMITTED ARCHIVED FILES'}
                </h3>
                <div style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {reviewView === 'pending' ? pendingBatches.length : committedBatches.length} Files
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>With active data records</p>
              </div>

              <div className="card">
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '8px' }}>
                  {reviewView === 'pending' ? 'PENDING COMPLIANCE ALERTS' : 'COMPLIANCE INTEGRITY STATUS'}
                </h3>
                <div style={{ fontSize: '1.7rem', fontWeight: 700, color: (reviewView === 'pending' && pendingAlerts > 0) ? 'var(--warning)' : 'var(--success)' }}>
                  {reviewView === 'pending' ? `${pendingAlerts} Flags` : '100% Compliant'}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {reviewView === 'pending' ? 'Awaiting statutory override' : 'Cryptographically verified'}
                </p>
              </div>

              <div className="card">
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '8px' }}>ACTIVE SYNCED ENDPOINTS</h3>
                <div style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--success)' }}>
                  {reviewView === 'pending' ? '5 Pending' : `${new Set(committedTransactions.map(t => t.countryCode)).size || 5} Sync'd`}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Korea [KR] | Italy [IT] | France [FR] | USA [US] | Colombia [CO]</p>
                </div>
            </div>

            {/* Split-Pane Source File Review Console */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch', minHeight: '550px' }}>
              
              {/* Left Pane: Ingested Source Files selector */}
              <div className="card" style={{ width: '380px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-elevated)' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} color="var(--primary-glow)" /> Ingested Source Files
                  </h3>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {reviewView === 'pending' 
                      ? 'Select loaded file to audit staging buffer.'
                      : 'Select archived file to view production records.'}
                  </p>
                </div>
                
                <div style={{ overflowY: 'auto', flex: 1, maxHeight: '600px', background: 'var(--bg-main)' }}>
                  {activeBatchList.length === 0 ? (
                    <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <Clock size={36} style={{ opacity: 0.15, marginBottom: '12px', margin: '0 auto' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>No active files in this view</div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {reviewView === 'pending' 
                          ? 'Upload new compliance records in the Ingest tab.'
                          : 'Commit staging buffer records to see archives here.'}
                      </p>
                    </div>
                  ) : (
                    activeBatchList.map(batch => {
                      const isSelected = selectedReviewBatchId === batch.batchId;
                      const activeRecords = (reviewView === 'pending' ? transactions : committedTransactions)
                        .filter(t => t.batchId === batch.batchId);
                      
                      const recordCount = activeRecords.length;
                      const totalOriginalVal = activeRecords.reduce((sum, t) => sum + t.amountOriginal, 0);
                      const originalCurrency = activeRecords[0]?.currencyOriginal || (batch.countryCode === 'KR' ? 'KRW' : 'EUR');
                      
                      const batchAlertsCount = activeRecords.filter(t => t.remediationStatus === 'PENDING_REVIEW').length;
                      
                      const statusKey = `file_workflow_${batch.countryCode}_${batch.batchId}`;
                      const workflowStatus = localStorage.getItem(statusKey) || 'NEEDS_REVIEW';
                      
                      return (
                        <div 
                          key={batch.batchId}
                          onClick={() => setSelectedReviewBatchId(batch.batchId)}
                          style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                            borderLeft: isSelected ? '3px solid var(--primary-accent)' : '3px solid transparent',
                            boxShadow: isSelected ? 'inset 0 0 12px rgba(124, 58, 237, 0.02)' : 'none',
                            transition: 'all 0.2s',
                          }}
                          className="file-card-hover"
                        >
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                              <FileText size={16} style={{ color: isSelected ? 'var(--primary-glow)' : 'var(--text-secondary)' }} /> 
                              {batch.sourceFileName}
                            </span>
                            <span className="badge" style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                              {batch.countryCode === 'KR' ? '🇰🇷 KR' : batch.countryCode === 'IT' ? '🇮🇹 IT' : batch.countryCode === 'FR' ? '🇫🇷 FR' : batch.countryCode === 'CO' ? '🇨🇴 CO' : '🇺🇸 US'}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            <span>{recordCount} records</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {originalCurrency} {totalOriginalVal.toLocaleString(undefined, { maximumFractionDigits: originalCurrency === 'KRW' ? 0 : 2, minimumFractionDigits: originalCurrency === 'KRW' ? 0 : 2 })}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {new Date(batch.uploadTimestamp).toLocaleDateString()}
                            </span>
                            
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span className={`badge ${workflowStatus === 'APPROVED' ? 'badge-success' : (workflowStatus === 'IN_PROCESS' ? 'badge-warning' : 'badge-danger')}`} style={{ fontSize: '0.65rem', padding: '2px 6px', whiteSpace: 'nowrap' }}>
                                {workflowStatus === 'APPROVED' ? t('workflow.approved') : (workflowStatus === 'IN_PROCESS' ? t('workflow.inProcess') : t('workflow.needsReview'))}
                              </span>

                              {reviewView === 'pending' ? (
                                batchAlertsCount > 0 ? (
                                  <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <ShieldAlert size={12} /> {batchAlertsCount} Flagged
                                  </span>
                                ) : (
                                  <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle size={12} /> Ready
                                  </span>
                                )
                              ) : (
                                <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.06)' }}>
                                  <CheckCircle size={12} /> Archived
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              
              {/* Right Pane: Records auditor grid */}
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                {selectedReviewBatchId ? (() => {
                  const targetBatch = batches.find(b => b.batchId === selectedReviewBatchId);
                  if (!targetBatch) return null;
                  
                  const activeRecords = (reviewView === 'pending' ? transactions : committedTransactions)
                    .filter(t => t.batchId === selectedReviewBatchId);
                  
                  return (
                    <>
                      {/* Grid Header details */}
                      <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                            <Database size={18} color="var(--primary-glow)" /> {targetBatch.sourceFileName}
                          </h3>
                          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            {reviewView === 'pending'
                              ? 'Interactive Staging Editor: Resolve completeness check violations inline.'
                              : 'Immutable Production Registry Archive: Locked statutory ledger logs.'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {/* Workflow Status Dropdown Selection */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('workflow.statusTitle')}:</span>
                            <select
                              value={localStorage.getItem(`file_workflow_${targetBatch.countryCode}_${targetBatch.batchId}`) || 'NEEDS_REVIEW'}
                              onChange={(e) => {
                                const statusKey = `file_workflow_${targetBatch.countryCode}_${targetBatch.batchId}`;
                                localStorage.setItem(statusKey, e.target.value);
                                setWorkflowTrigger(prev => prev + 1);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-primary)',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                outline: 'none',
                                cursor: 'pointer',
                                fontFamily: 'inherit'
                              }}
                            >
                              <option value="NEEDS_REVIEW" style={{ background: 'var(--bg-surface)' }}>🔴 {t('workflow.needsReview')}</option>
                              <option value="IN_PROCESS" style={{ background: 'var(--bg-surface)' }}>🟡 {t('workflow.inProcess')}</option>
                              <option value="APPROVED" style={{ background: 'var(--bg-surface)' }}>🟢 {t('workflow.approved')}</option>
                            </select>
                          </div>

                          <div className={`badge ${reviewView === 'pending' ? 'badge-warning' : 'badge-success'}`} style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}>
                            {reviewView === 'pending' ? 'Staging Buffer Registry' : 'Committed Country Tables'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Grid Records Table */}
                      <div style={{ overflow: 'auto', flex: 1, margin: 0 }} className="table-container">
                        {activeRecords.length === 0 ? (
                          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No active records found for this batch in the selected partition.
                          </div>
                        ) : (
                          <table style={{ margin: 0, width: '100%', tableLayout: 'auto' }}>
                            <thead>
                              <tr>
                                <th style={{ background: 'var(--bg-main)', padding: '12px 16px' }}>Record ID</th>
                                <th style={{ background: 'var(--bg-main)', padding: '12px 16px' }}>Recipient & Institution</th>
                                <th style={{ background: 'var(--bg-main)', padding: '12px 16px' }}>Category</th>
                                <th style={{ background: 'var(--bg-main)', padding: '12px 16px' }}>Benefit Provision details</th>
                                <th style={{ background: 'var(--bg-main)', padding: '12px 16px' }}>Original Spend</th>
                                <th style={{ background: 'var(--bg-main)', padding: '12px 16px' }}>Normalized USD</th>
                                <th style={{ background: 'var(--bg-main)', padding: '12px 16px' }}>Completeness Audit</th>
                                <th style={{ background: 'var(--bg-main)', padding: '12px 16px', minWidth: '120px' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeRecords.map(tx => {
                                const isEditing = editingId === tx.id;
                                
                                // Run dynamic validation checking on this record
                                const completeness = validateReportingCompleteness(tx.countryCode, {
                                  recipientName: isEditing ? (editFormData.recipientName !== undefined ? editFormData.recipientName : tx.recipientName) : tx.recipientName,
                                  workplaceInstitution: isEditing ? (editFormData.workplaceInstitution !== undefined ? editFormData.workplaceInstitution : tx.workplaceInstitution) : tx.workplaceInstitution,
                                  specialtyDepartment: isEditing ? (editFormData.specialtyDepartment !== undefined ? editFormData.specialtyDepartment : tx.specialtyDepartment) : tx.specialtyDepartment,
                                  spendCategory: isEditing ? (editFormData.spendCategory !== undefined ? editFormData.spendCategory : tx.spendCategory) : tx.spendCategory,
                                  dateOfProvision: tx.dateOfProvision,
                                  placeOfProvision: tx.placeOfProvision,
                                  purposeOfBenefit: isEditing ? (editFormData.purposeOfBenefit !== undefined ? editFormData.purposeOfBenefit : tx.purposeOfBenefit) : tx.purposeOfBenefit,
                                  details: isEditing ? (editFormData.details !== undefined ? editFormData.details : tx.details) : tx.details,
                                  amountOriginal: isEditing ? (editFormData.amountOriginal !== undefined ? parseAmount(editFormData.amountOriginal) : tx.amountOriginal) : tx.amountOriginal,
                                  licenseNumber: tx.licenseNumber
                                });
                                
                                const limitExceeded = 
                                  (tx.countryCode === 'KR' && (isEditing ? parseAmount(editFormData.amountOriginal) : tx.amountOriginal) > 500000) ||
                                  ((tx.countryCode === 'FR' || tx.countryCode === 'IT') && (isEditing ? parseAmount(editFormData.amountOriginal) : tx.amountOriginal) > 150) ||
                                  (tx.countryCode === 'CO' && (isEditing ? parseAmount(editFormData.amountOriginal) : tx.amountOriginal) > 1500000) ||
                                  (tx.countryCode === 'US' && (isEditing ? parseAmount(editFormData.amountOriginal) : tx.amountOriginal) > 500);
                                
                                return (
                                  <tr key={tx.id} style={{ background: isEditing ? 'rgba(124, 58, 237, 0.01)' : 'transparent', borderBottom: '1px solid var(--border-color)' }}>
                                    
                                    {/* 1. ID */}
                                    <td style={{ fontWeight: 'bold', fontSize: '0.8rem', padding: '12px 16px' }}>{tx.id}</td>
                                    
                                    {/* 2. Recipient & Institution */}
                                    <td style={{ padding: '12px 16px' }}>
                                      {isEditing ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                          <input 
                                            value={editFormData.recipientName || ''} 
                                            onChange={(e) => handleChange(e, 'recipientName')} 
                                            style={{ padding: '6px 8px', width: '130px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.85rem' }} 
                                            placeholder="Recipient Name" 
                                          />
                                          <input 
                                            value={editFormData.workplaceInstitution || ''} 
                                            onChange={(e) => handleChange(e, 'workplaceInstitution')} 
                                            style={{ padding: '4px 8px', width: '130px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-secondary)' }} 
                                            placeholder="Institution/Workplace" 
                                          />
                                        </div>
                                      ) : (
                                        <div>
                                          <div style={{ fontWeight: 'bold' }}>{tx.recipientName}</div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {tx.licenseNumber} | {tx.workplaceInstitution}
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                    
                                    {/* 3. Category */}
                                    <td style={{ padding: '12px 16px' }}>
                                      {isEditing ? (
                                        <select 
                                          value={editFormData.spendCategory || ''} 
                                          onChange={(e) => handleChange(e, 'spendCategory')} 
                                          style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                        >
                                          <option value="PRESENTATION">PRESENTATION</option>
                                          <option value="SAMPLES">SAMPLES</option>
                                          <option value="CONSULTANCY">CONSULTANCY</option>
                                          <option value="CONVENZIONI">CONVENZIONI</option>
                                          <option value="DONAZIONI">DONAZIONI</option>
                                          <option value="CONFERENCE_SUPPORT">CONFERENCE_SUPPORT</option>
                                        </select>
                                      ) : (
                                        <span className="badge" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                                          {tx.spendCategory}
                                        </span>
                                      )}
                                    </td>
                                    
                                    {/* 4. Purpose & Provision */}
                                    <td style={{ padding: '12px 16px' }}>
                                      {isEditing ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                          <input 
                                            value={editFormData.purposeOfBenefit || ''} 
                                            onChange={(e) => handleChange(e, 'purposeOfBenefit')} 
                                            style={{ padding: '6px 8px', width: '150px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.85rem' }} 
                                            placeholder="Purpose" 
                                          />
                                          <input 
                                            value={editFormData.details || ''} 
                                            onChange={(e) => handleChange(e, 'details')} 
                                            style={{ padding: '4px 8px', width: '150px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-secondary)' }} 
                                            placeholder="Details/Reference" 
                                          />
                                        </div>
                                      ) : (
                                        <div>
                                          <div>{tx.purposeOfBenefit || <em style={{ color: 'var(--text-muted)' }}>None</em>}</div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {tx.placeOfProvision} {tx.details ? `| ${tx.details}` : ''}
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                    
                                    {/* 5. Original Spend */}
                                    <td style={{ padding: '12px 16px' }}>
                                      {isEditing ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{tx.currencyOriginal}</span>
                                          <input 
                                            type="number" 
                                            value={editFormData.amountOriginal || 0} 
                                            onChange={(e) => handleChange(e, 'amountOriginal')} 
                                            style={{ padding: '6px 8px', width: '80px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-primary)', textAlign: 'right', fontSize: '0.85rem' }} 
                                          />
                                        </div>
                                      ) : (
                                        <div>
                                          {tx.currencyOriginal} {tx.amountOriginal.toLocaleString(undefined, { minimumFractionDigits: tx.currencyOriginal === 'KRW' ? 0 : 2, maximumFractionDigits: tx.currencyOriginal === 'KRW' ? 0 : 2 })}
                                        </div>
                                      )}
                                    </td>
                                    
                                    {/* 6. Normalized USD */}
                                    <td style={{ fontWeight: 700, color: 'var(--primary-accent)', padding: '12px 16px' }}>
                                      ${tx.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    
                                    {/* 7. Completeness Audit */}
                                    <td style={{ padding: '12px 16px' }}>
                                      {reviewView === 'pending' ? (
                                        (!completeness.isComplete || limitExceeded) ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', padding: '3px 6px' }}>
                                              <ShieldAlert size={12} /> Flagged
                                            </span>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--danger)', maxWidth: '180px', lineHeight: 1.3 }}>
                                              {!completeness.isComplete && (
                                                <div>Missing statutory fields: {completeness.missingFields.join(', ')}</div>
                                              )}
                                              {limitExceeded && (
                                                <div>Advisory policy cap exceeded!</div>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', padding: '3px 6px' }}>
                                            <CheckCircle size={12} /> Compliant
                                          </span>
                                        )
                                      ) : (
                                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', padding: '3px 6px', background: 'rgba(16,185,129,0.06)' }}>
                                          <CheckCircle size={12} /> Sealed & Verified
                                        </span>
                                      )}
                                    </td>
                                    
                                    {/* 8. Actions */}
                                    <td style={{ padding: '12px 16px' }}>
                                      {reviewView === 'pending' ? (
                                        isEditing ? (
                                          <div style={{ display: 'flex', gap: '6px' }}>
                                            <button className="btn btn-primary" onClick={() => handleSaveEdit(tx.id)} style={{ padding: '6px 10px', fontSize: '0.72rem', borderRadius: '4px' }}>Save</button>
                                            <button className="btn" onClick={handleCancelEdit} style={{ padding: '6px 10px', fontSize: '0.72rem', borderRadius: '4px', background: 'var(--border-color)', color: 'var(--text-primary)' }}>Cancel</button>
                                          </div>
                                        ) : (
                                          <div style={{ display: 'flex', gap: '6px' }}>
                                            <button className="btn" onClick={() => handleEditClick(tx)} style={{ padding: '6px 10px', fontSize: '0.72rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '4px' }}>Edit</button>
                                            <button className="btn" onClick={() => setSelectedHistoryTxId(tx.id)} style={{ padding: '6px 10px', fontSize: '0.72rem', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>Logs</button>
                                          </div>
                                        )
                                      ) : (
                                        <button className="btn" onClick={() => setSelectedHistoryTxId(tx.id)} style={{ padding: '6px 10px', fontSize: '0.72rem', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>View Logs</button>
                                      )}
                                    </td>
                                    
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </>
                  );
                })() : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '380px', color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>
                    <FileText size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                    <h3 style={{ margin: 0, fontWeight: 700 }}>Select a Source File</h3>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', maxWidth: '320px' }}>
                      Choose a loaded CSV or spreadsheet from the left pane to audit its specific records and statutory compliance checks.
                    </p>
                  </div>
                )}
              </div>
              
            </div>

            {/* Emergency Administrative Resets */}
            <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.02)', padding: '20px 24px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <div>
                <h3 style={{ color: 'var(--danger)', margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 'bold' }}>Danger Zone (Administrative Resets)</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                  Irreversibly wipe all SQL databases (Staging, South Korea, Italy, Ingestion Batches, and secure Audit Logs) to reset your testing workspace.
                </p>
              </div>
              <button 
                onClick={handlePurgeDatabases}
                className="btn"
                style={{ padding: '10px 20px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}
              >
                Purge All SQL Databases
              </button>
            </div>
          </div>
        );
      })()}

      {activeTab === 'compliance_map' && (() => {
        const activeMetric = mapMetricFilter;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Telemetry Control Bar */}
            <div className="card" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '20px 24px', 
              background: 'var(--bg-elevated)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '12px',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={22} color="var(--primary-accent)" />
                  <span>Global Data Status Telemetry</span>
                </h2>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Hover over active compliance nodes to view real-time records, pushed registries, and statutory disclosure reports. Click on nodes to deep-dive into local dashboards.
                </p>
              </div>

              {/* Dynamic Color Coding Toggle Selectors */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Color Code Map By:</span>
                <div style={{
                  display: 'flex',
                  background: 'var(--bg-base)',
                  padding: '3px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  {[
                    { id: 'ingested', label: '📁 Records Ingested', color: 'var(--primary-accent)' },
                    { id: 'pushed', label: '⚡ Data Pushed', color: 'var(--success)' },
                    { id: 'reports', label: '📄 Reports Created', color: '#8b5cf6' }
                  ].map(btn => (
                    <button
                      key={btn.id}
                      onClick={() => setMapMetricFilter(btn.id as any)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: mapMetricFilter === btn.id ? btn.color : 'transparent',
                        color: mapMetricFilter === btn.id ? 'white' : 'var(--text-secondary)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Split Screen Telemetry Map & Metrics Cards */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch', minHeight: '450px', flexWrap: 'wrap' }}>
              {/* Map Panel (65% width) */}
              <div className="card" style={{ 
                flex: '2 1 500px', 
                position: 'relative', 
                background: 'var(--bg-base)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '12px', 
                overflow: 'hidden',
                padding: '0',
                minHeight: '450px',
                boxShadow: 'var(--shadow-md)'
              }}>
                {/* Real Leaflet Map Container */}
                <div id="global-telemetry-map" style={{ width: '100%', height: '100%', minHeight: '450px', borderRadius: '12px' }}></div>
              </div>

              {/* Sidebar Metrics Cards Panel (35% width) */}
              <div style={{ 
                flex: '1 1 240px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                justifyContent: 'center'
              }}>
                {['KR', 'IT', 'FR', 'US', 'CO'].map(code => {
                  const stats = getCountryStats(code);
                  const isHovered = hoveredCountry === code;
                  
                  let val = 0;
                  if (activeMetric === 'ingested') val = stats.ingested;
                  else if (activeMetric === 'pushed') val = stats.pushed;
                  else if (activeMetric === 'reports') val = stats.reports;
                  
                  return (
                    <div 
                      key={code}
                      onMouseEnter={() => setHoveredCountry(code)}
                      onMouseLeave={() => setHoveredCountry(null)}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        background: isHovered ? `linear-gradient(135deg, var(--bg-elevated) 0%, rgba(255,255,255,0.03) 100%)` : 'var(--bg-elevated)',
                        boxShadow: isHovered ? `0 0 20px -4px ${stats.color}25` : 'none',
                        borderColor: isHovered ? stats.color : 'var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.3rem' }}>{stats.flag}</span>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isHovered ? stats.color : 'var(--text-primary)', transition: 'color 0.2s' }}>{stats.name}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-base)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          {code}
                        </span>
                      </div>

                      {/* Display active color coded metric beautifully */}
                      <div style={{ margin: '4px 0', borderLeft: `3px solid ${stats.color}`, paddingLeft: '10px' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {activeMetric === 'ingested' ? '📁 Records Ingested' : activeMetric === 'pushed' ? '⚡ Data Pushed' : '📄 Reports Created'}
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isHovered ? stats.color : 'var(--text-primary)' }}>
                          {val}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Ingested</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{stats.ingested}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Pushed</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)' }}>{stats.pushed}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Reports</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: stats.color }}>{stats.reports}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Multi-Country Ingestion Uploader */}
      {activeTab === 'uploader' && (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadCloud size={22} color="var(--primary-glow)" /> Load Multi-Country Data
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
            Upload raw manufacturer spend spreadsheets. The Data Loading Engine will map source headers onto the Universal Data Model (UDM) based on your selected target country's legal boundaries.
          </p>

          {/* Curated Country Templates Downloads Grid */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '24px',
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} className="text-primary" /> Download Statutory Excel Templates
            </h4>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Use these pre-formatted country templates to ensure data consistency, complete essential columns, and bypass ETL staging completeness violations.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
              {[
                { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
                { code: 'IT', name: 'Italy', flag: '🇮🇹' },
                { code: 'FR', name: 'France', flag: '🇫🇷' },
                { code: 'US', name: 'United States', flag: '🇺🇸' },
                { code: 'CO', name: 'Colombia', flag: '🇨🇴' }
              ].map(tpl => (
                <button
                  key={tpl.code}
                  type="button"
                  onClick={() => downloadTemplate(tpl.code)}
                  className="btn"
                  style={{
                    padding: '8px 10px',
                    fontSize: '0.75rem',
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-accent)';
                    e.currentTarget.style.background = 'rgba(124, 58, 237, 0.05)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.background = 'var(--bg-base)';
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{tpl.flag}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>{tpl.name}</span>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>.xlsx template</span>
                </button>
              ))}
            </div>
          </div>

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
                  <option value="IT">🇮🇹 Italy (Sanità Trasparente Law 31/2022)</option>
                  <option value="FR">🇫🇷 France (Loi Bertrand transparency)</option>
                  <option value="US">🇺🇸 United States (CMS Open Payments)</option>
                  <option value="CO">🇨🇴 Colombia (Resolution 2881 RTVSS)</option>
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

      {/* Source Files Explorer Tab */}
      {activeTab === 'source_files' && (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch', minHeight: '500px' }}>
          {/* Left Pane: Files List */}
          <div className="card" style={{ width: '350px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} className="text-primary" /> Uploaded Source Files
              </h3>
              <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Select a file to inspect its raw, immutable record snapshot.
              </p>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, maxHeight: '600px' }}>
              {batches.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No source files uploaded yet.
                </div>
              ) : (
                batches.map(batch => {
                  const isSelected = selectedSourceFileId === batch.batchId;
                  const totalOriginalVal = batch.originalTransactions?.reduce((sum, t) => sum + t.amountOriginal, 0) || 0;
                  const originalCurrency = batch.originalTransactions?.[0]?.currencyOriginal || 'USD';
                  
                  return (
                    <div 
                      key={batch.batchId}
                      onClick={() => setSelectedSourceFileId(batch.batchId)}
                      style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(124, 58, 237, 0.04)' : 'transparent',
                        borderLeft: isSelected ? '3px solid var(--primary-color)' : '3px solid transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <FileText size={16} /> {batch.sourceFileName}
                        </span>
                        <span className="badge" style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#f1f5f9', color: '#334155' }}>
                          {batch.countryCode}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span>{batch.totalRecords} records</span>
                        <span>
                          {originalCurrency} {totalOriginalVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                        Uploaded: {new Date(batch.uploadTimestamp).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Immutable Raw Records Grid */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            {selectedSourceFileId ? (
              (() => {
                const targetBatch = batches.find(b => b.batchId === selectedSourceFileId);
                if (!targetBatch) return null;
                const rawRows = targetBatch.originalTransactions || [];
                
                return (
                  <>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                          <FileText size={20} className="text-primary" /> {targetBatch.sourceFileName}
                        </h3>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          Viewing immutable raw records as they existed at upload time ({new Date(targetBatch.uploadTimestamp).toLocaleString()}).
                        </p>
                      </div>
                      <div className="badge badge-success" style={{ padding: '6px 12px' }}>
                        {rawRows.length} Original Records
                      </div>
                    </div>

                    <div style={{ overflow: 'auto', flex: 1, margin: 0 }} className="table-container">
                      {rawRows.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No snapshots available for this batch.
                        </div>
                      ) : (
                        <table style={{ margin: 0, width: '100%', tableLayout: 'auto' }}>
                          <thead>
                            <tr>
                              <th>Record ID</th>
                              <th>Recipient Details</th>
                              <th>Category</th>
                              <th>Provision Details</th>
                              <th>Original Value</th>
                              <th>Normalized USD</th>
                              <th>Initial Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rawRows.map(tx => (
                              <tr key={tx.id}>
                                <td style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{tx.id}</td>
                                <td>
                                  <div><strong>{tx.recipientName}</strong></div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {tx.licenseNumber} | {tx.workplaceInstitution}
                                  </div>
                                </td>
                                <td>
                                  <span className="badge" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                    {tx.spendCategory}
                                  </span>
                                </td>
                                <td>
                                  <div>{tx.purposeOfBenefit}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tx.details}</div>
                                </td>
                                <td>
                                  {tx.currencyOriginal} {tx.amountOriginal.toLocaleString(undefined, { minimumFractionDigits: tx.currencyOriginal === 'KRW' ? 0 : 2 })}
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
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                );
              })()
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '350px', color: 'var(--text-secondary)' }}>
                <Database size={48} style={{ opacity: 0.15, marginBottom: '16px' }} />
                <h3 style={{ margin: 0 }}>Select a Source File</h3>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem' }}>Choose a file from the left pane to view its raw uploaded data snapshot.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cryptographic Traceability History Modal */}
      {selectedHistoryTxId && (
        <div className="pdf-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="pdf-modal-container" style={{ maxWidth: '650px', height: 'auto', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="pdf-toolbar" style={{ borderBottom: '1px solid var(--border-color)', padding: '16px 20px' }}>
              <div className="pdf-toolbar-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <Clock size={20} color="var(--primary-glow)" />
                <span>Cryptographic Audit Logs - Transaction {selectedHistoryTxId}</span>
              </div>
              <button 
                className="btn" 
                onClick={() => setSelectedHistoryTxId(null)}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, color: 'var(--text-primary)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Below is the tamper-evident cryptographic history ledger recording all state mutations and updates executed on this spend transaction record.
              </p>
              
              {auditLogs.filter(log => log.entityId === selectedHistoryTxId).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                  No historical mutations recorded for this transaction. It is currently in its initial ingested state.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {auditLogs.filter(log => log.entityId === selectedHistoryTxId).map(log => {
                    let prevObj: any = {};
                    let nextObj: any = {};
                    try { if (log.previousValues) prevObj = JSON.parse(log.previousValues); } catch(e){}
                    try { if (log.newValues) nextObj = JSON.parse(log.newValues); } catch(e){}

                    const changedKeys = Array.from(new Set([...Object.keys(prevObj), ...Object.keys(nextObj)]))
                      .filter(key => JSON.stringify(prevObj[key]) !== JSON.stringify(nextObj[key]))
                      .filter(key => key !== 'amountUSD' && key !== 'remediationStatus'); // filter operational props

                    return (
                      <div key={log.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', background: 'var(--bg-main)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="badge badge-warning" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>MUTATION_{log.action}</span>
                            <span>Operator: {log.userId}</span>
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        
                        {changedKeys.length === 0 ? (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Initial record creation. Transferred value successfully loaded and normalized.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {changedKeys.map(key => (
                              <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                                <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{key}</span>
                                <span style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>{prevObj[key] === undefined ? '-' : String(prevObj[key])}</span>
                                <span style={{ color: 'var(--success)' }}>{nextObj[key] === undefined ? '-' : String(nextObj[key])}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Staging Pre-Commit Validation & Review Modal */}
      {showReviewModal && (() => {
        const commitTxs = commitBatchId ? transactions.filter(t => t.batchId === commitBatchId) : transactions;
        const activeCommitBatch = batches.find(b => b.batchId === commitBatchId);
        
        return (
          <div className="pdf-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="pdf-modal-container" style={{ maxWidth: '750px', height: 'auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
              <div className="pdf-toolbar" style={{ borderBottom: '1px solid var(--border-color)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="pdf-toolbar-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <ShieldAlert size={20} color="var(--primary-glow)" />
                  <span>Staging File Commit Review: {activeCommitBatch ? activeCommitBatch.sourceFileName : 'Batch Audit'}</span>
                </div>
                <button 
                  className="btn" 
                  onClick={() => {
                    setShowReviewModal(false);
                    setCommitBatchId(null);
                  }}
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>
              
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem' }}>Transaction Audit</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.4 }}>
                    Please review the audit summary metrics below. Once committed, these records will be pushed to the final compliance country registers and purged from the staging buffer.
                  </p>
                </div>

                {/* Summary Stats Table */}
                <div className="table-container" style={{ margin: 0 }}>
                  <table style={{ margin: 0, width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Jurisdiction</th>
                        <th style={{ textAlign: 'center' }}>Compliant Records</th>
                        <th style={{ textAlign: 'center' }}>Flagged Anomalies</th>
                        <th style={{ textAlign: 'right' }}>Total Value (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['KR', 'IT', 'FR', 'US'].map(code => {
                        const countryTxs = commitTxs.filter(t => t.countryCode === code);
                        if (countryTxs.length === 0) return null;

                        const compliantCount = countryTxs.filter(t => t.remediationStatus === 'APPROVED').length;
                        const flaggedCount = countryTxs.filter(t => t.remediationStatus === 'PENDING_REVIEW').length;
                        const totalUSDVal = countryTxs.reduce((sum, t) => sum + t.amountUSD, 0);

                        return (
                          <tr key={code}>
                            <td style={{ fontWeight: 'bold' }}>
                              {code === 'KR' ? '🇰🇷 South Korea [KR]' : code === 'IT' ? '🇮🇹 Italy [IT]' : code === 'FR' ? '🇫🇷 France [FR]' : '🇺🇸 USA [US]'}
                            </td>
                            <td style={{ textAlign: 'center', color: 'var(--success)' }}>{compliantCount} Approved</td>
                            <td style={{ textAlign: 'center', color: flaggedCount > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: flaggedCount > 0 ? 'bold' : 'normal' }}>
                              {flaggedCount} Flags
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                              ${totalUSDVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Warning box if there are flagged records */}
                {commitTxs.some(t => t.remediationStatus === 'PENDING_REVIEW') ? (
                  <div style={{
                    padding: '16px 20px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontWeight: 'bold', fontSize: '0.95rem' }}>
                      <ShieldAlert size={18} />
                      <span>Compliance Action Required: Unresolved Policy Flags Detected</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      There are currently <strong>{commitTxs.filter(t => t.remediationStatus === 'PENDING_REVIEW').length} records</strong> inside this source file that violate statutory transparency policy caps. We highly recommend auditing and remediating them in the grid editor before proceeding.
                    </p>
                  </div>
                ) : (
                  <div style={{
                    padding: '16px 20px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--success)',
                    fontWeight: 'bold',
                    fontSize: '0.95rem'
                  }}>
                    <CheckCircle size={18} />
                    <span>All Records in This File are Fully Compliant & Approved</span>
                  </div>
                )}

                {/* Certification Checklist */}
                <div style={{
                  padding: '16px 20px',
                  borderRadius: '8px',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <input 
                    type="checkbox" 
                    id="certify-checkbox"
                    checked={isCertified}
                    onChange={(e) => setIsCertified(e.target.checked)}
                    style={{ marginTop: '4px', cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="certify-checkbox" style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.4, cursor: 'pointer', userSelect: 'none' }}>
                    <strong>I certify that I have audited this specific source file.</strong> I confirm that all listed value transfers represent fair market value (FMV), are correctly attributed to the specified HCP/HCO beneficiaries, and conform to statutory guidelines.
                  </label>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button 
                    className="btn" 
                    onClick={() => {
                      setShowReviewModal(false);
                      setCommitBatchId(null);
                    }}
                    style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '10px 20px' }}
                  >
                    Cancel & Edit Records
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleConfirmCommit}
                    disabled={!isCertified || isCommitting}
                    style={{
                      padding: '10px 24px',
                      fontWeight: 600,
                      opacity: isCertified ? 1 : 0.5,
                      cursor: isCertified ? 'pointer' : 'not-allowed',
                      boxShadow: isCertified ? '0 4px 12px rgba(124, 58, 237, 0.2)' : 'none'
                    }}
                  >
                    {isCommitting ? 'Committing & Routing...' : 'Confirm & Commit File to Production'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default DataCenter;
