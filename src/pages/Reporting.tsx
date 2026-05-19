import { Download } from 'lucide-react';

const Reporting = () => {
  return (
    <div>
      <h1 className="page-title">Compliance Reports</h1>
      <p className="page-subtitle">Generate statutory reports formatted for the South Korean Ministry of Health and Welfare (MOHW).</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '12px' }}>K-PIA Annual Spend Report</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>Official submission format for aggregate spend on healthcare professionals, including samples, travel, and consulting fees.</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary"><Download size={18} /> Generate PDF</button>
            <button className="btn" style={{ border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}>Export CSV</button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '12px' }}>Clinical Trial Sponsorships</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>Detailed breakdown of investigator-sponsored and company-sponsored clinical trials and associated financial support.</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary"><Download size={18} /> Generate PDF</button>
            <button className="btn" style={{ border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}>Export CSV</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reporting;
