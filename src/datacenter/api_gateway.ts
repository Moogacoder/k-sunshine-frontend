// Qordata Global Pharma Transparency Data Center
// Central API Gateway Feeds and Multi-Country Orchestrator

export interface UniversalTransaction {
  id: string;
  batchId?: string;
  countryCode: string;
  reportingYear: number;
  recipientType: 'HCP' | 'THO' | 'INSTITUTION';
  recipientName: string;
  licenseNumber: string;
  workplaceInstitution: string;
  specialtyDepartment: string;
  spendCategory: string;
  dateOfProvision: string;
  placeOfProvision: string;
  purposeOfBenefit: string;
  details: string;
  amountOriginal: number;
  currencyOriginal: string;
  amountUSD: number;
  remediationStatus: 'APPROVED' | 'PENDING_REVIEW' | 'RESOLVED' | 'REJECTED';
}

export interface IngestionBatch {
  batchId: string;
  countryCode: string;
  reportingYear: number;
  sourceFileName: string;
  uploadTimestamp: string;
  totalRecords: number;
  flaggedRecords: number;
  status: 'PROCESSED' | 'REMEDIATION_REQUIRED' | 'FAILED';
}

export interface AuditLog {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  previousValues: string | null;
  newValues: string | null;
  userId: string;
  timestamp: string;
}

// Memory database loaded with cross-country compliant rows
let centralTransactions: UniversalTransaction[] = [
  // South Korea [KR] Rows (equivalent to K-Sunshine backend logs)
  {
    id: 'TX-KR-001',
    batchId: 'BATCH-001',
    countryCode: 'KR',
    reportingYear: 2026,
    recipientType: 'HCP',
    recipientName: 'Dr. Ji-Hoon Kim',
    licenseNumber: 'MD-82-99011',
    workplaceInstitution: 'Seoul National University Hospital',
    specialtyDepartment: 'Cardiology',
    spendCategory: 'PRESENTATION',
    dateOfProvision: '2026-03-12T00:00:00Z',
    placeOfProvision: 'Grand Hyatt Seoul',
    purposeOfBenefit: 'Product Briefing Presentation (Cardio-Block Beta)',
    details: 'Food & Beverage Provision',
    amountOriginal: 95000, // ₩95,000 KRW
    currencyOriginal: 'KRW',
    amountUSD: 72.50, // Normalized
    remediationStatus: 'APPROVED'
  },
  {
    id: 'TX-KR-002',
    batchId: 'BATCH-001',
    countryCode: 'KR',
    reportingYear: 2026,
    recipientType: 'HCP',
    recipientName: 'Dr. Seo-Yeon Park',
    licenseNumber: 'MD-82-44123',
    workplaceInstitution: 'Asan Medical Center',
    specialtyDepartment: 'Oncology',
    spendCategory: 'SAMPLES',
    dateOfProvision: '2026-04-05T00:00:00Z',
    placeOfProvision: 'Clinician Office',
    purposeOfBenefit: 'Sample Eval Units (Onco-Shield C)',
    details: 'Minimum evaluation pack',
    amountOriginal: 120000, // ₩120,000 KRW
    currencyOriginal: 'KRW',
    amountUSD: 91.60,
    remediationStatus: 'APPROVED'
  },
  {
    id: 'TX-KR-003',
    batchId: 'BATCH-001',
    countryCode: 'KR',
    reportingYear: 2026,
    recipientType: 'HCP',
    recipientName: 'Prof. Min-Jae Lee',
    licenseNumber: 'MD-82-55301',
    workplaceInstitution: 'Severance Hospital',
    specialtyDepartment: 'Endocrinology',
    spendCategory: 'CONSULTANCY',
    dateOfProvision: '2026-02-18T00:00:00Z',
    placeOfProvision: 'Medical Center Boardroom',
    purposeOfBenefit: 'Advisory Panel Board Session',
    details: 'Fair Market Value consultancy fee',
    amountOriginal: 850000, // ₩850,000 KRW
    currencyOriginal: 'KRW',
    amountUSD: 648.80,
    remediationStatus: 'PENDING_REVIEW' // Remediation Required!
  },

  // France [FR] Rows (French Sunshine Act - transparent value transfers)
  {
    id: 'TX-FR-001',
    batchId: 'BATCH-002',
    countryCode: 'FR',
    reportingYear: 2026,
    recipientType: 'HCP',
    recipientName: 'Dr. Lucas Bernard',
    licenseNumber: 'RPPS-100234591',
    workplaceInstitution: 'Hôpital Européen Georges-Pompidou',
    specialtyDepartment: 'Pulmonology',
    spendCategory: 'CONFERENCE_SUPPORT',
    dateOfProvision: '2026-05-10T00:00:00Z',
    placeOfProvision: 'Paris Congress Center',
    purposeOfBenefit: 'Academic Conference Registration (EFRO Seminars)',
    details: 'Direct registration sponsorship',
    amountOriginal: 450, // €450 EUR
    currencyOriginal: 'EUR',
    amountUSD: 489.10,
    remediationStatus: 'APPROVED'
  },
  {
    id: 'TX-FR-002',
    batchId: 'BATCH-002',
    countryCode: 'FR',
    reportingYear: 2026,
    recipientType: 'HCP',
    recipientName: 'Dr. Chloé Dubois',
    licenseNumber: 'RPPS-100876123',
    workplaceInstitution: 'CHU de Bordeaux',
    specialtyDepartment: 'Neurology',
    spendCategory: 'PRESENTATION',
    dateOfProvision: '2026-04-20T00:00:00Z',
    placeOfProvision: 'Le Saint-James Bordeaux',
    purposeOfBenefit: 'Hospitality - Scientific Dinner Briefing (Neuro-Vanguard)',
    details: 'Gastronomy provision - Exceeds safe-harbor limits',
    amountOriginal: 195, // €195 EUR
    currencyOriginal: 'EUR',
    amountUSD: 211.90,
    remediationStatus: 'PENDING_REVIEW' // Exceeds standard French hospitality bounds!
  },

  // United States [US] Rows (CMS Open Payments general spending)
  {
    id: 'TX-US-001',
    batchId: 'BATCH-003',
    countryCode: 'US',
    reportingYear: 2026,
    recipientType: 'HCP',
    recipientName: 'Dr. Emily Watson',
    licenseNumber: 'NPI-1490887163',
    workplaceInstitution: 'Massachusetts General Hospital',
    specialtyDepartment: 'Internal Medicine',
    spendCategory: 'CONSULTANCY',
    dateOfProvision: '2026-01-15T00:00:00Z',
    placeOfProvision: 'Clinical Offices',
    purposeOfBenefit: 'FMV Medical Writing Consultancy Engagement',
    details: 'Contract reference US-CON-8891',
    amountOriginal: 2500, // $2500 USD
    currencyOriginal: 'USD',
    amountUSD: 2500,
    remediationStatus: 'APPROVED'
  }
];

// Memory ingestion batch logs
let centralBatches: IngestionBatch[] = [
  {
    batchId: 'BATCH-001',
    countryCode: 'KR',
    reportingYear: 2026,
    sourceFileName: 'KR_Sunshine_Transactions_Q1.xlsx',
    uploadTimestamp: '2026-05-15T10:30:00Z',
    totalRecords: 3,
    flaggedRecords: 1,
    status: 'REMEDIATION_REQUIRED'
  },
  {
    batchId: 'BATCH-002',
    countryCode: 'FR',
    reportingYear: 2026,
    sourceFileName: 'FR_Transparency_Ledger_May2026.csv',
    uploadTimestamp: '2026-05-20T14:15:00Z',
    totalRecords: 2,
    flaggedRecords: 1,
    status: 'REMEDIATION_REQUIRED'
  },
  {
    batchId: 'BATCH-003',
    countryCode: 'US',
    reportingYear: 2026,
    sourceFileName: 'US_OpenPayments_Ingestion_General.xlsx',
    uploadTimestamp: '2026-05-22T09:00:00Z',
    totalRecords: 1,
    flaggedRecords: 0,
    status: 'PROCESSED'
  }
];

// Memory audit log queue
let centralAuditLogs: AuditLog[] = [
  {
    id: 'AUD-001',
    entityName: 'UniversalSpendTransaction',
    entityId: 'TX-KR-003',
    action: 'CREATE',
    previousValues: null,
    newValues: JSON.stringify({
      id: 'TX-KR-003',
      countryCode: 'KR',
      recipientName: 'Prof. Min-Jae Lee',
      amountOriginal: 850000,
      remediationStatus: 'PENDING_REVIEW'
    }),
    userId: 'SYSTEM',
    timestamp: '2026-05-15T10:35:00Z'
  },
  {
    id: 'AUD-002',
    entityName: 'IngestionBatch',
    entityId: 'BATCH-001',
    action: 'CREATE',
    previousValues: null,
    newValues: JSON.stringify({
      batchId: 'BATCH-001',
      countryCode: 'KR',
      sourceFileName: 'KR_Sunshine_Transactions_Q1.xlsx',
      totalRecords: 3
    }),
    userId: 'ADMIN',
    timestamp: '2026-05-15T10:30:00Z'
  }
];

export const APIGateway = {
  // Fetch transactions with multi-country filters
  getTransactions: (countryFilter?: string): UniversalTransaction[] => {
    if (countryFilter && countryFilter !== 'GLOBAL') {
      return centralTransactions.filter(t => t.countryCode === countryFilter);
    }
    return centralTransactions;
  },

  // Fetch ingestion batches
  getBatches: (): IngestionBatch[] => {
    return centralBatches;
  },

  // Fetch secure audit logs
  getAuditLogs: (): AuditLog[] => {
    return centralAuditLogs;
  },

  // Add manually processed updates
  updateTransactionStatus: (txId: string, status: 'APPROVED' | 'RESOLVED' | 'REJECTED'): boolean => {
    const tx = centralTransactions.find(t => t.id === txId);
    if (tx) {
      const prev = JSON.stringify({ ...tx });
      tx.remediationStatus = status;
      const next = JSON.stringify({ ...tx });
      
      // Log audit
      centralAuditLogs = [
        {
          id: `AUD-${Date.now()}`,
          entityName: 'UniversalSpendTransaction',
          entityId: txId,
          action: 'UPDATE',
          previousValues: prev,
          newValues: next,
          userId: 'ADMIN',
          timestamp: new Date().toISOString()
        },
        ...centralAuditLogs
      ];
      
      // Update associated batch flagged records count if resolved
      const batch = centralBatches.find(b => b.batchId === tx.batchId);
      if (batch && batch.flaggedRecords > 0) {
        batch.flaggedRecords -= 1;
        if (batch.flaggedRecords === 0) {
          batch.status = 'PROCESSED';
        }
      }
      return true;
    }
    return false;
  },

  // Update a transaction completely (used by Explorer inline editor)
  updateTransaction: (txId: string, updated: Partial<UniversalTransaction>): boolean => {
    const tx = centralTransactions.find(t => t.id === txId);
    if (tx) {
      const prev = JSON.stringify({ ...tx });
      Object.assign(tx, updated);
      const next = JSON.stringify({ ...tx });

      // Log audit
      centralAuditLogs = [
        {
          id: `AUD-${Date.now()}`,
          entityName: 'UniversalSpendTransaction',
          entityId: txId,
          action: 'UPDATE',
          previousValues: prev,
          newValues: next,
          userId: 'ADMIN',
          timestamp: new Date().toISOString()
        },
        ...centralAuditLogs
      ];
      return true;
    }
    return false;
  },

  // Handle centralized ingestion uploads across different countries
  ingestData: (country: string, year: number, sourceFile: string, records: any[]): { success: boolean; ingested: number; flagged: number } => {
    const batchId = `BATCH-00${centralBatches.length + 1}`;
    let flaggedCount = 0;

    const newTransactions: UniversalTransaction[] = records.map((row, idx) => {
      const isFlagged = row.amountOriginal > 500000 || row.amountEUR > 150 || row.amountUSD > 500 || row.amountKRW > 500000;
      if (isFlagged) flaggedCount++;

      // Compute standard exchange rates for USD normalized dashboards
      let amountUSD = Number(row.amountKRW || row.amountOriginal || row.amountEUR || row.amountUSD || 0);
      if (country === 'KR') amountUSD = amountUSD / 1300; // Mock rate
      if (country === 'FR') amountUSD = amountUSD * 1.09; // Mock rate

      return {
        id: `TX-${country}-${batchId.split('-')[1]}-${idx + 1}`,
        batchId: batchId,
        countryCode: country,
        reportingYear: year,
        recipientType: row.recipientType || 'HCP',
        recipientName: row.recipientName || 'Unknown HCP',
        licenseNumber: row.licenseNumber || '',
        workplaceInstitution: row.workplaceInstitution || '',
        specialtyDepartment: row.specialtyDepartment || '',
        spendCategory: row.spendCategory || row.categoryOfBenefit || 'PRESENTATION',
        dateOfProvision: row.dateOfProvision || new Date().toISOString(),
        placeOfProvision: row.placeOfProvision || '',
        purposeOfBenefit: row.purposeOfBenefit || '',
        details: row.details || '',
        amountOriginal: Number(row.amountKRW || row.amountOriginal || row.amountEUR || row.amountUSD || 0),
        currencyOriginal: country === 'KR' ? 'KRW' : (country === 'FR' ? 'EUR' : 'USD'),
        amountUSD: parseFloat(amountUSD.toFixed(2)),
        remediationStatus: isFlagged ? 'PENDING_REVIEW' : 'APPROVED'
      };
    });

    centralTransactions = [...newTransactions, ...centralTransactions];

    const newBatch: IngestionBatch = {
      batchId,
      countryCode: country,
      reportingYear: year,
      sourceFileName: sourceFile,
      uploadTimestamp: new Date().toISOString(),
      totalRecords: records.length,
      flaggedRecords: flaggedCount,
      status: flaggedCount > 0 ? 'REMEDIATION_REQUIRED' : 'PROCESSED'
    };

    centralBatches = [newBatch, ...centralBatches];

    // Log batch audit
    centralAuditLogs = [
      {
        id: `AUD-${Date.now()}`,
        entityName: 'IngestionBatch',
        entityId: batchId,
        action: 'CREATE',
        previousValues: null,
        newValues: JSON.stringify(newBatch),
        userId: 'ADMIN',
        timestamp: new Date().toISOString()
      },
      ...centralAuditLogs
    ];

    return {
      success: true,
      ingested: records.length,
      flagged: flaggedCount
    };
  }
};
