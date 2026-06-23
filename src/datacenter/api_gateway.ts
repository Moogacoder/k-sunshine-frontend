// Qordata Intelligent Transparency Data Center
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
  workflowStatus?: string;
  originalTransactions?: UniversalTransaction[];
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

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const BACKEND_URL = isLocal 
  ? "http://localhost:8080" 
  : "https://k-sunshine-backend-381662135057.us-central1.run.app";

export const APIGateway = {
  // Fetch transactions with country database routing
  getTransactions: async (countryFilter?: string): Promise<UniversalTransaction[]> => {
    try {
      let url = `${BACKEND_URL}/api/staging/transactions`;
      let isClientSideFilter = false;
      if (countryFilter && countryFilter !== 'GLOBAL') {
        const lowerCountry = countryFilter.toLowerCase();
        if (lowerCountry === 'jp') {
          isClientSideFilter = true;
          url = `${BACKEND_URL}/api/transactions/committed`;
        } else {
          let path = lowerCountry;
          if (lowerCountry === 'kr') path = 'korea';
          if (lowerCountry === 'it') path = 'italy';
          if (lowerCountry === 'fr') path = 'france';
          if (lowerCountry === 'us') path = 'usa';
          if (lowerCountry === 'co') path = 'colombia';
          
          url = `${BACKEND_URL}/api/transactions/${path}`;
        }
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Database fetch error");
      const data = await res.json();
      if (isClientSideFilter) {
        return data.filter((t: any) => t.countryCode === 'JP');
      }
      return data;
    } catch (err) {
      console.error("API Gateway error reading transactions:", err);
      return [];
    }
  },

  // Fetch committed production transactions across all country registries
  getCommittedTransactions: async (): Promise<UniversalTransaction[]> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/transactions/committed`);
      if (!res.ok) throw new Error("Database fetch error");
      return await res.json();
    } catch (err) {
      console.error("API Gateway error reading committed transactions:", err);
      return [];
    }
  },

  // Fetch batches from real database
  getBatches: async (): Promise<IngestionBatch[]> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/batches`);
      if (!res.ok) throw new Error("Database fetch error");
      const data = await res.json();
      // Map originalTransactions snapshot back onto schema structure
      return data.map((b: any) => ({
        ...b,
        originalTransactions: b.originalTransactions ? JSON.parse(b.originalTransactions) : []
      }));
    } catch (err) {
      console.error("API Gateway error reading batches:", err);
      return [];
    }
  },

  // Fetch secure audit logs from database
  getAuditLogs: async (): Promise<AuditLog[]> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/audit-logs`);
      if (!res.ok) throw new Error("Database fetch error");
      return await res.json();
    } catch (err) {
      console.error("API Gateway error reading audit logs:", err);
      return [];
    }
  },

  // Update a transaction completely in staging (Explorer inline editor)
  updateTransaction: async (txId: string, updated: Partial<UniversalTransaction>): Promise<boolean> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/staging/transactions/${txId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      return res.ok;
    } catch (err) {
      console.error("API Gateway error saving transaction edit:", err);
      return false;
    }
  },

  // Update transaction status (Remediation)
  updateTransactionStatus: async (txId: string, status: 'APPROVED' | 'RESOLVED' | 'REJECTED'): Promise<boolean> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/staging/transactions/${txId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remediationStatus: status })
      });
      return res.ok;
    } catch (err) {
      console.error("API Gateway error updating transaction status:", err);
      return false;
    }
  },

  // Handle centralized ingestion uploads across different countries (Staging)
  ingestData: async (country: string, year: number, sourceFile: string, records: any[]): Promise<{ success: boolean; ingested: number; flagged: number }> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, year, sourceFile, records })
      });
      if (!res.ok) throw new Error("Ingestion error");
      return await res.json();
    } catch (err) {
      console.error("API Gateway error during ingestion:", err);
      return { success: false, ingested: 0, flagged: 0 };
    }
  },

  // ETL Router Commit (Approve and Sync Staging buffer to separate country tables)
  commitStaging: async (batchId?: string): Promise<{ success: boolean; message?: string; routed?: Record<string, number> }> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/staging/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId })
      });
      if (!res.ok) throw new Error("ETL commit failed");
      return await res.json();
    } catch (err) {
      console.error("API Gateway error executing ETL staging commit:", err);
      return { success: false };
    }
  },

  // Emergency Database Purge
  purgeDatabases: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/purge`, {
        method: 'POST'
      });
      return res.ok;
    } catch (err) {
      console.error("API Gateway error executing administrative database purge:", err);
      return false;
    }
  },

  // AI chat assistant query
  sendChatQuery: async (message: string, path?: string): Promise<string> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, path })
      });
      if (!res.ok) throw new Error("AI agent error");
      const data = await res.json();
      return data.reply;
    } catch (err) {
      console.error("API Gateway error contacting AI agent:", err);
      return "I am currently offline due to a connection drop with the SQL Database service. Please try again shortly.";
    }
  },
  
  // AI Smart Column Mapping query
  mapColumns: async (headers: string[]): Promise<Record<string, string>> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/agent/map-columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers })
      });
      if (!res.ok) throw new Error("AI column mapping error");
      return await res.json();
    } catch (err) {
      console.error("API Gateway error fetching column mapping:", err);
      return {};
    }
  },

  // AI Violation Explainer and Autoresolve suggest query
  explainViolation: async (transaction: any): Promise<{ explanation: string; suggestedFix: any }> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/agent/explain-violation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction })
      });
      if (!res.ok) throw new Error("AI violation explainer error");
      return await res.json();
    } catch (err) {
      console.error("API Gateway error explaining violation:", err);
      return { explanation: "Failed to analyze this transaction using compliance AI.", suggestedFix: {} };
    }
  },

  // AI Audit Summary Brief query
  getAuditSummary: async (): Promise<string> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/agent/audit-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error("AI audit summary error");
      const data = await res.json();
      return data.summary;
    } catch (err) {
      console.error("API Gateway error fetching audit summary:", err);
      return "Failed to compile the intelligent Audit Trail executive briefing.";
    }
  },

  // AI Compliance Draft Statement query
  getComplianceStatement: async (countryCode: string, year: number): Promise<string> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/agent/compliance-statement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode, year })
      });
      if (!res.ok) throw new Error("AI compliance statement error");
      const data = await res.json();
      return data.statement;
    } catch (err) {
      console.error("API Gateway error fetching compliance statement:", err);
      return "Failed to draft the intelligent Compliance Cover Statement.";
    }
  },
  
  // Update batch workflow status inside the database
  updateBatchWorkflowStatus: async (batchId: string, newStatus: string): Promise<boolean> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/batches/${batchId}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowStatus: newStatus })
      });
      return res.ok;
    } catch (err) {
      console.error("API Gateway error updating batch workflow status:", err);
      return false;
    }
  }
};
