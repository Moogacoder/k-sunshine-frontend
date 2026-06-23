// Shared Statutory Compliance Validation Engine
// Qordata Intelligent Transparency

export interface DataCompletenessResult {
  isComplete: boolean;
  missingFields: string[];
}

/**
 * Sanitizes and parses raw spreadsheet currency/numeric strings.
 * Supports European (1.234,56), Korean (₩500,000), US ($1,234.56), and space-formatted entries.
 */
export const parseAmount = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = String(val).trim();
  // Strip currency symbols, spaces, and alphabet letters (like EUR, KRW, USD, values)
  str = str.replace(/[€₩$£¥\sA-Za-z]/g, '');
  if (!str) return 0;

  const hasComma = str.includes(',');
  const hasPeriod = str.includes('.');

  if (hasComma && hasPeriod) {
    // Both separators, e.g. "1.234,56" or "1,234.56"
    // The decimal separator is the one that appears last
    if (str.indexOf(',') > str.indexOf('.')) {
      // European format: 1.234,56 -> remove period, replace comma with dot
      str = str.replace(/\./g, '').replace(/,/g, '.');
    } else {
      // US format: 1,234.56 -> remove commas
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Only comma: e.g. "123,45" or "1,234"
    const parts = str.split(',');
    if (parts[1] && parts[1].length === 3) {
      // Thousands separator, e.g. "1,000"
      str = str.replace(/,/g, '');
    } else {
      // Decimal separator, e.g. "123,45" -> "123.45"
      str = str.replace(/,/g, '.');
    }
  } else if (hasPeriod) {
    // Only period: e.g. "123.45" or "1.234"
    // For EUR or KRW, a period can be used as thousands separator (e.g. "1.000" or "50.000")
    // If it has exactly 3 digits after the period and has length >= 5, treat as thousands separator
    const parts = str.split('.');
    if (parts[1] && parts[1].length === 3 && parts[0].length <= 3) {
      str = str.replace(/\./g, '');
    }
  }

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Validates whether the given transaction record has all required fields for statutory reporting
 * in the relevant target jurisdiction.
 */
export const validateReportingCompleteness = (
  countryCode: string,
  record: {
    recipientType?: string;
    recipientName?: string;
    licenseNumber?: string;
    workplaceInstitution?: string;
    specialtyDepartment?: string;
    spendCategory?: string;
    dateOfProvision?: string | Date;
    placeOfProvision?: string;
    purposeOfBenefit?: string;
    amountOriginal?: number;
    details?: string;
  }
): DataCompletenessResult => {
  const missingFields: string[] = [];

  const recipientName = (record.recipientName || '').trim();
  const licenseNumber = (record.licenseNumber || '').trim();
  const workplace = (record.workplaceInstitution || '').trim();
  const category = (record.spendCategory || '').trim();
  const purpose = (record.purposeOfBenefit || '').trim();
  const date = record.dateOfProvision;
  const amount = record.amountOriginal || 0;

  // Core fields required for all countries
  if (!recipientName) missingFields.push('Recipient Name');
  if (!category) missingFields.push('Spend Category');
  if (!date) missingFields.push('Provision Date');
  if (amount <= 0) missingFields.push('Transaction Amount');

  if (countryCode === 'KR') {
    // South Korea Sunshine Act specifics
    if (!licenseNumber) missingFields.push('Recipient License Number');
    if (record.recipientType === 'HCP' && !workplace) {
      missingFields.push('Affiliated Institution/Workplace');
    }
  } else if (countryCode === 'IT') {
    // Italy Loi Sanità Trasparente specifics
    if (!licenseNumber) {
      missingFields.push('Codice Fiscale / Partita IVA');
    } else {
      // Validate Codice Fiscale length or PI prefix
      const cleanedLicense = licenseNumber.replace(/[^A-Z0-9]/gi, '');
      const isPI = cleanedLicense.startsWith('PI') || /^[0-9]+$/.test(cleanedLicense);
      if (!isPI && cleanedLicense.length !== 16) {
        missingFields.push('Valid 16-character Codice Fiscale or Partita IVA');
      }
    }
    // Must be either CONVENZIONI or DONAZIONI for Modello A/B
    if (category !== 'CONVENZIONI' && category !== 'DONAZIONI') {
      missingFields.push('Category must be CONVENZIONI or DONAZIONI');
    }
    if (!purpose) missingFields.push('Agreement/Donation Purpose');
    if (!record.placeOfProvision || !record.placeOfProvision.trim()) {
      missingFields.push('Place of Provision (City)');
    }
    // Model B requires equipment details
    if (category === 'DONAZIONI' && (!record.details || !record.details.trim())) {
      missingFields.push('Donation Equipment/Project Details');
    }
  } else if (countryCode === 'FR') {
    // France Loi Bertrand
    if (!licenseNumber) missingFields.push('RPPS Identifier');
  } else if (countryCode === 'US') {
    // USA CMS Open Payments
    if (!licenseNumber) missingFields.push('NPI Identifier');
  } else if (countryCode === 'CO') {
    // Colombia Resolution 2881 (RTVSS) specifics
    if (!licenseNumber) {
      missingFields.push('Número de Identificación (NIT / CC)');
    }
    // Must be HONORARIOS, REUNIONES, VIAJES, or DONACIONES
    if (category !== 'HONORARIOS' && category !== 'REUNIONES' && category !== 'VIAJES' && category !== 'DONACIONES') {
      missingFields.push('Category must be HONORARIOS, REUNIONES, VIAJES or DONACIONES');
    }
    if (!purpose) {
      missingFields.push('Purpose of Value Transfer (Resolución 2881)');
    }
  } else if (countryCode === 'EU') {
    // Europe EFPIA Disclosure Code specifics
    if (!licenseNumber) {
      missingFields.push('Professional Registration Number / Tax ID');
    }
    // Must be DONATIONS_AND_GRANTS, EVENT_CONTRIBUTION, FEES_FOR_SERVICE, or RESEARCH_AND_DEVELOPMENT
    if (
      category !== 'DONATIONS_AND_GRANTS' &&
      category !== 'EVENT_CONTRIBUTION' &&
      category !== 'FEES_FOR_SERVICE' &&
      category !== 'RESEARCH_AND_DEVELOPMENT'
    ) {
      missingFields.push('Category must be DONATIONS_AND_GRANTS, EVENT_CONTRIBUTION, FEES_FOR_SERVICE or RESEARCH_AND_DEVELOPMENT');
    }
    if (!purpose) {
      missingFields.push('Purpose of Value Transfer (EFPIA Code)');
    }
  } else if (countryCode === 'JP') {
    // Japan JPMA Guidelines & Fair Competition Code specifics
    if (!licenseNumber) {
      missingFields.push('Physician/Institution Registration Code');
    }
    // Must be RESEARCH_DEV, ACADEMIC_DONATION, LECTURE_FEES, PROMOTIONAL_INFO, or OTHER_MEALS
    if (
      category !== 'RESEARCH_DEV' &&
      category !== 'ACADEMIC_DONATION' &&
      category !== 'LECTURE_FEES' &&
      category !== 'PROMOTIONAL_INFO' &&
      category !== 'OTHER_MEALS'
    ) {
      missingFields.push('Category must be RESEARCH_DEV, ACADEMIC_DONATION, LECTURE_FEES, PROMOTIONAL_INFO or OTHER_MEALS');
    }
    if (!purpose) {
      missingFields.push('Purpose of Value Transfer (JPMA Guidelines)');
    }
    if (!record.placeOfProvision || !record.placeOfProvision.trim()) {
      missingFields.push('Place of Provision (City)');
    }
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields
  };
};
