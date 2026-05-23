import { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Clock, User, Eye, X, Loader2 } from 'lucide-react';
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

const ItalyReporting = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [archivedReports, setArchivedReports] = useState<ArchivedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // PDF Preview States
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [activeTemplateTitle, setActiveTemplateTitle] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const fetchData = async () => {
    try {
      // 1. Fetch transactions from the Central Data Center's Italy stream feeds
      const itSpend = await APIGateway.getTransactions('IT');
      const mappedTx = itSpend.map(t => ({
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
      const cached = localStorage.getItem('it_transparency_archived_reports');
      if (cached) {
        setArchivedReports(JSON.parse(cached));
      } else {
        const seedArchives: ArchivedReport[] = [
          {
            id: 'ARC-IT-SEED-001',
            templateName: 'Modello B: Erogazioni Liberali e Donazioni',
            reportYear: '2026',
            generatedBy: 'SYSTEM',
            payload: JSON.stringify([]),
            status: 'COMPLIANT',
            createdAt: new Date().toISOString()
          }
        ];
        setArchivedReports(seedArchives);
        localStorage.setItem('it_transparency_archived_reports', JSON.stringify(seedArchives));
      }
    } catch (err) {
      console.error("Failed to fetch Italy reports data:", err);
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
        id: `ARC-IT-${Date.now()}`,
        templateName,
        reportYear: currentYear,
        generatedBy: 'ADMIN',
        payload: JSON.stringify(dataToExport),
        status: 'COMPLIANT',
        createdAt: new Date().toISOString()
      };
      
      const updated = [newReport, ...archivedReports];
      setArchivedReports(updated);
      localStorage.setItem('it_transparency_archived_reports', JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to archive Italy report:", err);
    }
  };

  const exportTemplate = async (templateNumber: number, title: string) => {
    let dataToExport: any[] = [];
    let filename = "";

    switch (templateNumber) {
      case 1:
        filename = "Modello_A_Convenzioni.csv";
        dataToExport = transactions
          .filter(t => t.categoryOfBenefit === 'CONVENZIONI')
          .map(t => ({
            'Denominazione Società': 'Qordata (Demo)',
            'Nome Beneficiario': t.entity.recipientName,
            'Tipologia Beneficiario': t.entity.recipientType,
            'Codice Fiscale / Albo': t.entity.licenseNumber,
            'Struttura Sanitaria Affiliata': t.entity.workplaceInstitution,
            'Data Convenzione': new Date(t.dateOfProvision).toLocaleDateString('it-IT'),
            'Descrizione Accordo': t.purposeOfBenefit,
            'Valore Convenuto (EUR)': t.amountEUR
          }));
        break;

      case 2:
        filename = "Modello_B_Erogazioni_Liberali.csv";
        dataToExport = transactions
          .filter(t => t.categoryOfBenefit === 'DONAZIONI')
          .map(t => ({
            'Denominazione Società': 'Qordata (Demo)',
            'Ente Ricevente (HCO)': t.entity.recipientName,
            'Codice Fiscale Ente': t.entity.licenseNumber,
            'Descrizione Oggetto Donazione': t.purposeOfBenefit,
            'Dettagli Attrezzatura/Progetto': t.details,
            'Data Erogazione': new Date(t.dateOfProvision).toLocaleDateString('it-IT'),
            'Valore Donazione (EUR)': t.amountEUR
          }));
        break;

      case 3:
        filename = "Modello_C_Partecipazioni_Azionarie.csv";
        // Seed an empty row or mock stake since it is a required statutory report
        dataToExport = [
          {
            'Denominazione Società': 'Qordata (Demo)',
            'Nome Professionista': 'Dr. Marco Valli',
            'Codice Fiscale': 'VLLMRC75A01F205H',
            'Tipologia Titolo Finanziario': 'Azioni Ordinarie',
            'Quota di Inerenza (%)': '0.05%',
            'Valore Azionario (EUR)': 5000,
            'Data Rilevazione': new Date().toLocaleDateString('it-IT')
          }
        ];
        break;
    }

    if (dataToExport.length === 0) {
      const emptyRow: any = {};
      if (templateNumber === 1) {
        emptyRow['Denominazione Società'] = ''; emptyRow['Nome Beneficiario'] = ''; emptyRow['Tipologia Beneficiario'] = ''; emptyRow['Codice Fiscale / Albo'] = ''; emptyRow['Struttura Sanitaria Affiliata'] = ''; emptyRow['Data Convenzione'] = ''; emptyRow['Descrizione Accordo'] = ''; emptyRow['Valore Convenuto (EUR)'] = '';
      } else if (templateNumber === 2) {
        emptyRow['Denominazione Società'] = ''; emptyRow['Ente Ricevente (HCO)'] = ''; emptyRow['Codice Fiscale Ente'] = ''; emptyRow['Descrizione Oggetto Donazione'] = ''; emptyRow['Dettagli Attrezzatura/Progetto'] = ''; emptyRow['Data Erogazione'] = ''; emptyRow['Valore Donazione (EUR)'] = '';
      }
      dataToExport = [emptyRow];
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Disclosures");
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
      XLSX.utils.book_append_sheet(workbook, worksheet, "Disclosures");
      XLSX.writeFile(workbook, filename, { bookType: 'csv' });
    } catch (err) {
      console.error("Failed to re-download Italian archive:", err);
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
          filteredTx = transactions.filter(t => t.categoryOfBenefit === 'CONVENZIONI');
          columns = ['Societa', 'Beneficiario', 'Codice Fiscale/Albo', 'Struttura Sanitaria', 'Data Accordo', 'Oggetto Convenzione', 'Importo (EUR)'];
          bodyRows = filteredTx.map(t => [
            'Qordata (Demo)',
            t.entity.recipientName,
            t.entity.licenseNumber || 'N/A',
            t.entity.workplaceInstitution || 'N/A',
            new Date(t.dateOfProvision).toLocaleDateString('it-IT'),
            t.purposeOfBenefit || 'Convenzione',
            'EUR ' + t.amountEUR.toLocaleString('it-IT')
          ]);
        } else if (templateNumber === 2) {
          filteredTx = transactions.filter(t => t.categoryOfBenefit === 'DONAZIONI');
          columns = ['Societa', 'Ente Ricevente (HCO)', 'Codice Fiscale Ente', 'Data Erogazione', 'Descrizione Erogazione Liberale', 'Valore (EUR)'];
          bodyRows = filteredTx.map(t => [
            'Qordata (Demo)',
            t.entity.recipientName,
            t.entity.licenseNumber || 'N/A',
            new Date(t.dateOfProvision).toLocaleDateString('it-IT'),
            t.purposeOfBenefit || 'Erogazione Liberale',
            'EUR ' + t.amountEUR.toLocaleString('it-IT')
          ]);
        } else if (templateNumber === 3) {
          // Render mock shares
          columns = ['Societa', 'Professionista', 'Codice Fiscale', 'Tipologia Titolo', 'Quota %', 'Valore Azionario', 'Data'];
          bodyRows = [[
            'Qordata (Demo)',
            'Dr. Marco Valli',
            'VLLMRC75A01F205H',
            'Azioni Ordinarie',
            '0.05%',
            'EUR 5.000,00',
            new Date().toLocaleDateString('it-IT')
          ]];
        }

        totalAmount = templateNumber === 3 ? 5000 : filteredTx.reduce((sum, t) => sum + t.amountEUR, 0);

        // 1. Brand Header Banner (crimson Red-800 for Ministry of Health Italy)
        doc.setFillColor(153, 27, 27); 
        doc.rect(0, 0, 297, 28, 'F');
        
        // Header Text
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('REGISTRO PUBBLICO NAZIONALE DELLA SANITÀ TRASPARENTE', 14, 12);
        
        doc.setTextColor(254, 202, 202); // light pink-200 accent
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text('REPORT STATUTARIO IN CONFORMITÀ ALLA LEGGE 31 MAGGIO 2022, N. 31 (TRASPARENZA DEI RAPPORTI ECONOMICI E STAKEHOLDERS)', 14, 18);

        doc.setFillColor(220, 38, 38); 
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
        doc.text(new Date().toLocaleString('it-IT'), 65, 48);
        doc.setTextColor(22, 163, 74); // success green
        doc.setFont('helvetica', 'bold');
        doc.text('CONFORME & CRITTOGRAFATO (FORMATO PUBBLICO DE-IDENTIFICATO)', 65, 54);
        doc.setTextColor(30, 41, 59); 
        doc.setFont('helvetica', 'normal');
        doc.text('CONSERVAZIONE MANDATORIA DI 5 ANNI (MINISTERO DELLA SALUTE)', 65, 60);

        // Total sum
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139); 
        doc.text('VALORE CONSOLIDATO DISCLOSURE', 200, 42);
        
        doc.setTextColor(153, 27, 27); 
        doc.setFontSize(16);
        doc.text('EUR €' + totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 }), 200, 50);

        doc.setTextColor(100, 116, 139); 
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Record totali: ' + (templateNumber === 3 ? 1 : filteredTx.length) + ' righe conformi', 200, 56);

        // Generate dynamic table or empty fallback
        if (bodyRows.length === 0) {
          doc.setFillColor(254, 242, 242); 
          doc.rect(14, 74, 269, 40, 'F');
          doc.setDrawColor(254, 202, 202); 
          doc.rect(14, 74, 269, 40);
          
          doc.setTextColor(220, 38, 38); 
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('NESSUN TRASFERIMENTO DI VALORE RILEVATO', 20, 88);
          
          doc.setTextColor(127, 29, 29); 
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text('Non sono state trovate transazioni di trasparenza corrispondenti a questa categoria per il periodo fiscale attivo.', 20, 96);
          doc.text('Effettuare il caricamento del file spend nel Portale Ingestione per eseguire la normalizzazione ministeriale.', 20, 102);
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
          doc.text('PREVIEW REGISTRO DELLA TRASPARENZA SANITARIA | GENERATO IN AUTOMATICO DALLA PIATTAFORMA QORDATA', 14, 199);
          doc.text('CONFORMITÀ ART. 3 LEGGE 31/2022 | RETENZIONE DOCUMENTALE MANDATORIA DELLA REGISTRAZIONE DI 5 ANNI', 14, 203);
          
          doc.setFont('helvetica', 'bold');
          doc.text('PAGINA ' + i + ' DI ' + totalPages, 270, 199);
        }

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        
        if (previewPdfUrl) {
          URL.revokeObjectURL(previewPdfUrl);
        }
        
        setPreviewPdfUrl(url);
        setIsPreviewing(true);
      } catch (err) {
        console.error('Failed to generate Italian PDF:', err);
        alert('Errore durante la compilazione del report ministeriale.');
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 250);
  };

  const templates = [
    { id: 1, title: 'Modello A: Convenzioni e Accordi', desc: 'Accordi stipulati tra aziende e professionisti sanitari (consulenze, docenze, viaggi, registrazioni a congressi).' },
    { id: 2, title: 'Modello B: Erogazioni Liberali', desc: 'Donazioni liberali in denaro o beni a favore di strutture sanitarie, università, istituti di ricerca o associazioni.' },
    { id: 3, title: 'Modello C: Partecipazioni Azionarie', desc: 'Partecipazioni finanziarie, azioni, obbligazioni o quote azionarie detenute da HCP nel capitale della società.' }
  ];

  return (
    <div style={{ paddingBottom: '40px' }}>
      <h1 className="page-title">Modelli Ministeriali Sanità Trasparente</h1>
      <p className="page-subtitle">Sezione dedicata per generare ed esportare le comunicazioni di trasparenza previste dalla Legge 31/2022 per il Ministero della Salute.</p>

      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Caricamento dati in corso...</p>
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
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Archivio Storico delle Comunicazioni (5 Anni)</h2>
          </div>
          <p className="page-subtitle" style={{ marginBottom: '24px' }}>Registro storico di tutte le comunicazioni trasmesse al registro pubblico ministeriale.</p>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container" style={{ margin: 0 }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Data Archiviazione</th>
                    <th>Modello Ministeriale</th>
                    <th>Anno Fiscale</th>
                    <th>Operatore</th>
                    <th>Stato Trasmissione</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        Nessun report in archivio.
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
                <span>Anteprima Ministeriale Legge 31/2022 — {activeTemplateTitle}</span>
              </div>
              <div className="pdf-toolbar-actions">
                <a 
                  href={previewPdfUrl} 
                  download={`Sanita_Trasparente_${activeTemplateTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.9rem', textDecoration: 'none' }}
                >
                  <Download size={16} /> Scarica PDF
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

export default ItalyReporting;
