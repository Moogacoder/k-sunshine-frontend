import { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Clock, User, Eye, X, Loader2, Sparkles } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { APIGateway } from '../datacenter/api_gateway';

interface Transaction {
  id: string;
  categoryOfBenefit: string;
  dateOfProvision: string;
  placeOfProvision: string;
  purposeOfBenefit: string;
  amountEUR: number;
  currency: string;
  details: string;
  entity: {
    recipientType: string;
    recipientName: string;
    licenseNumber: string;
    workplaceInstitution: string;
    specialtyDepartment: string;
  }
}

interface ArchivedReport {
  id: string;
  templateName: string;
  reportYear: string;
  generatedBy: string;
  payload: string;
  status: string;
  createdAt: string;
}

const EFPIAReporting = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [archivedReports, setArchivedReports] = useState<ArchivedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // PDF Preview States
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [activeTemplateTitle, setActiveTemplateTitle] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // AI Compliance Statement States
  const [showAiStatement, setShowAiStatement] = useState(false);
  const [isStatementLoading, setIsStatementLoading] = useState(false);
  const [statementContent, setStatementContent] = useState('');

  const handleGenerateStatement = async () => {
    if (statementContent) {
      setShowAiStatement(!showAiStatement);
      return;
    }
    setShowAiStatement(true);
    setIsStatementLoading(true);
    try {
      const draft = await APIGateway.getComplianceStatement('EU', 2026);
      setStatementContent(draft);
    } catch (err) {
      console.error("Failed to generate compliance statement:", err);
      setStatementContent("Failed to generate the cover statement. Please verify server status.");
    } finally {
      setIsStatementLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      // 1. Fetch transactions from the Central Data Center's Europe stream feeds
      const euSpend = await APIGateway.getTransactions('EU');
      const mappedTx = euSpend.map(t => ({
        id: t.id,
        categoryOfBenefit: t.spendCategory,
        dateOfProvision: t.dateOfProvision,
        placeOfProvision: t.placeOfProvision,
        purposeOfBenefit: t.purposeOfBenefit,
        amountEUR: t.amountOriginal,
        currency: t.currencyOriginal,
        details: t.details,
        entity: {
          recipientType: t.recipientType,
          recipientName: t.recipientName,
          licenseNumber: t.licenseNumber,
          workplaceInstitution: t.workplaceInstitution,
          specialtyDepartment: t.specialtyDepartment
        }
      }));
      setTransactions(mappedTx);

      // 2. Fetch reports from local storage
      const cached = localStorage.getItem('eu_efpia_archived_reports');
      if (cached) {
        setArchivedReports(JSON.parse(cached));
      } else {
        const seedArchives: ArchivedReport[] = [
          {
            id: 'ARC-EU-SEED-001',
            templateName: 'EFPIA Template 3: Donations and Grants to HCOs',
            reportYear: '2026',
            generatedBy: 'SYSTEM',
            payload: JSON.stringify([]),
            status: 'COMPLIANT',
            createdAt: new Date().toISOString()
          }
        ];
        setArchivedReports(seedArchives);
        localStorage.setItem('eu_efpia_archived_reports', JSON.stringify(seedArchives));
      }
    } catch (err) {
      console.error("Failed to fetch EFPIA reports data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const archiveReport = async (templateName: string, dataToExport: any[]) => {
    try {
      const currentYear = new Date().getFullYear().toString();
      const newReport: ArchivedReport = {
        id: `ARC-EU-${Date.now()}`,
        templateName,
        reportYear: currentYear,
        generatedBy: 'ADMIN',
        payload: JSON.stringify(dataToExport),
        status: 'COMPLIANT',
        createdAt: new Date().toISOString()
      };
      
      const updated = [newReport, ...archivedReports];
      setArchivedReports(updated);
      localStorage.setItem('eu_efpia_archived_reports', JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to archive EFPIA report:", err);
    }
  };

  const exportTemplate = async (templateNumber: number, title: string) => {
    let dataToExport: any[] = [];
    let filename = "";

    switch (templateNumber) {
      case 1:
        filename = "EFPIA_Template_1_Event_Sponsorships.csv";
        dataToExport = transactions
          .filter(t => t.categoryOfBenefit === 'EVENT_CONTRIBUTION')
          .map(t => ({
            'Company Name': 'Qordata Europe (Demo)',
            'Recipient Name': t.entity.recipientName,
            'Recipient Type': t.entity.recipientType,
            'Tax ID / License Number': t.entity.licenseNumber,
            'Affiliated Healthcare Institution': t.entity.workplaceInstitution,
            'Date of Value Transfer': new Date(t.dateOfProvision).toLocaleDateString('en-GB'),
            'Purpose (Meeting/Congress Name)': t.purposeOfBenefit,
            'Contribution Amount (EUR)': t.amountEUR
          }));
        break;

      case 2:
        filename = "EFPIA_Template_2_Fees_for_Service.csv";
        dataToExport = transactions
          .filter(t => t.categoryOfBenefit === 'FEES_FOR_SERVICE')
          .map(t => ({
            'Company Name': 'Qordata Europe (Demo)',
            'HCP Name': t.entity.recipientName,
            'Registration Number': t.entity.licenseNumber,
            'Consultancy/Service Description': t.purposeOfBenefit,
            'Related Expenses (Travel/Lodging)': t.details,
            'Date of Transfer': new Date(t.dateOfProvision).toLocaleDateString('en-GB'),
            'Honoraria / Fees (EUR)': t.amountEUR
          }));
        break;

      case 3:
        filename = "EFPIA_Template_3_Donations_Grants.csv";
        dataToExport = transactions
          .filter(t => t.categoryOfBenefit === 'DONATIONS_AND_GRANTS')
          .map(t => ({
            'Company Name': 'Qordata Europe (Demo)',
            'Recipient HCO': t.entity.recipientName,
            'HCO Tax Number': t.entity.licenseNumber,
            'Description of Grant/Donation': t.purposeOfBenefit,
            'Project / Equipment Details': t.details,
            'Date of Grant': new Date(t.dateOfProvision).toLocaleDateString('en-GB'),
            'Donation Value (EUR)': t.amountEUR
          }));
        break;
    }

    if (dataToExport.length === 0) {
      const emptyRow: any = {};
      if (templateNumber === 1) {
        emptyRow['Company Name'] = ''; emptyRow['Recipient Name'] = ''; emptyRow['Recipient Type'] = ''; emptyRow['Tax ID / License Number'] = ''; emptyRow['Affiliated Healthcare Institution'] = ''; emptyRow['Date of Value Transfer'] = ''; emptyRow['Purpose (Meeting/Congress Name)'] = ''; emptyRow['Contribution Amount (EUR)'] = '';
      } else if (templateNumber === 2) {
        emptyRow['Company Name'] = ''; emptyRow['HCP Name'] = ''; emptyRow['Registration Number'] = ''; emptyRow['Consultancy/Service Description'] = ''; emptyRow['Related Expenses (Travel/Lodging)'] = ''; emptyRow['Date of Transfer'] = ''; emptyRow['Honoraria / Fees (EUR)'] = '';
      } else if (templateNumber === 3) {
        emptyRow['Company Name'] = ''; emptyRow['Recipient HCO'] = ''; emptyRow['HCO Tax Number'] = ''; emptyRow['Description of Grant/Donation'] = ''; emptyRow['Project / Equipment Details'] = ''; emptyRow['Date of Grant'] = ''; emptyRow['Donation Value (EUR)'] = '';
      }
      dataToExport = [emptyRow];
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "EFPIA Disclosures");
    XLSX.writeFile(workbook, filename, { bookType: 'csv' });

    // Save to the archive database
    await archiveReport(title, dataToExport);
  };

  const reDownloadArchive = (report: ArchivedReport) => {
    try {
      const dataToExport = JSON.parse(report.payload);
      const filename = `Archived_${report.templateName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date(report.createdAt).toISOString().split('T')[0]}.csv`;
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "EFPIA Disclosures");
      XLSX.writeFile(workbook, filename, { bookType: 'csv' });
    } catch (err) {
      console.error("Failed to re-download EFPIA archive:", err);
    }
  };

  // PDF Preview Cleanups to prevent memory leak
  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  const previewPDF = (templateNumber: number, title: string) => {
    setActiveTemplateTitle(title);
    setIsGeneratingPdf(true);

    setTimeout(() => {
      try {
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        let filteredTx: Transaction[] = [];
        let columns: string[] = [];
        let bodyRows: string[][] = [];
        let totalAmount = 0;

        if (templateNumber === 1) {
          filteredTx = transactions.filter(t => t.categoryOfBenefit === 'EVENT_CONTRIBUTION');
          columns = ['Company', 'Recipient', 'Recipient Type', 'Tax ID/License', 'Healthcare Institution', 'Transfer Date', 'Congress Purpose', 'Amount (EUR)'];
          bodyRows = filteredTx.map(t => [
            'Qordata Europe',
            t.entity.recipientName,
            t.entity.recipientType,
            t.entity.licenseNumber || 'N/A',
            t.entity.workplaceInstitution || 'N/A',
            new Date(t.dateOfProvision).toLocaleDateString('en-GB'),
            t.purposeOfBenefit || 'Event Support',
            'EUR ' + t.amountEUR.toLocaleString('de-DE', { minimumFractionDigits: 2 })
          ]);
        } else if (templateNumber === 2) {
          filteredTx = transactions.filter(t => t.categoryOfBenefit === 'FEES_FOR_SERVICE');
          columns = ['Company', 'HCP Name', 'Registration ID', 'Service Description', 'Lodging/Travel Expenses', 'Provision Date', 'Honoraria (EUR)'];
          bodyRows = filteredTx.map(t => [
            'Qordata Europe',
            t.entity.recipientName,
            t.entity.licenseNumber || 'N/A',
            t.purposeOfBenefit || 'Consultancy Service',
            t.details || 'N/A',
            new Date(t.dateOfProvision).toLocaleDateString('en-GB'),
            'EUR ' + t.amountEUR.toLocaleString('de-DE', { minimumFractionDigits: 2 })
          ]);
        } else if (templateNumber === 3) {
          filteredTx = transactions.filter(t => t.categoryOfBenefit === 'DONATIONS_AND_GRANTS');
          columns = ['Company', 'Recipient HCO', 'HCO Tax Number', 'Donation Description', 'Equipment Details', 'Date of Grant', 'Value (EUR)'];
          bodyRows = filteredTx.map(t => [
            'Qordata Europe',
            t.entity.recipientName,
            t.entity.licenseNumber || 'N/A',
            t.purposeOfBenefit || 'Donation / Grant Support',
            t.details || 'N/A',
            new Date(t.dateOfProvision).toLocaleDateString('en-GB'),
            'EUR ' + t.amountEUR.toLocaleString('de-DE', { minimumFractionDigits: 2 })
          ]);
        }

        totalAmount = filteredTx.reduce((sum, t) => sum + t.amountEUR, 0);

        // 1. Brand Header Banner (deep Blue RGB 0, 51, 153 for EU EFPIA branding)
        doc.setFillColor(0, 51, 153); 
        doc.rect(0, 0, 297, 28, 'F');
        
        // Header Text
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('EUROPEAN PHARMACEUTICAL TRANSPARENCY REGISTRY — EFPIA DISCLOSURE CODE', 14, 12);
        
        doc.setTextColor(191, 219, 254); // light blue-200 accent
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text('STATUTORY VALUE TRANSFER LEDGER IN COMPLIANCE WITH EFPIA CODE OF PRACTICE (HCP / HCO TRANSPARENCY DISCLOSURES)', 14, 18);

        doc.setFillColor(30, 64, 175); 
        doc.rect(0, 26, 297, 2, 'F');

        // Executive Summary Card
        doc.setFillColor(248, 250, 252); 
        doc.rect(14, 34, 269, 32, 'F');
        doc.setDrawColor(226, 232, 240); 
        doc.rect(14, 34, 269, 32);

        // Metadata Labels
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); 
        doc.text('MODELLO DI RIFERIMENTO:', 20, 42);
        doc.text('DATA GENERAZIONE:', 20, 48);
        doc.text('STATO DI CONFORMITÀ:', 20, 54);
        doc.text('TEMPO DI RETENZIONE LEGALE:', 20, 60);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59); 
        doc.text(title.toUpperCase(), 65, 42);
        doc.text(new Date().toLocaleString('en-GB'), 65, 48);
        doc.setTextColor(22, 163, 74); // success green
        doc.setFont('helvetica', 'bold');
        doc.text('COMPLIANT & SECURE (EFPIA DE-IDENTIFIED LEGISLATIVE PUBLIC RECORD)', 65, 54);
        doc.setTextColor(30, 41, 59); 
        doc.setFont('helvetica', 'normal');
        doc.text('MANDATORY RETENTION RECORD OF 3 YEARS (EFPIA PUBLIC STATUTORY ARCHIVE)', 65, 60);

        // Total sum
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139); 
        doc.text('CONSOLIDATED DISCLOSURE VALUE', 200, 42);
        
        doc.setTextColor(0, 51, 153); 
        doc.setFontSize(16);
        doc.text('EUR €' + totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 }), 200, 50);

        doc.setTextColor(100, 116, 139); 
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Total records: ' + filteredTx.length + ' compliant rows', 200, 56);

        // Generate dynamic table or empty fallback
        if (bodyRows.length === 0) {
          doc.setFillColor(254, 242, 242); 
          doc.rect(14, 74, 269, 40, 'F');
          doc.setDrawColor(254, 202, 202); 
          doc.rect(14, 74, 269, 40);
          
          doc.setTextColor(220, 38, 38); 
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('NO VALUE TRANSFERS REGISTRATION DETECTED', 20, 88);
          
          doc.setTextColor(127, 29, 29); 
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text('No transparency transactions corresponding to this category were identified for the active fiscal period.', 20, 96);
          doc.text('Please load your regional spend spreadsheet in the Ingestion Portal to execute EU standard normalization.', 20, 102);
        } else {
          autoTable(doc, {
            startY: 74,
            head: [columns],
            body: bodyRows,
            theme: 'striped',
            headStyles: { 
              fillColor: [17, 24, 39], 
              textColor: [248, 250, 252], 
              fontStyle: 'bold', 
              fontSize: 8.5,
              cellPadding: 4
            },
            alternateRowStyles: { 
              fillColor: [248, 250, 252] 
            },
            styles: { 
              fontSize: 8,
              cellPadding: 3.5,
              textColor: [51, 65, 85],
              lineColor: [226, 232, 240],
              lineWidth: 0.1
            },
            columnStyles: {
              0: { cellWidth: 30 },
              1: { fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14 }
          });
        }

        // Add standard legal footer
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.line(14, 194, 283, 194);
          
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184); 
          doc.setFont('helvetica', 'normal');
          doc.text('EFPIA EUROPE STATUTORY DISCLOSURE PREVIEW | GENERATED DIRECTLY BY THE QORDATA COMPLIANCE MODULE', 14, 199);
          doc.text('CONFORMITY WITH EFPIA DISCLOSURE CODE REGULATIONS | RETENTION TIME REQUIREMENTS FOR AUDIT RESTRICTED', 14, 203);
          
          doc.setFont('helvetica', 'bold');
          doc.text('PAGE ' + i + ' OF ' + totalPages, 270, 199);
        }

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        
        if (previewPdfUrl) {
          URL.revokeObjectURL(previewPdfUrl);
        }
        
        setPreviewPdfUrl(url);
        setIsPreviewing(true);
      } catch (err) {
        console.error('Failed to generate EFPIA PDF:', err);
        alert('An error occurred during report construction.');
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 250);
  };

  const templates = [
    { id: 1, title: 'Template 1: Event Sponsorships & Costs', desc: 'Contributions to Event Costs including sponsorship packages, registration fees, travel and accommodation provided to HCPs.' },
    { id: 2, title: 'Template 2: Fees for Service & Consultancy', desc: 'Disclosures regarding consultancy agreements, honoraria payments, speaker fees, and related travel and lodging expenses.' },
    { id: 3, title: 'Template 3: Donations and Grants to HCOs', desc: 'Physical goods, educational grants, clinical equipment, or direct financial support provided strictly to Healthcare Organizations.' }
  ];

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>EFPIA Statutory Disclosures</h1>
          <p className="page-subtitle" style={{ margin: '8px 0 0 0' }}>Generate and audit compliant reports in accordance with the European Federation of Pharmaceutical Industries and Associations (EFPIA) Disclosure Code.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleGenerateStatement}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
        >
          <Sparkles size={16} /> 
          {showAiStatement ? 'Hide Cover Statement' : 'Generate Compliance Statement'}
        </button>
      </div>

      {/* AI Compliance Statement Collapsible Container */}
      {showAiStatement && (
        <div className="card animate-scale-up" style={{ 
          marginBottom: '32px', 
          border: '1px solid var(--border-color)', 
          background: 'rgba(30, 41, 59, 0.4)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Sparkles size={20} color="var(--primary-glow)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 'bold' }}>AI-Generated Filing Cover Statement (EFPIA Draft)</h3>
            {isStatementLoading && <Loader2 size={16} color="var(--primary-accent)" style={{ animation: 'spin 1s linear infinite' }} />}
          </div>
          
          {isStatementLoading ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Compiling aggregate values and formatting disclosure templates...</p>
          ) : (
            <div 
              style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{ 
                __html: statementContent
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/### (.*?)\n/g, '<h4 style="color:var(--primary-glow);margin-top:16px;margin-bottom:8px;font-size:0.95rem;">$1</h4>')
                  .replace(/## (.*?)\n/g, '<h3 style="color:var(--text-primary);margin-top:20px;margin-bottom:10px;font-size:1.1rem;">$1</h3>')
              }}
            />
          )}
        </div>
      )}

      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading transactions data...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
            {templates.map(tpl => (
              <div key={tpl.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ marginBottom: '12px' }}>{tpl.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>{tpl.desc}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => exportTemplate(tpl.id, tpl.title)} 
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <FileSpreadsheet size={18} /> CSV
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => previewPDF(tpl.id, tpl.title)}
                    disabled={isGeneratingPdf}
                    style={{ 
                      flex: 1, 
                      justifyContent: 'center', 
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {isGeneratingPdf && activeTemplateTitle === tpl.title ? (
                      <>
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        ...
                      </>
                    ) : (
                      <>
                        <Eye size={18} /> PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '40px 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Archived EFPIA Disclosure Records (3 Years)</h2>
          </div>
          <p className="page-subtitle" style={{ marginBottom: '24px' }}>Historical log of all statutory CSV reports generated and compiled under EFPIA guidelines.</p>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container" style={{ margin: 0 }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Archive Date</th>
                    <th>EFPIA Template Title</th>
                    <th>Filing Year</th>
                    <th>Operator</th>
                    <th>Compliance Status</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        No reports in historical archive.
                      </td>
                    </tr>
                  ) : (
                    archivedReports.map(report => (
                      <tr key={report.id}>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          <Clock size={12} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
                          {new Date(report.createdAt).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 500 }}>{report.templateName}</td>
                        <td>{report.reportYear}</td>
                        <td>
                          <User size={12} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle', color: 'var(--text-secondary)' }} />
                          {report.generatedBy}
                        </td>
                        <td>
                          <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                            {report.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="btn btn-primary" 
                            onClick={() => reDownloadArchive(report)}
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                          >
                            <Download size={14} /> Download
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Glassmorphic PDF Preview Modal */}
      {isPreviewing && previewPdfUrl && (
        <div className="pdf-modal-overlay">
          <div className="pdf-modal-container">
            <div className="pdf-toolbar">
              <div className="pdf-toolbar-title">
                <Eye size={20} color="var(--primary-glow)" />
                <span>Statutory PDF Preview — {activeTemplateTitle}</span>
              </div>
              <div className="pdf-toolbar-actions">
                <a 
                  href={previewPdfUrl} 
                  download={`EFPIA_Statutory_${activeTemplateTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.9rem', textDecoration: 'none' }}
                >
                  <Download size={16} /> Download PDF
                </a>
                <button 
                  className="btn" 
                  onClick={() => setIsPreviewing(false)}
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: 'none', 
                    color: 'var(--text-primary)', 
                    width: '36px', 
                    height: '36px', 
                    padding: 0,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="pdf-iframe-container">
              <iframe 
                src={previewPdfUrl} 
                className="pdf-iframe" 
                title="Anteprima Report Ministeriale"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EFPIAReporting;
