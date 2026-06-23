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
  amountJPY: number;
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

const JapanReporting = () => {
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
      const draft = await APIGateway.getComplianceStatement('JP', 2026);
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
      const jpSpend = await APIGateway.getTransactions('JP');
      const mappedTx = jpSpend.map(t => ({
        id: t.id,
        categoryOfBenefit: t.spendCategory,
        dateOfProvision: t.dateOfProvision,
        placeOfProvision: t.placeOfProvision,
        purposeOfBenefit: t.purposeOfBenefit,
        amountJPY: t.amountOriginal,
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

      const cached = localStorage.getItem('jp_transparency_archived_reports');
      if (cached) {
        setArchivedReports(JSON.parse(cached));
      } else {
        const seedArchives: ArchivedReport[] = [
          {
            id: 'ARC-JP-SEED-001',
            templateName: 'JPMA Template 3: Lecturing & Consulting Fees',
            reportYear: '2026',
            generatedBy: 'SYSTEM',
            payload: JSON.stringify([]),
            status: 'COMPLIANT',
            createdAt: new Date().toISOString()
          }
        ];
        setArchivedReports(seedArchives);
        localStorage.setItem('jp_transparency_archived_reports', JSON.stringify(seedArchives));
      }
    } catch (err) {
      console.error("Failed to fetch JPMA reports data:", err);
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
        id: `ARC-JP-${Date.now()}`,
        templateName,
        reportYear: currentYear,
        generatedBy: 'ADMIN',
        payload: JSON.stringify(dataToExport),
        status: 'COMPLIANT',
        createdAt: new Date().toISOString()
      };
      
      const updated = [newReport, ...archivedReports];
      setArchivedReports(updated);
      localStorage.setItem('jp_transparency_archived_reports', JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to archive Japan report:", err);
    }
  };

  const exportTemplate = async (templateNumber: number, title: string) => {
    let dataToExport: any[] = [];
    let filename = "";

    switch (templateNumber) {
      case 1:
        filename = "JPMA_Template_1_RD_Expenses.csv";
        dataToExport = transactions
          .filter(t => (t.categoryOfBenefit || '').toLowerCase() === 'research_dev')
          .map(t => ({
            'Company Name': 'Qordata Japan (Demo)',
            'Recipient Institution/HCO': t.entity.recipientName,
            'Registration Code': t.entity.licenseNumber,
            'Affiliation': t.entity.workplaceInstitution,
            'Clinical Trial / Study Name': t.purposeOfBenefit,
            'Phase/Details': t.details,
            'Date of Transfer': new Date(t.dateOfProvision).toLocaleDateString('ja-JP'),
            'R&D Spend (JPY)': t.amountJPY
          }));
        break;

      case 2:
        filename = "JPMA_Template_2_Academic_Donations.csv";
        dataToExport = transactions
          .filter(t => (t.categoryOfBenefit || '').toLowerCase() === 'academic_donation')
          .map(t => ({
            'Company Name': 'Qordata Japan (Demo)',
            'Recipient Organization': t.entity.recipientName,
            'HCO Registration Code': t.entity.licenseNumber,
            'Purpose of Donation': t.purposeOfBenefit,
            'Project Details': t.details,
            'Date of Donation': new Date(t.dateOfProvision).toLocaleDateString('ja-JP'),
            'Amount (JPY)': t.amountJPY
          }));
        break;

      case 3:
        filename = "JPMA_Template_3_Lecture_Fees.csv";
        dataToExport = transactions
          .filter(t => (t.categoryOfBenefit || '').toLowerCase() === 'lecture_fees')
          .map(t => ({
            'Company Name': 'Qordata Japan (Demo)',
            'HCP Name': t.entity.recipientName,
            'License Number / ID': t.entity.licenseNumber,
            'Affiliation': t.entity.workplaceInstitution,
            'Specialty': t.entity.specialtyDepartment,
            'Consulting / Lecture Description': t.purposeOfBenefit,
            'Details': t.details,
            'Date of Provision': new Date(t.dateOfProvision).toLocaleDateString('ja-JP'),
            'Lecture Fees (JPY)': t.amountJPY
          }));
        break;

      case 4:
        filename = "JPMA_Template_4_Promotional_Info.csv";
        dataToExport = transactions
          .filter(t => (t.categoryOfBenefit || '').toLowerCase() === 'promotional_info')
          .map(t => ({
            'Company Name': 'Qordata Japan (Demo)',
            'Recipient / Meeting Name': t.entity.recipientName,
            'Information Dissemination Details': t.purposeOfBenefit,
            'Materials Details': t.details,
            'Date': new Date(t.dateOfProvision).toLocaleDateString('ja-JP'),
            'Cost (JPY)': t.amountJPY
          }));
        break;

      case 5:
        filename = "JPMA_Template_5_Other_Meals.csv";
        dataToExport = transactions
          .filter(t => (t.categoryOfBenefit || '').toLowerCase() === 'other_meals')
          .map(t => ({
            'Company Name': 'Qordata Japan (Demo)',
            'HCP Name': t.entity.recipientName,
            'Affiliated Institution': t.entity.workplaceInstitution,
            'Meeting/Event Purpose': t.purposeOfBenefit,
            'Date of Provision': new Date(t.dateOfProvision).toLocaleDateString('ja-JP'),
            'Place': t.placeOfProvision,
            'Expense Details': t.details,
            'Amount (JPY)': t.amountJPY
          }));
        break;
    }

    if (dataToExport.length === 0) {
      const emptyRow: any = {};
      if (templateNumber === 1) {
        emptyRow['Company Name'] = ''; emptyRow['Recipient Institution/HCO'] = ''; emptyRow['Registration Code'] = ''; emptyRow['Affiliation'] = ''; emptyRow['Clinical Trial / Study Name'] = ''; emptyRow['Phase/Details'] = ''; emptyRow['Date of Transfer'] = ''; emptyRow['R&D Spend (JPY)'] = '';
      } else if (templateNumber === 2) {
        emptyRow['Company Name'] = ''; emptyRow['Recipient Organization'] = ''; emptyRow['HCO Registration Code'] = ''; emptyRow['Purpose of Donation'] = ''; emptyRow['Project Details'] = ''; emptyRow['Date of Donation'] = ''; emptyRow['Amount (JPY)'] = '';
      } else if (templateNumber === 3) {
        emptyRow['Company Name'] = ''; emptyRow['HCP Name'] = ''; emptyRow['License Number / ID'] = ''; emptyRow['Affiliation'] = ''; emptyRow['Specialty'] = ''; emptyRow['Consulting / Lecture Description'] = ''; emptyRow['Details'] = ''; emptyRow['Date of Provision'] = ''; emptyRow['Lecture Fees (JPY)'] = '';
      } else if (templateNumber === 4) {
        emptyRow['Company Name'] = ''; emptyRow['Recipient / Meeting Name'] = ''; emptyRow['Information Dissemination Details'] = ''; emptyRow['Materials Details'] = ''; emptyRow['Date'] = ''; emptyRow['Cost (JPY)'] = '';
      } else if (templateNumber === 5) {
        emptyRow['Company Name'] = ''; emptyRow['HCP Name'] = ''; emptyRow['Affiliated Institution'] = ''; emptyRow['Meeting/Event Purpose'] = ''; emptyRow['Date of Provision'] = ''; emptyRow['Place'] = ''; emptyRow['Expense Details'] = ''; emptyRow['Amount (JPY)'] = '';
      }
      dataToExport = [emptyRow];
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "JPMA Disclosures");
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
      XLSX.utils.book_append_sheet(workbook, worksheet, "JPMA Disclosures");
      XLSX.writeFile(workbook, filename, { bookType: 'csv' });
    } catch (err) {
      console.error("Failed to re-download Japan archive:", err);
    }
  };

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
          filteredTx = transactions.filter(t => (t.categoryOfBenefit || '').toLowerCase() === 'research_dev');
          columns = ['Company', 'Institution/HCO', 'Reg Code', 'Affiliation', 'Clinical Trial / Study Name', 'Transfer Date', 'Amount (JPY)'];
          bodyRows = filteredTx.map(t => [
            'Qordata Japan',
            t.entity.recipientName,
            t.entity.licenseNumber || 'N/A',
            t.entity.workplaceInstitution || 'N/A',
            t.purposeOfBenefit || 'Clinical Trial',
            new Date(t.dateOfProvision).toLocaleDateString('ja-JP'),
            'JPY ¥' + t.amountJPY.toLocaleString()
          ]);
        } else if (templateNumber === 2) {
          filteredTx = transactions.filter(t => (t.categoryOfBenefit || '').toLowerCase() === 'academic_donation');
          columns = ['Company', 'Recipient Organization', 'Registration Code', 'Purpose of Donation', 'Grant Details', 'Date of Donation', 'Amount (JPY)'];
          bodyRows = filteredTx.map(t => [
            'Qordata Japan',
            t.entity.recipientName,
            t.entity.licenseNumber || 'N/A',
            t.purposeOfBenefit || 'Educational Support',
            t.details || 'N/A',
            new Date(t.dateOfProvision).toLocaleDateString('ja-JP'),
            'JPY ¥' + t.amountJPY.toLocaleString()
          ]);
        } else if (templateNumber === 3) {
          filteredTx = transactions.filter(t => (t.categoryOfBenefit || '').toLowerCase() === 'lecture_fees');
          columns = ['Company', 'HCP Name', 'License/ID', 'Affiliated Workplace', 'Lecture / Consulting Description', 'Date', 'Lecture Fees (JPY)'];
          bodyRows = filteredTx.map(t => [
            'Qordata Japan',
            t.entity.recipientName,
            t.entity.licenseNumber || 'N/A',
            t.entity.workplaceInstitution || 'N/A',
            t.purposeOfBenefit || 'Oncology Lecture',
            new Date(t.dateOfProvision).toLocaleDateString('ja-JP'),
            'JPY ¥' + t.amountJPY.toLocaleString()
          ]);
        } else if (templateNumber === 4) {
          filteredTx = transactions.filter(t => (t.categoryOfBenefit || '').toLowerCase() === 'promotional_info');
          columns = ['Company', 'Recipient / Meeting Name', 'Information Details', 'Materials Details', 'Date of Transfer', 'Cost (JPY)'];
          bodyRows = filteredTx.map(t => [
            'Qordata Japan',
            t.entity.recipientName,
            t.purposeOfBenefit || 'Educational Meeting',
            t.details || 'N/A',
            new Date(t.dateOfProvision).toLocaleDateString('ja-JP'),
            'JPY ¥' + t.amountJPY.toLocaleString()
          ]);
        } else if (templateNumber === 5) {
          filteredTx = transactions.filter(t => (t.categoryOfBenefit || '').toLowerCase() === 'other_meals');
          columns = ['Company', 'HCP Name', 'Workplace', 'Meeting/Event Purpose', 'Date', 'Place', 'Expense Details', 'Amount (JPY)'];
          bodyRows = filteredTx.map(t => [
            'Qordata Japan',
            t.entity.recipientName,
            t.entity.workplaceInstitution || 'N/A',
            t.purposeOfBenefit || 'Scientific Advisory Meeting',
            new Date(t.dateOfProvision).toLocaleDateString('ja-JP'),
            t.placeOfProvision || 'N/A',
            t.details || 'N/A',
            'JPY ¥' + t.amountJPY.toLocaleString()
          ]);
        }

        totalAmount = filteredTx.reduce((sum, t) => sum + t.amountJPY, 0);

        // Brand Header Banner (Pink RGB 236, 72, 153 for Japan portal branding)
        doc.setFillColor(236, 72, 153); 
        doc.rect(0, 0, 297, 28, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('JAPAN PHARMACEUTICAL TRANSPARENCY REGISTRY — JPMA GUIDELINES', 14, 12);
        
        doc.setTextColor(251, 207, 232); // light pink-200 accent
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text('STATUTORY VALUE TRANSFER LEDGER IN COMPLIANCE WITH JPMA TRANSPARENCY GUIDELINES (HCP / HCO TRANSPARENCY DISCLOSURES)', 14, 18);

        doc.setFillColor(219, 39, 119); 
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
        doc.text('REFERENCE TEMPLATE:', 20, 42);
        doc.text('DATE GENERATED:', 20, 48);
        doc.text('COMPLIANCE STATUS:', 20, 54);
        doc.text('LEGAL RETENTION TIME:', 20, 60);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59); 
        doc.text(title.toUpperCase(), 65, 42);
        doc.text(new Date().toLocaleString('ja-JP'), 65, 48);
        doc.setTextColor(22, 163, 74); // success green
        doc.setFont('helvetica', 'bold');
        doc.text('COMPLIANT & SECURE (JPMA LEGISLATIVE PUBLIC RECORD)', 65, 54);
        doc.setTextColor(30, 41, 59); 
        doc.setFont('helvetica', 'normal');
        doc.text('MANDATORY RETENTION RECORD OF 3 YEARS (JPMA PUBLIC STATUTORY ARCHIVE)', 65, 60);

        // Total sum
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139); 
        doc.text('CONSOLIDATED DISCLOSURE VALUE', 200, 42);
        
        doc.setTextColor(236, 72, 153); 
        doc.setFontSize(16);
        doc.text('JPY ¥' + totalAmount.toLocaleString(), 200, 50);

        doc.setTextColor(100, 116, 139); 
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Total records: ' + filteredTx.length + ' compliant rows', 200, 56);

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
          doc.text('Please load your regional spend spreadsheet in the Ingestion Portal to execute Japan standard normalization.', 20, 102);
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
          doc.text('JPMA JAPAN STATUTORY DISCLOSURE PREVIEW | GENERATED DIRECTLY BY THE QORDATA COMPLIANCE MODULE', 14, 199);
          doc.text('CONFORMITY WITH JPMA TRANSPARENCY GUIDELINES | RETENTION TIME REQUIREMENTS FOR AUDIT RESTRICTED', 14, 203);
          
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
        console.error('Failed to generate Japan PDF:', err);
        alert('An error occurred during report construction.');
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 250);
  };

  const templates = [
    { id: 1, title: 'Template 1: R&D Expenses', desc: 'Joint research funding, clinical trial costs, post-marketing clinical trials, and side-effect reporting support.' },
    { id: 2, title: 'Template 2: Academic Donations', desc: 'Financial donations for academic promotion, academic society support, and co-sponsored seminars.' },
    { id: 3, title: 'Template 3: Lecturing & Consulting', desc: 'Lecturing fees, consulting service contracts, authoring/writing fees, and advisory panels.' },
    { id: 4, title: 'Template 4: Promotional Information', desc: 'Costs of promotional materials, printing/distributing medical information, and educational briefings.' },
    { id: 5, title: 'Template 5: Other Expenses & Meals', desc: 'Meetings, food & beverage support, hospitality, and taxi/transport support for HCPs.' }
  ];

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>JPMA Statutory Disclosures</h1>
          <p className="page-subtitle" style={{ margin: '8px 0 0 0' }}>Generate and audit compliant reports in accordance with the JPMA transparency guidelines.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleGenerateStatement}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', backgroundColor: '#ec4899', borderColor: '#ec4899' }}
        >
          <Sparkles size={16} /> 
          {showAiStatement ? 'Hide Cover Statement' : 'Generate Compliance Statement'}
        </button>
      </div>

      {showAiStatement && (
        <div className="card animate-scale-up" style={{ 
          marginBottom: '32px', 
          border: '1px solid var(--border-color)', 
          background: 'rgba(30, 41, 59, 0.4)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Sparkles size={20} color="#ec4899" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 'bold' }}>AI-Generated Filing Cover Statement (JPMA Draft)</h3>
            {isStatementLoading && <Loader2 size={16} color="#ec4899" style={{ animation: 'spin 1s linear infinite' }} />}
          </div>
          
          {isStatementLoading ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Compiling aggregate values and formatting disclosure templates...</p>
          ) : (
            <div 
              style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{ 
                __html: statementContent
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/### (.*?)\n/g, '<h4 style="color:#ec4899;margin-top:16px;margin-bottom:8px;font-size:0.95rem;">$1</h4>')
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
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
                    style={{ flex: 1, justifyContent: 'center', backgroundColor: '#ec4899', borderColor: '#ec4899' }}
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
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Archived JPMA Disclosure Records (3 Years)</h2>
          </div>
          <p className="page-subtitle" style={{ marginBottom: '24px' }}>Historical log of all statutory CSV reports generated and compiled under JPMA guidelines.</p>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container" style={{ margin: 0 }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Archive Date</th>
                    <th>JPMA Template Title</th>
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
                          <span className="badge badge-success" style={{ fontSize: '0.75rem', backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                            {report.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="btn btn-primary" 
                            onClick={() => reDownloadArchive(report)}
                            style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#ec4899', borderColor: '#ec4899' }}
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
                <Eye size={20} color="#ec4899" />
                <span>Statutory PDF Preview — {activeTemplateTitle}</span>
              </div>
              <div className="pdf-toolbar-actions">
                <a 
                  href={previewPdfUrl} 
                  download={`JPMA_Statutory_${activeTemplateTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.9rem', textDecoration: 'none', backgroundColor: '#ec4899', borderColor: '#ec4899' }}
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
                title="Ministerial Report Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JapanReporting;
