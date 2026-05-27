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
  amountCOP: number;
  currency: string;
  details: string;
  licenseNumber: string;
  entity: {
    recipientType: string;
    recipientName: string;
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

const ColombiaReporting = () => {
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
      const draft = await APIGateway.getComplianceStatement('CO', 2026);
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
      // 1. Fetch transactions from the Central Data Center's Colombia stream feeds (CO)
      const coSpend = await APIGateway.getTransactions('CO');
      const mappedTx = coSpend.map(t => ({
        id: t.id,
        categoryOfBenefit: t.spendCategory,
        dateOfProvision: t.dateOfProvision,
        placeOfProvision: t.placeOfProvision || 'Bogotá',
        purposeOfBenefit: t.purposeOfBenefit,
        amountCOP: t.amountOriginal,
        currency: t.currencyOriginal,
        details: t.details,
        licenseNumber: t.licenseNumber,
        entity: {
          recipientType: t.recipientType,
          recipientName: t.recipientName,
          workplaceInstitution: t.workplaceInstitution,
          specialtyDepartment: t.specialtyDepartment
        }
      }));
      setTransactions(mappedTx);

      // 2. Fetch reports from local storage
      const cached = localStorage.getItem('co_transparency_archived_reports');
      if (cached) {
        setArchivedReports(JSON.parse(cached));
      } else {
        const seedArchives: ArchivedReport[] = [
          {
            id: 'ARC-CO-SEED-001',
            templateName: 'Formulario 1: Registro General de Transferencias de Valor',
            reportYear: '2026',
            generatedBy: 'SYSTEM',
            payload: JSON.stringify([]),
            status: 'COMPLIANT',
            createdAt: new Date().toISOString()
          }
        ];
        setArchivedReports(seedArchives);
        localStorage.setItem('co_transparency_archived_reports', JSON.stringify(seedArchives));
      }
    } catch (err) {
      console.error("Failed to fetch Colombia reports data:", err);
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
        id: `ARC-CO-${Date.now()}`,
        templateName,
        reportYear: currentYear,
        generatedBy: 'ADMIN',
        payload: JSON.stringify(dataToExport),
        status: 'COMPLIANT',
        createdAt: new Date().toISOString()
      };
      
      const updated = [newReport, ...archivedReports];
      setArchivedReports(updated);
      localStorage.setItem('co_transparency_archived_reports', JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to archive Colombia report:", err);
    }
  };

  const exportTemplate = async (templateNumber: number, title: string) => {
    let dataToExport: any[] = [];
    let filename = "";

    switch (templateNumber) {
      case 1:
        filename = "Resolucion_2881_Formulario_1_Transferencias.csv";
        dataToExport = transactions
          .map(t => ({
            'Nit o Identificacion': t.licenseNumber,
            'Nombre del Beneficiario': t.entity.recipientName,
            'Tipo de Beneficiario': t.entity.recipientType,
            'Institucion de Salud Afiliada': t.entity.workplaceInstitution,
            'Categoria de la Transferencia': t.categoryOfBenefit,
            'Fecha de Provision': new Date(t.dateOfProvision).toLocaleDateString('es-CO'),
            'Ciudad de Provision': t.placeOfProvision,
            'Valor Transferencia (COP)': t.amountCOP,
            'Estado Compliance': t.amountCOP > 1500000 ? 'ALERTA_APROBADA' : 'CONFORME'
          }));
        break;

      case 2:
        filename = "Resolucion_2881_Formulario_2_Muestras_Medicas.csv";
        // Seed a required compliance report structure for Colombia Medical Samples
        dataToExport = [
          {
            'Nit o Identificacion': 'NIT-90048122-3',
            'Nombre del Profesional': 'Dr. Santiago Gomez',
            'Producto / Muestra': 'Beta-Blocker 50mg (Muestra Medica)',
            'Cantidad Entregada': '12 Unidades',
            'Valor Comercial Estimado (COP)': 320000,
            'Fecha de Entrega': new Date().toLocaleDateString('es-CO'),
            'Ciudad': 'Medellín'
          }
        ];
        break;

      case 3:
        filename = "Resolucion_2881_Formulario_3_Patrocinios.csv";
        // Seed an empty row or institutional donations since it is a required statutory report
        dataToExport = transactions
          .filter(t => t.categoryOfBenefit === 'DONACIONES')
          .map(t => ({
            'Nit del Ente / HCO': t.licenseNumber,
            'HCO Beneficiaria': t.entity.recipientName,
            'Descripcion del Patrocinio': t.purposeOfBenefit || 'Donacion de Equipamento',
            'Dettalles': t.details || 'Fines Cientificos',
            'Fecha de Asignacion': new Date(t.dateOfProvision).toLocaleDateString('es-CO'),
            'Valor Donacion (COP)': t.amountCOP
          }));
        break;
    }

    if (dataToExport.length === 0) {
      const emptyRow: any = {};
      if (templateNumber === 1) {
        emptyRow['Nit o Identificacion'] = ''; emptyRow['Nombre del Beneficiario'] = ''; emptyRow['Tipo de Beneficiario'] = ''; emptyRow['Institucion de Salud Afiliada'] = ''; emptyRow['Categoria de la Transferencia'] = ''; emptyRow['Fecha de Provision'] = ''; emptyRow['Ciudad de Provision'] = ''; emptyRow['Valor Transferencia (COP)'] = '';
      } else if (templateNumber === 3) {
        emptyRow['Nit del Ente / HCO'] = ''; emptyRow['HCO Beneficiaria'] = ''; emptyRow['Descripcion del Patrocinio'] = ''; emptyRow['Dettalles'] = ''; emptyRow['Fecha de Asignacion'] = ''; emptyRow['Valor Donacion (COP)'] = '';
      }
      dataToExport = [emptyRow];
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RTVSS_Colombia");
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
      XLSX.utils.book_append_sheet(workbook, worksheet, "RTVSS_Colombia");
      XLSX.writeFile(workbook, filename, { bookType: 'csv' });
    } catch (err) {
      console.error("Failed to re-download Colombian archive:", err);
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
          filteredTx = transactions;
          columns = ['Nit / CC / CE', 'Nombre Beneficiario', 'Institucion Afiliada', 'Categoria Spend', 'Ciudad Provision', 'Fecha Provision', 'Valor (COP)'];
          bodyRows = filteredTx.map(t => [
            t.licenseNumber || 'NIT-90048122-3',
            t.entity.recipientName,
            t.entity.workplaceInstitution || 'N/A',
            t.categoryOfBenefit,
            t.placeOfProvision,
            new Date(t.dateOfProvision).toLocaleDateString('es-CO'),
            'COP $' + t.amountCOP.toLocaleString('es-CO')
          ]);
        } else if (templateNumber === 2) {
          // Render mock samples
          columns = ['Nit o Identificacion', 'Nombre Profesional', 'Producto Entregado', 'Cantidad', 'Valor Estimado', 'Ciudad', 'Fecha'];
          bodyRows = [[
            'NIT-90048122-3',
            'Dr. Santiago Gomez',
            'Beta-Blocker 50mg (Muestra Medica)',
            '12 Unidades',
            'COP $320.000',
            'Medellín',
            new Date().toLocaleDateString('es-CO')
          ]];
        } else if (templateNumber === 3) {
          filteredTx = transactions.filter(t => t.categoryOfBenefit === 'DONACIONES');
          columns = ['Nit del Ente / HCO', 'HCO Beneficiaria', 'Descripcion Patrocinio', 'Detalles', 'Fecha Asignacion', 'Valor Donacion (COP)'];
          bodyRows = filteredTx.map(t => [
            t.licenseNumber,
            t.entity.recipientName,
            t.purposeOfBenefit || 'Donacion de Equipamento',
            t.details || 'Fines Cientificos',
            new Date(t.dateOfProvision).toLocaleDateString('es-CO'),
            'COP $' + t.amountCOP.toLocaleString('es-CO')
          ]);
        }

        if (templateNumber === 2) {
          totalAmount = 320000;
        } else if (templateNumber === 3) {
          totalAmount = filteredTx.reduce((sum, t) => sum + t.amountCOP, 0);
        } else {
          totalAmount = transactions.reduce((sum, t) => sum + t.amountCOP, 0);
        }

        // 1. Brand Header Banner (Ministry of Health Colombia - Deep Navy and Sky Blue #002f6c / #0284c7)
        doc.setFillColor(0, 47, 108); // Deep Navy
        doc.rect(0, 0, 297, 28, 'F');
        
        // Header Text
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('MINISTERIO DE SALUD Y PROTECCIÓN SOCIAL DE COLOMBIA', 14, 12);
        
        doc.setTextColor(191, 219, 254); // Light Blue-200 accent
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text('REGISTRO DE TRANSFERENCIAS DE VALOR ENTRE ACTORES DEL SECTOR SALUD Y LA INDUSTRIA - RESOLUCIÓN 2881 DE 2018 (RTVSS)', 14, 18);

        doc.setFillColor(2, 132, 199); // Sky blue divide line
        doc.rect(0, 26, 297, 2, 'F');

        // Executive Summary Card
        doc.setFillColor(248, 250, 252); 
        doc.rect(14, 34, 269, 32, 'F');
        doc.setDrawColor(203, 213, 225); 
        doc.rect(14, 34, 269, 32);

        // Metadata Labels
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); 
        doc.text('FORMULARIO OFICIAL:', 20, 42);
        doc.text('FECHA GENERACIÓN:', 20, 48);
        doc.text('ESTADO COMPLIANCE:', 20, 54);
        doc.text('MARCO LEGAL DE ARCHIVO:', 20, 60);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59); 
        doc.text(title.toUpperCase(), 65, 42);
        doc.text(new Date().toLocaleString('es-CO'), 65, 48);
        doc.setTextColor(2, 132, 199); // primary sky blue
        doc.setFont('helvetica', 'bold');
        doc.text('CERTIFICADO - DISPOSITIVO DE TRANSPARENCIA RTVSS CONFORME', 65, 54);
        doc.setTextColor(30, 41, 59); 
        doc.setFont('helvetica', 'normal');
        doc.text('MANDATORIO ARCHIVAR POR 5 AÑOS SEGÚN RESOLUCIÓN 2881 DE 2018', 65, 60);

        // Total sum
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139); 
        doc.text('VALORE CONSOLIDADO ACUMULADO', 200, 42);
        
        doc.setTextColor(0, 47, 108); // Deep Navy
        doc.setFontSize(15);
        doc.text('COP $' + totalAmount.toLocaleString('es-CO', { minimumFractionDigits: 0 }), 200, 50);

        doc.setTextColor(100, 116, 139); 
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Transacciones: ' + (templateNumber === 2 ? 1 : (templateNumber === 3 ? filteredTx.length : filteredTx.length)) + ' registradas', 200, 56);

        // Generate dynamic table or empty fallback
        if (bodyRows.length === 0) {
          doc.setFillColor(240, 249, 255); 
          doc.rect(14, 74, 269, 40, 'F');
          doc.setDrawColor(186, 230, 253); 
          doc.rect(14, 74, 269, 40);
          
          doc.setTextColor(2, 132, 199); 
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('NO SE ENCONTRARON TRANSFERENCIAS DE VALOR EN EL PERIODO', 20, 88);
          
          doc.setTextColor(30, 58, 138); 
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text('No hay transacciones guardadas en el registro nacional de Colombia que pertenezcan a este formulario.', 20, 96);
          doc.text('Por favor, cargue planillas de Resolution 2881 en el modulo Local Ingestion para habilitar la sincronizacion.', 20, 102);
        } else {
          autoTable(doc, {
            startY: 74,
            head: [columns],
            body: bodyRows,
            theme: 'striped',
            headStyles: { 
              fillColor: [30, 41, 59], 
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
              0: { cellWidth: 35 },
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
          doc.text('MINISTERIO DE SALUD Y PROTECCIÓN SOCIAL — COLOMBIA | REGISTRO DE TRASPARENCIA RTVSS DE-IDENTIFICADO', 14, 199);
          doc.text('CONFORMIDAD RESOLUCIÓN 2881 DE 2018 | AUDITADO CRITTOGRAFICAMENTE POR LA CENTRAL MULTI-PAÍS QORDATA', 14, 203);
          
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
        console.error('Failed to generate Colombian PDF:', err);
        alert('Error al compilar el reporte oficial de la Resolución 2881.');
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 250);
  };

  const templates = [
    { id: 1, title: 'Formulario 1: Transferencias RTVSS', desc: 'Registro de transferencias directas e indirectas de valor (honorarios, reuniones, gastos de viajes, inscripciones).' },
    { id: 2, title: 'Formulario 2: Muestras y Estudios', desc: 'Suministro de muestras médicas, material pedagógico, capacitación científica y material de investigación.' },
    { id: 3, title: 'Formulario 3: Patrocinios de HCO', desc: 'Acuerdos institucionales de patrocinio, donaciones científicas y contribuciones con organizaciones de salud.' }
  ];

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '2.5rem' }}>🇨🇴</span>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Reportes de Resolución 2881 (RTVSS)</h1>
            <p className="page-subtitle" style={{ margin: 0 }}>
              Generación y archivo oficial de planillas del Registro de Transferencias de Valor de la Industria Farmacéutica.
            </p>
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleGenerateStatement}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', backgroundColor: '#0284c7', borderColor: '#0284c7' }}
        >
          <Sparkles size={16} /> 
          {showAiStatement ? 'Ocultar Portada AI' : 'Certificación de Trasparencia AI'}
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
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 'bold' }}>AI-Generated Filing Cover Statement (Borrador RTVSS)</h3>
            {isStatementLoading && <Loader2 size={16} color="var(--primary-accent)" style={{ animation: 'spin 1s linear infinite' }} />}
          </div>
          
          {isStatementLoading ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Compilando valores consolidados y redactando certificación de presentación...</p>
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
        <p style={{ color: 'var(--text-secondary)' }}>Cargando datos del portal colombiano...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
            {templates.map(tpl => (
              <div key={tpl.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '3px solid #0284c7' }}>
                <div>
                  <h3 style={{ marginBottom: '12px', fontSize: '1.05rem', color: '#1e293b' }}>{tpl.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem', lineHeight: '1.4' }}>{tpl.desc}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => exportTemplate(tpl.id, tpl.title)} 
                    style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0284c7', borderColor: '#0284c7' }}
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
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>Historial de Envíos del RTVSS</h2>
          </div>
          <p className="page-subtitle" style={{ marginBottom: '24px' }}>Historial consolidado de reportes archivados y cargados al Ministerio de Salud y Protección Social.</p>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container" style={{ margin: 0 }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Fecha Archivo</th>
                    <th>Formulario RTVSS</th>
                    <th>Año Fiscal</th>
                    <th>Operador</th>
                    <th>Estado de Transmisión</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        No hay reportes colombianos guardados en el histórico.
                      </td>
                    </tr>
                  ) : (
                    archivedReports.map(report => (
                      <tr key={report.id}>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          <Clock size={12} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
                          {new Date(report.createdAt).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 600, color: '#1e293b' }}>{report.templateName}</td>
                        <td>{report.reportYear}</td>
                        <td>
                          <User size={12} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle', color: 'var(--text-secondary)' }} />
                          {report.generatedBy}
                        </td>
                        <td>
                          <span className="badge badge-success" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.3)', fontSize: '0.75rem' }}>
                            {report.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="btn btn-primary" 
                            onClick={() => reDownloadArchive(report)}
                            style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                          >
                            <Download size={14} /> Descargar
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
                <Eye size={20} color="#0284c7" />
                <span style={{ fontWeight: 600 }}>Vista Previa Resolución 2881 — {activeTemplateTitle}</span>
              </div>
              <div className="pdf-toolbar-actions">
                <a 
                  href={previewPdfUrl} 
                  download={`Resolucion_2881_${activeTemplateTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.9rem', textDecoration: 'none', backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                >
                  <Download size={16} /> Guardar PDF
                </a>
                <button 
                  className="btn" 
                  onClick={() => setIsPreviewing(false)}
                  style={{ 
                    background: 'rgba(0, 0, 0, 0.05)', 
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
                title="Vista Previa de Planilla de Trasparencia"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColombiaReporting;
