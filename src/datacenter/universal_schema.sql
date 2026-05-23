-- Qordata Global Pharma Transparency Data Center
-- Universal Data Model Schema (SQL Server / PostgreSQL compliant)

-- 1. Ingestion Batches Ledger
CREATE TABLE IngestionBatch (
    batchId VARCHAR(50) PRIMARY KEY,
    countryCode VARCHAR(5) NOT NULL, -- e.g. 'KR', 'FR', 'US'
    reportingYear INT NOT NULL,
    sourceFileName VARCHAR(255) NOT NULL,
    uploadTimestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    totalRecords INT DEFAULT 0,
    flaggedRecords INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PROCESSED' -- 'PROCESSED', 'REMEDIATION_REQUIRED', 'FAILED'
);

-- 2. Standardized spend transactions across all country jurisdictions
CREATE TABLE UniversalSpendTransaction (
    transactionId VARCHAR(50) PRIMARY KEY,
    batchId VARCHAR(50) REFERENCES IngestionBatch(batchId),
    countryCode VARCHAR(5) NOT NULL, -- 'KR', 'FR', 'US'
    reportingYear INT NOT NULL,
    
    -- Recipient Entity Information
    recipientType VARCHAR(20) NOT NULL, -- 'HCP', 'THO', 'INSTITUTION'
    recipientName VARCHAR(255) NOT NULL,
    licenseNumber VARCHAR(50),
    workplaceInstitution VARCHAR(255),
    specialtyDepartment VARCHAR(100),
    
    -- Spend & Value Transfer Attributes
    spendCategory VARCHAR(100) NOT NULL, -- 'SAMPLES', 'CONFERENCE_SUPPORT', 'CLINICAL_TRIAL', 'PRESENTATION', 'DISCOUNT', 'PMS', 'CONSULTANCY'
    dateOfProvision DATE NOT NULL,
    placeOfProvision VARCHAR(255),
    purposeOfBenefit VARCHAR(255),
    details TEXT,
    
    -- Financial aggregates in original & normalized base USD
    amountOriginal DECIMAL(18, 2) NOT NULL,
    currencyOriginal VARCHAR(5) DEFAULT 'KRW', -- 'KRW', 'EUR', 'USD'
    amountUSD DECIMAL(18, 2) NOT NULL, -- Standardized conversion for global aggregated dashboards
    
    -- Compliance state
    remediationStatus VARCHAR(20) DEFAULT 'APPROVED' -- 'APPROVED', 'PENDING_REVIEW', 'RESOLVED', 'REJECTED'
);

-- 3. Centralized auditing compliance flags
CREATE TABLE RemediationAlert (
    alertId VARCHAR(50) PRIMARY KEY,
    transactionId VARCHAR(50) REFERENCES UniversalSpendTransaction(transactionId),
    flagReason TEXT NOT NULL,
    severity VARCHAR(10) DEFAULT 'WARNING', -- 'CRITICAL', 'WARNING'
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'RESOLVED', 'REJECTED'
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolvedAt TIMESTAMP,
    comments TEXT
);

-- Indexes for performance
CREATE INDEX idx_spend_country_year ON UniversalSpendTransaction(countryCode, reportingYear);
CREATE INDEX idx_spend_recipient ON UniversalSpendTransaction(recipientName);
CREATE INDEX idx_spend_category ON UniversalSpendTransaction(spendCategory);
