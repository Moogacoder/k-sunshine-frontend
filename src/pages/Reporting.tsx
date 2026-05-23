import { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Clock, User, Eye, X, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';


interface Transaction {
  id: string;
  categoryOfBenefit: string;
  dateOfProvision: string;
  placeOfProvision: string;
  purposeOfBenefit: string;
  amountKRW: number;
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

const Reporting = () => {
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
      const [txRes, archiveRes] = await Promise.all([
        fetch('https://k-sunshine-backend-381662135057.us-central1.run.app/api/reports/transactions'),
        fetch('https://k-sunshine-backend-381662135057.us-central1.run.app/api/reports/archive')
      ]);
      
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data);
      }
      if (archiveRes.ok) {
        const data = await archiveRes.json();
        setArchivedReports(data);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
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
      const response = await fetch('https://k-sunshine-backend-381662135057.us-central1.run.app/api/reports/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName,
          reportYear: currentYear,
          payload: dataToExport,
          generatedBy: 'ADMIN' // Can be tied to AuthContext later
        })
      });
      if (response.ok) {
        const newReport = await response.json();
        setArchivedReports(prev => [newReport, ...prev]);
      }
    } catch (err) {
      console.error("Failed to archive report:", err);
    }
  };

  const exportTemplate = async (templateNumber: number, title: string) => {
    let dataToExport: any[] = [];
    let filename = "";

    switch (templateNumber) {
      case 1:
        filename = "Template_1_Samples.csv";
        dataToExport = transactions
          .filter(t => t.categoryOfBenefit.toLowerCase().includes('sample'))
          .map(t => ({
            'Company Name': 'Qordata (Demo)',
            'Product Name': '',
            'Product Approval Number': '',
            'Recipient Name (de-identified in public)': t.entity.recipientName,
            'Recipient Licence Number': t.entity.licenseNumber,
            'Recipient Institution': t.entity.workplaceInstitution,
            'Date of Provision': new Date(t.dateOfProvision).toLocaleDateString(),
            'Quantity Provided': '',
            'Unit Value (KRW)': '',
            'Total Value (KRW)': t.amountKRW,
            'Purpose': t.purposeOfBenefit
          }));
        break;

      case 2:
        filename = "Template_2_Conference_Support.csv";
        dataToExport = transactions
          .filter(t => t.categoryOfBenefit.toLowerCase().includes('conference') || t.categoryOfBenefit.toLowerCase().includes('sponsorship'))
          .map(t => ({
            'Company Name': 'Qordata (Demo)',
            'Conference Name': t.purposeOfBenefit,
            'Conference Organiser': '',
            'Conference Date(s)': new Date(t.dateOfProvision).toLocaleDateString(),
            'Conference Location': t.placeOfProvision,
            'Support Channel': 'KRPIA',
            'Supported Institution (public)': t.entity.workplaceInstitution,
            'Number of Attendees Supported': '',
            'Support Amount (KRW)': t.amountKRW,
            'Breakdown: Transportation (KRW)': '',
            'Breakdown: Registration Fee (KRW)': '',
            'Breakdown: Meals (KRW)': '',
            'Breakdown: Lodging (KRW)': '',
            'Total Support Amount (KRW)': t.amountKRW
          }));
        break;

      case 3:
        filename = "Template_3_Clinical_Trial.csv";
        dataToExport = transactions
          .filter(t => t.categoryOfBenefit.toLowerCase().includes('clinical') || t.categoryOfBenefit.toLowerCase().includes('research'))
          .map(t => ({
            'Company Name': 'Qordata (Demo)',
            'Trial/Study Name (de-identified in public)': t.purposeOfBenefit,
            'Trial Registration Number': '',
            'Responsible Party Name (de-identified)': t.entity.recipientName,
            'Responsible Party Licence Number': t.entity.licenseNumber,
            'Institution Name': t.entity.workplaceInstitution,
            'Role of Recipient': '',
            'Support Type': t.categoryOfBenefit,
            'Support Period': '',
            'Amount per Recipient (KRW)': t.amountKRW,
            'Total Amount (KRW)': t.amountKRW,
            'Payment Date(s)': new Date(t.dateOfProvision).toLocaleDateString()
          }));
        break;

      case 4:
        filename = "Template_4_Product_Presentations.csv";
        dataToExport = transactions
          .filter(t => t.categoryOfBenefit.toLowerCase().includes('presentation') || t.categoryOfBenefit.toLowerCase().includes('food') || t.categoryOfBenefit.toLowerCase().includes('promotional'))
          .map(t => ({
            'Company Name': 'Qordata (Demo)',
            'Product Name': '',
            'Event Name / Description': t.purposeOfBenefit,
            'Event Date': new Date(t.dateOfProvision).toLocaleDateString(),
            'Event Location': t.placeOfProvision,
            'Attending Institution (public)': t.entity.workplaceInstitution,
            'Number of Attendees (from institution)': '',
            'Food & Beverage Cost (KRW)': t.categoryOfBenefit.toLowerCase().includes('food') ? t.amountKRW : '',
            'Promotional Items / Freebies Provided': t.details,
            'Total Value of Items (KRW)': t.categoryOfBenefit.toLowerCase().includes('promotional') ? t.amountKRW : '',
            'Total Event Expenditure per Attendee (KRW)': t.amountKRW
          }));
        break;

      case 5:
        filename = "Template_5_Discounts.csv";
        dataToExport = transactions
          .filter(t => t.categoryOfBenefit.toLowerCase().includes('discount'))
          .map(t => ({
            'Company Name': 'Qordata (Demo)',
            'Recipient Institution': t.entity.workplaceInstitution,
            'Product Name': '',
            'Invoice / Transaction Reference': '',
            'Transaction Date': new Date(t.dateOfProvision).toLocaleDateString(),
            'Normal Sales Price (KRW)': '',
            'Payment Method': '',
            'Discount Rate (%)': '',
            'Discount Amount (KRW)': t.amountKRW,
            'Final Price Paid (KRW)': '',
            'Basis for Discount': t.purposeOfBenefit
          }));
        break;

      case 6:
        filename = "Template_6_PMS.csv";
        dataToExport = transactions
          .filter(t => t.categoryOfBenefit.toLowerCase().includes('pms'))
          .map(t => ({
            'Company Name': 'Qordata (Demo)',
            'Drug/Device Name': '',
            'PMS Study Title': t.purposeOfBenefit,
            'MFDS PMS Registration Number': '',
            'Recipient Name (de-identified in public)': t.entity.recipientName,
            'Recipient Licence Number': t.entity.licenseNumber,
            'Recipient Institution': t.entity.workplaceInstitution,
            'Case Report Date': new Date(t.dateOfProvision).toLocaleDateString(),
            'Case Report Type': '',
            'Honorarium per Case Report (KRW)': t.amountKRW,
            'Number of Reports Submitted': '',
            'Total Honorarium Paid (KRW)': t.amountKRW,
            'Payment Date': new Date(t.dateOfProvision).toLocaleDateString()
          }));
        break;

      case 7:
        filename = "Template_7_Consultancy.csv";
        dataToExport = transactions
          .filter(t => t.categoryOfBenefit.toLowerCase().includes('consultancy') || t.categoryOfBenefit.toLowerCase().includes('lecture'))
          .map(t => ({
            'Company Name': 'Qordata (Demo)',
            'Recipient Name (de-identified in public)': t.entity.recipientName,
            'Recipient Licence Number': t.entity.licenseNumber,
            'Recipient Institution': t.entity.workplaceInstitution,
            'Service Type': t.categoryOfBenefit,
            'Description of Service': t.purposeOfBenefit,
            'Service Date(s)': new Date(t.dateOfProvision).toLocaleDateString(),
            'Duration (hours)': '',
            'Fee Rate (KRW per hour/session)': '',
            'Session Fee (KRW)': t.amountKRW,
            'Daily Fee (KRW)': '',
            'Annual Cumulative Fee per HCP (KRW)': '',
            'Total Payment (KRW)': t.amountKRW,
            'Payment Date': new Date(t.dateOfProvision).toLocaleDateString(),
            'Supporting Agreement Reference': '',
            'Market Research Institution (if applicable)': '',
            'Reported to KRPIA/KPBMA (Q)': ''
          }));
        break;
    }

    if (dataToExport.length === 0) {
      const emptyRow: any = {};
      switch (templateNumber) {
        case 1: emptyRow['Company Name'] = ''; emptyRow['Product Name'] = ''; emptyRow['Product Approval Number'] = ''; emptyRow['Recipient Name (de-identified in public)'] = ''; emptyRow['Recipient Licence Number'] = ''; emptyRow['Recipient Institution'] = ''; emptyRow['Date of Provision'] = ''; emptyRow['Quantity Provided'] = ''; emptyRow['Unit Value (KRW)'] = ''; emptyRow['Total Value (KRW)'] = ''; emptyRow['Purpose'] = ''; break;
        case 2: emptyRow['Company Name'] = ''; emptyRow['Conference Name'] = ''; emptyRow['Conference Organiser'] = ''; emptyRow['Conference Date(s)'] = ''; emptyRow['Conference Location'] = ''; emptyRow['Support Channel'] = ''; emptyRow['Supported Institution (public)'] = ''; emptyRow['Number of Attendees Supported'] = ''; emptyRow['Support Amount (KRW)'] = ''; emptyRow['Breakdown: Transportation (KRW)'] = ''; emptyRow['Breakdown: Registration Fee (KRW)'] = ''; emptyRow['Breakdown: Meals (KRW)'] = ''; emptyRow['Breakdown: Lodging (KRW)'] = ''; emptyRow['Total Support Amount (KRW)'] = ''; break;
        case 3: emptyRow['Company Name'] = ''; emptyRow['Trial/Study Name (de-identified in public)'] = ''; emptyRow['Trial Registration Number'] = ''; emptyRow['Responsible Party Name (de-identified)'] = ''; emptyRow['Responsible Party Licence Number'] = ''; emptyRow['Institution Name'] = ''; emptyRow['Role of Recipient'] = ''; emptyRow['Support Type'] = ''; emptyRow['Support Period'] = ''; emptyRow['Amount per Recipient (KRW)'] = ''; emptyRow['Total Amount (KRW)'] = ''; emptyRow['Payment Date(s)'] = ''; break;
        case 4: emptyRow['Company Name'] = ''; emptyRow['Product Name'] = ''; emptyRow['Event Name / Description'] = ''; emptyRow['Event Date'] = ''; emptyRow['Event Location'] = ''; emptyRow['Attending Institution (public)'] = ''; emptyRow['Number of Attendees (from institution)'] = ''; emptyRow['Food & Beverage Cost (KRW)'] = ''; emptyRow['Promotional Items / Freebies Provided'] = ''; emptyRow['Total Value of Items (KRW)'] = ''; emptyRow['Total Event Expenditure per Attendee (KRW)'] = ''; break;
        case 5: emptyRow['Company Name'] = ''; emptyRow['Recipient Institution'] = ''; emptyRow['Product Name'] = ''; emptyRow['Invoice / Transaction Reference'] = ''; emptyRow['Transaction Date'] = ''; emptyRow['Normal Sales Price (KRW)'] = ''; emptyRow['Payment Method'] = ''; emptyRow['Discount Rate (%)'] = ''; emptyRow['Discount Amount (KRW)'] = ''; emptyRow['Final Price Paid (KRW)'] = ''; emptyRow['Basis for Discount'] = ''; break;
        case 6: emptyRow['Company Name'] = ''; emptyRow['Drug/Device Name'] = ''; emptyRow['PMS Study Title'] = ''; emptyRow['MFDS PMS Registration Number'] = ''; emptyRow['Recipient Name (de-identified in public)'] = ''; emptyRow['Recipient Licence Number'] = ''; emptyRow['Recipient Institution'] = ''; emptyRow['Case Report Date'] = ''; emptyRow['Case Report Type'] = ''; emptyRow['Honorarium per Case Report (KRW)'] = ''; emptyRow['Number of Reports Submitted'] = ''; emptyRow['Total Honorarium Paid (KRW)'] = ''; emptyRow['Payment Date'] = ''; break;
        case 7: emptyRow['Company Name'] = ''; emptyRow['Recipient Name (de-identified in public)'] = ''; emptyRow['Recipient Licence Number'] = ''; emptyRow['Recipient Institution'] = ''; emptyRow['Service Type'] = ''; emptyRow['Description of Service'] = ''; emptyRow['Service Date(s)'] = ''; emptyRow['Duration (hours)'] = ''; emptyRow['Fee Rate (KRW per hour/session)'] = ''; emptyRow['Session Fee (KRW)'] = ''; emptyRow['Daily Fee (KRW)'] = ''; emptyRow['Annual Cumulative Fee per HCP (KRW)'] = ''; emptyRow['Total Payment (KRW)'] = ''; emptyRow['Payment Date'] = ''; emptyRow['Supporting Agreement Reference'] = ''; emptyRow['Market Research Institution (if applicable)'] = ''; emptyRow['Reported to KRPIA/KPBMA (Q)'] = ''; break;
      }
      dataToExport = [emptyRow];
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
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
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
      XLSX.writeFile(workbook, filename, { bookType: 'csv' });
    } catch (err) {
      console.error("Failed to parse and download archive payload:", err);
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

    // Run PDF generation inside a setTimeout to allow UI spinner to render smoothly
    setTimeout(() => {
      try {
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        // 1. Filter transactions matching this report type exactly
        let filteredTx: Transaction[] = [];
        let columns: string[] = [];
        let bodyRows: string[][] = [];
        let totalAmount = 0;

        switch (templateNumber) {
          case 1:
            filteredTx = transactions.filter(t => t.categoryOfBenefit.toLowerCase().includes('sample'));
            columns = ['Company Name', 'Recipient Name', 'License Number', 'Institution', 'Date Provided', 'Quantity', 'Unit Val', 'Total Value (KRW)', 'Purpose'];
            bodyRows = filteredTx.map(t => [
              'Qordata (Demo)',
              t.entity.recipientName,
              t.entity.licenseNumber || 'N/A',
              t.entity.workplaceInstitution || 'N/A',
              new Date(t.dateOfProvision).toLocaleDateString(),
              '1 Unit',
              '₩' + t.amountKRW.toLocaleString(),
              '₩' + t.amountKRW.toLocaleString(),
              t.purposeOfBenefit || 'Sample Evaluation'
            ]);
            break;

          case 2:
            filteredTx = transactions.filter(t => t.categoryOfBenefit.toLowerCase().includes('conference') || t.categoryOfBenefit.toLowerCase().includes('sponsorship'));
            columns = ['Company Name', 'Conference Name', 'Date(s)', 'Location', 'Channel', 'Supported Institution', 'Support Amount (KRW)'];
            bodyRows = filteredTx.map(t => [
              'Qordata (Demo)',
              t.purposeOfBenefit || 'Academic Seminar',
              new Date(t.dateOfProvision).toLocaleDateString(),
              t.placeOfProvision || 'N/A',
              'KRPIA',
              t.entity.workplaceInstitution || 'N/A',
              '₩' + t.amountKRW.toLocaleString()
            ]);
            break;

          case 3:
            filteredTx = transactions.filter(t => t.categoryOfBenefit.toLowerCase().includes('clinical') || t.categoryOfBenefit.toLowerCase().includes('research'));
            columns = ['Company Name', 'Study / Trial Name', 'Responsible Investigator', 'License Number', 'Institution Name', 'Support Type', 'Aggregated Amount (KRW)', 'Payment Date'];
            bodyRows = filteredTx.map(t => [
              'Qordata (Demo)',
              t.purposeOfBenefit || 'Clinical Trial Study',
              t.entity.recipientName,
              t.entity.licenseNumber || 'N/A',
              t.entity.workplaceInstitution || 'N/A',
              t.categoryOfBenefit,
              '₩' + t.amountKRW.toLocaleString(),
              new Date(t.dateOfProvision).toLocaleDateString()
            ]);
            break;

          case 4:
            filteredTx = transactions.filter(t => t.categoryOfBenefit.toLowerCase().includes('presentation') || t.categoryOfBenefit.toLowerCase().includes('food') || t.categoryOfBenefit.toLowerCase().includes('promotional'));
            columns = ['Company Name', 'Event Description', 'Event Date', 'Location', 'Attending Institution', 'Food & Beverage Cost', 'Promo Details', 'Total Spend (KRW)'];
            bodyRows = filteredTx.map(t => [
              'Qordata (Demo)',
              t.purposeOfBenefit || 'Briefing Session',
              new Date(t.dateOfProvision).toLocaleDateString(),
              t.placeOfProvision || 'N/A',
              t.entity.workplaceInstitution || 'N/A',
              t.categoryOfBenefit.toLowerCase().includes('food') ? '₩' + t.amountKRW.toLocaleString() : '₩0',
              t.details || '-',
              '₩' + t.amountKRW.toLocaleString()
            ]);
            break;

          case 5:
            filteredTx = transactions.filter(t => t.categoryOfBenefit.toLowerCase().includes('discount'));
            columns = ['Company Name', 'Recipient Institution', 'Transaction Date', 'Ref Reference', 'Normal Price', 'Discount Amount (KRW)', 'Discount Basis'];
            bodyRows = filteredTx.map(t => [
              'Qordata (Demo)',
              t.entity.workplaceInstitution || 'N/A',
              new Date(t.dateOfProvision).toLocaleDateString(),
              'INV-' + t.id.slice(0, 8).toUpperCase(),
              '₩' + (t.amountKRW * 1.1).toLocaleString(),
              '₩' + t.amountKRW.toLocaleString(),
              t.purposeOfBenefit || 'Electronic Settlement Discount'
            ]);
            break;

          case 6:
            filteredTx = transactions.filter(t => t.categoryOfBenefit.toLowerCase().includes('pms'));
            columns = ['Company Name', 'PMS Study Title', 'Recipient Name', 'License Number', 'Institution', 'Honorarium per Case', 'Total Honorarium (KRW)', 'Payment Date'];
            bodyRows = filteredTx.map(t => [
              'Qordata (Demo)',
              t.purposeOfBenefit || 'PMS Protocol',
              t.entity.recipientName,
              t.entity.licenseNumber || 'N/A',
              t.entity.workplaceInstitution || 'N/A',
              '₩' + t.amountKRW.toLocaleString(),
              '₩' + t.amountKRW.toLocaleString(),
              new Date(t.dateOfProvision).toLocaleDateString()
            ]);
            break;

          case 7:
            filteredTx = transactions.filter(t => t.categoryOfBenefit.toLowerCase().includes('consultancy') || t.categoryOfBenefit.toLowerCase().includes('lecture'));
            columns = ['Company Name', 'Recipient Name', 'License Number', 'Institution', 'Service Type', 'Description of Service', 'Total Payment (KRW)', 'Payment Date'];
            bodyRows = filteredTx.map(t => [
              'Qordata (Demo)',
              t.entity.recipientName,
              t.entity.licenseNumber || 'N/A',
              t.entity.workplaceInstitution || 'N/A',
              t.categoryOfBenefit,
              t.purposeOfBenefit || 'Consultancy Engagement',
              '₩' + t.amountKRW.toLocaleString(),
              new Date(t.dateOfProvision).toLocaleDateString()
            ]);
            break;
        }

        totalAmount = filteredTx.reduce((sum, t) => sum + t.amountKRW, 0);

        // 2. Build the PDF layout (Landscape A4: 297mm x 210mm)
        
        // Brand Header Banner
        doc.setFillColor(11, 15, 25); // obsidian-950 (matching base bg)
        doc.rect(0, 0, 297, 28, 'F');
        
        // Header Text
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('K-SUNSHINE STATUTORY AUDIT & COMPLIANCE REPORT', 14, 12);
        
        doc.setTextColor(167, 139, 250); // violet-300 (accent light glow)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text('REPORTS FORMULATED UNDER THE PHARMACEUTICAL AFFAIRS ACT & MINISTRY OF HEALTH AND WELFARE (MOHW) REGULATORY STANDARDS', 14, 18);

        doc.setFillColor(124, 58, 237); // purple-600 (primary brand purple)
        doc.rect(0, 26, 297, 2, 'F');

        // Executive Summary Container
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(14, 34, 269, 32, 'F');
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.rect(14, 34, 269, 32);

        // Metadata Labels and Values
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text('STATUTORY TEMPLATE:', 20, 42);
        doc.text('GENERATION TIME:', 20, 48);
        doc.text('DISCLOSURE STATUS:', 20, 54);
        doc.text('DATA RETENTION REQUIREMENT:', 20, 60);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text(title.toUpperCase(), 60, 42);
        doc.text(new Date().toLocaleString(), 60, 48);
        doc.setTextColor(74, 222, 128); // green-400 (secondary brand green)
        doc.setFont('helvetica', 'bold');
        doc.text('COMPLIANT & SECURE (DE-IDENTIFIED AUDIT FORMAT)', 60, 54);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.setFont('helvetica', 'normal');
        doc.text('5-YEAR MANDATED RETENTION (MINISTRY OF HEALTH & WELFARE)', 60, 60);

        // Spend Statistics (Right Aligned in summary container)
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text('TOTAL REPORTED SPEND', 200, 42);
        
        doc.setTextColor(124, 58, 237); // purple-600 (primary brand purple)
        doc.setFontSize(16);
        doc.text('KRW ₩' + totalAmount.toLocaleString(), 200, 50);

        doc.setTextColor(100, 116, 139); // slate-500
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Records Captured: ' + filteredTx.length + ' compliant rows', 200, 56);

        // Generate dynamic table or empty fallback
        if (bodyRows.length === 0) {
          // Render a clean empty state card instead of empty autoTable
          doc.setFillColor(254, 242, 242); // red-50
          doc.rect(14, 74, 269, 40, 'F');
          doc.setDrawColor(254, 202, 202); // red-200
          doc.rect(14, 74, 269, 40);
          
          doc.setTextColor(220, 38, 38); // red-600
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('NO COMPLIANCE TRANSACTIONS FOUND', 20, 88);
          
          doc.setTextColor(127, 29, 29); // red-900
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text('There are currently no matching spend transaction logs under this category for the active fiscal period.', 20, 96);
          doc.text('Upload transaction sheets under the Ingestion portal to run statutory audit validation.', 20, 102);
        } else {
          autoTable(doc, {
            startY: 74,
            head: [columns],
            body: bodyRows,
            theme: 'striped',
            headStyles: { 
              fillColor: [17, 24, 39], // charcoal-900 (surface bg)
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
              0: { cellWidth: 30 }, // Company Name
              1: { fontStyle: 'bold' } // Recipient / Primary Title
            },
            margin: { left: 14, right: 14 }
          });
        }

        // Add standard legal disclaimer & footer on all pages
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          
          // Draw thin bottom divider
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.line(14, 194, 283, 194);
          
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184); // slate-400
          doc.setFont('helvetica', 'normal');
          doc.text('CONFIDENTIAL AUDIT PREVIEW | GENERATED AUTOMATICALLY BY THE K-SUNSHINE COMPLIANCE ENGINE', 14, 199);
          doc.text('PHARMACEUTICAL AFFAIRS ACT ARTICLE 47-2 ENFORCEMENT & COMPLIANCE PROTOCOLS | FIVE-YEAR FISCAL RECORD RETENTION MANDATED', 14, 203);
          
          doc.setFont('helvetica', 'bold');
          doc.text('PAGE ' + i + ' OF ' + totalPages, 270, 199);
        }

        // Save generated PDF as Blob URL and toggle the preview UI
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        
        // Clean up previous blob URL if exists to avoid memory leak
        if (previewPdfUrl) {
          URL.revokeObjectURL(previewPdfUrl);
        }
        
        setPreviewPdfUrl(url);
        setIsPreviewing(true);
      } catch (err) {
        console.error('Failed to generate PDF Report preview:', err);
        alert('Failed to construct statutory PDF report. Please contact system admin.');
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 250);
  };

  const templates = [

    { id: 1, title: 'Template 1: Drug/Device Samples', desc: 'Provision of samples to HCPs in minimum packaging units for product evaluation.' },
    { id: 2, title: 'Template 2: Academic Conference Support', desc: 'Financial support for HCPs to attend conferences, channelled via KRPIA or KPBMA.' },
    { id: 3, title: 'Template 3: Clinical Trial Support', desc: 'Payments related to clinical trials and studies including honoraria for researchers.' },
    { id: 4, title: 'Template 4: Product Presentations', desc: 'Food, beverages, and promotional items provided at product briefing sessions.' },
    { id: 5, title: 'Template 5: Payment-Based Discounts', desc: 'Discounts on sales based on payment methods (e.g., early or electronic payment).' },
    { id: 6, title: 'Template 6: PMS Honoraria', desc: 'Honoraria paid to HCPs for conducting Post-Marketing Surveillance studies.' },
    { id: 7, title: 'Template 7: Market Research/Consultancy', desc: 'Compensation for bona fide consultancy or market research services at FMV.' },
  ];

  return (
    <div style={{ paddingBottom: '40px' }}>
      <h1 className="page-title">Compliance Reports (MOHW Templates)</h1>
      <p className="page-subtitle">Export official statutory reports exactly matching the 7 templates required by the South Korean Ministry of Health and Welfare.</p>

      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading report data...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '40px' }}>
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
                    <FileSpreadsheet size={18} /> Export CSV
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
                        Compiling...
                      </>
                    ) : (
                      <>
                        <Eye size={18} /> Preview PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '40px 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Report Archive (5-Year Retention)</h2>
          </div>
          <p className="page-subtitle" style={{ marginBottom: '24px' }}>Historical ledger of all generated statutory reports. Preserved exactly as they were at the time of export.</p>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container" style={{ margin: 0 }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Generated At</th>
                    <th>Template Name</th>
                    <th>Report Year</th>
                    <th>Generated By</th>
                    <th>Status</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        No reports have been generated yet.
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
                            <Download size={14} /> Re-Download
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
                <span>Statutory Report Preview — {activeTemplateTitle}</span>
              </div>
              <div className="pdf-toolbar-actions">
                <a 
                  href={previewPdfUrl} 
                  download={`K_Sunshine_${activeTemplateTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Audit.pdf`}
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
                title="Statutory PDF Report Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reporting;
