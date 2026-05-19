import { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Clock, User } from 'lucide-react';
import * as XLSX from 'xlsx';

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

  useEffect(() => {
    fetchData();
  }, []);

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
                  <button className="btn btn-primary" onClick={() => exportTemplate(tpl.id, tpl.title)} style={{ width: '100%', justifyContent: 'center' }}>
                    <FileSpreadsheet size={18} /> Export MOHW CSV
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
    </div>
  );
};

export default Reporting;
