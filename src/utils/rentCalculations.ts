import type { Tenant, Payment } from '../models';

/**
 * Fiscal Year Data Structures
 */
export interface MonthData {
  month: number; // 0-11 (JavaScript month index)
  year: number;
  label: string; // e.g., "Dez 2024"
  soll: number;
  ist: number;
  differenz: number;
}

export interface QuarterData {
  quarter: number; // 1-4 (fiscal quarters)
  label: string; // e.g., "Q1 (Dez-Feb)"
  months: MonthData[];
  soll: number;
  ist: number;
  differenz: number;
}

export interface FiscalYearData {
  fiscalYear: string; // e.g., "2024/2025"
  startDate: Date; // December 1st
  endDate: Date; // November 30th
  quarters: QuarterData[];
  soll: number;
  ist: number;
  differenz: number;
}

/**
 * Get the current fiscal year period (December - November)
 * If today is in December, fiscal year is current/next
 * Otherwise, fiscal year is previous/current
 */
export const getCurrentFiscalYearPeriod = (): { start: Date; end: Date; label: string } => {
  const today = new Date();
  const currentMonth = today.getMonth(); // 0-11
  const currentYear = today.getFullYear();

  let fiscalStartYear: number;

  // If we're in December (month 11), fiscal year just started
  if (currentMonth === 11) {
    fiscalStartYear = currentYear;
  } else {
    // Otherwise, fiscal year started last December
    fiscalStartYear = currentYear - 1;
  }

  const fiscalEndYear = fiscalStartYear + 1;

  const start = new Date(fiscalStartYear, 11, 1); // December 1st
  const end = new Date(fiscalEndYear, 10, 30); // November 30th
  const label = `${fiscalStartYear}/${fiscalEndYear}`;

  return { start, end, label };
};

/**
 * Get fiscal quarter for a given month (0-11)
 * Q1 = Dec, Jan, Feb (11, 0, 1)
 * Q2 = Mar, Apr, May (2, 3, 4)
 * Q3 = Jun, Jul, Aug (5, 6, 7)
 * Q4 = Sep, Oct, Nov (8, 9, 10)
 */
export const getFiscalQuarter = (month: number): number => {
  if (month === 11 || month === 0 || month === 1) return 1; // Dec, Jan, Feb
  if (month >= 2 && month <= 4) return 2; // Mar, Apr, May
  if (month >= 5 && month <= 7) return 3; // Jun, Jul, Aug
  return 4; // Sep, Oct, Nov
};

/**
 * Get quarter label
 */
export const getQuarterLabel = (quarter: number): string => {
  const labels = {
    1: 'Q1 (Dez-Feb)',
    2: 'Q2 (Mär-Mai)',
    3: 'Q3 (Jun-Aug)',
    4: 'Q4 (Sep-Nov)',
  };
  return labels[quarter as keyof typeof labels] || `Q${quarter}`;
};

/**
 * Get month label (German abbreviated month name + year)
 */
export const getMonthLabel = (month: number, year: number): string => {
  const monthNames = [
    'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
    'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
  ];
  return `${monthNames[month]} ${year}`;
};

/**
 * Calculate SOLL for a specific month
 * Returns 0 if before move-in date or after termination date
 * Returns pro-rated amount if move-in month or termination month
 * Returns full monthly rate otherwise
 */
export const calculateMonthSoll = (
  tenant: Tenant,
  month: number,
  year: number
): number => {
  const moveInDate = new Date(tenant.move_in_date);
  moveInDate.setHours(0, 0, 0, 0);

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0); // Last day of month

  const monthlyRate = tenant.annual_rent / 12;

  // If this month is entirely before move-in, SOLL = 0
  if (monthEnd < moveInDate) {
    return 0;
  }

  // If tenant has terminated and this month is entirely after termination, SOLL = 0
  if (tenant.termination_date) {
    const terminationDate = new Date(tenant.termination_date);
    terminationDate.setHours(0, 0, 0, 0);

    if (monthStart > terminationDate) {
      return 0;
    }

    // If termination is within this month, pro-rate
    if (monthStart <= terminationDate && terminationDate <= monthEnd) {
      const daysInMonth = monthEnd.getDate();

      // If both move-in and termination are in the same month
      if (moveInDate.getMonth() === month && moveInDate.getFullYear() === year) {
        const daysActive = terminationDate.getDate() - moveInDate.getDate() + 1;
        return (monthlyRate / daysInMonth) * daysActive;
      }

      // Just termination in this month
      const daysUntilTermination = terminationDate.getDate();
      return (monthlyRate / daysInMonth) * daysUntilTermination;
    }
  }

  // If this is move-in month (and no termination in same month)
  if (monthStart < moveInDate && moveInDate <= monthEnd) {
    const daysInMonth = monthEnd.getDate();
    const moveInDay = moveInDate.getDate();
    const daysFromMoveIn = daysInMonth - moveInDay + 1;
    return (monthlyRate / daysInMonth) * daysFromMoveIn;
  }

  // Full month (after move-in, before/no termination)
  return monthlyRate;
};

/**
 * Calculate IST (total payments) for a specific month
 */
export const calculateMonthIst = (
  payments: Payment[],
  month: number,
  year: number
): number => {
  const total = payments
    .filter(payment => {
      const paymentDate = new Date(payment.datum);
      return (
        paymentDate.getMonth() === month &&
        paymentDate.getFullYear() === year
      );
    })
    .reduce((sum, payment) => sum + payment.betrag, 0);

  return total;
};

/**
 * Get the fiscal year that contains a specific date
 */
export const getFiscalYearForDate = (date: Date): { start: Date; end: Date; label: string } => {
  const year = date.getFullYear();
  const month = date.getMonth();

  let fiscalStartYear: number;

  // If we're in December or later in the fiscal year (Jan-Nov of next calendar year)
  if (month === 11) {
    fiscalStartYear = year;
  } else {
    // Jan-Nov: fiscal year started last December
    fiscalStartYear = year - 1;
  }

  const fiscalEndYear = fiscalStartYear + 1;

  const start = new Date(fiscalStartYear, 11, 1); // December 1st
  const end = new Date(fiscalEndYear, 10, 30); // November 30th
  const label = `${fiscalStartYear}/${fiscalEndYear}`;

  return { start, end, label };
};

/**
 * Calculate fiscal year data for a tenant for a specific fiscal year period
 * Returns hierarchical structure: Year -> Quarters -> Months
 */
export const calculateSingleFiscalYearData = (
  tenant: Tenant,
  payments: Payment[],
  fiscalYearStart: Date,
  fiscalYearEnd: Date,
  fiscalYearLabel: string
): FiscalYearData => {
  const start = fiscalYearStart;
  const end = fiscalYearEnd;
  const label = fiscalYearLabel;

  // Initialize quarters
  const quarters: QuarterData[] = [
    { quarter: 1, label: getQuarterLabel(1), months: [], soll: 0, ist: 0, differenz: 0 },
    { quarter: 2, label: getQuarterLabel(2), months: [], soll: 0, ist: 0, differenz: 0 },
    { quarter: 3, label: getQuarterLabel(3), months: [], soll: 0, ist: 0, differenz: 0 },
    { quarter: 4, label: getQuarterLabel(4), months: [], soll: 0, ist: 0, differenz: 0 },
  ];

  // Iterate through all 12 months of the fiscal year
  let currentDate = new Date(start);

  while (currentDate <= end) {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    // Calculate SOLL and IST for this month
    const soll = calculateMonthSoll(tenant, month, year);
    const ist = calculateMonthIst(payments, month, year);
    const differenz = soll - ist;

    // Create month data
    const monthData: MonthData = {
      month,
      year,
      label: getMonthLabel(month, year),
      soll: Math.round(soll * 100) / 100,
      ist: Math.round(ist * 100) / 100,
      differenz: Math.round(differenz * 100) / 100,
    };

    // Add to appropriate quarter
    const quarterIndex = getFiscalQuarter(month) - 1;
    quarters[quarterIndex].months.push(monthData);

    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
    currentDate.setDate(1);
  }

  // Calculate quarter totals
  quarters.forEach(quarter => {
    quarter.soll = Math.round(
      quarter.months.reduce((sum, m) => sum + m.soll, 0) * 100
    ) / 100;
    quarter.ist = Math.round(
      quarter.months.reduce((sum, m) => sum + m.ist, 0) * 100
    ) / 100;
    quarter.differenz = Math.round((quarter.soll - quarter.ist) * 100) / 100;
  });

  // Calculate year totals
  const yearSoll = Math.round(
    quarters.reduce((sum, q) => sum + q.soll, 0) * 100
  ) / 100;
  const yearIst = Math.round(
    quarters.reduce((sum, q) => sum + q.ist, 0) * 100
  ) / 100;
  const yearDifferenz = Math.round((yearSoll - yearIst) * 100) / 100;

  return {
    fiscalYear: label,
    startDate: start,
    endDate: end,
    quarters,
    soll: yearSoll,
    ist: yearIst,
    differenz: yearDifferenz,
  };
};

/**
 * Calculate ALL fiscal years from lease start to current quarter
 * Returns array of FiscalYearData, one for each fiscal year since move-in
 * Filters out future quarters - only shows up to and including current quarter
 */
export const calculateAllFiscalYearsData = (
  tenant: Tenant,
  payments: Payment[]
): FiscalYearData[] => {
  const moveInDate = new Date(tenant.move_in_date);
  moveInDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get the fiscal year that contains the move-in date
  const firstFiscalYear = getFiscalYearForDate(moveInDate);

  // Get the current fiscal year
  const currentFiscalYear = getFiscalYearForDate(today);

  const fiscalYears: FiscalYearData[] = [];

  // Iterate through each fiscal year from first to current
  let currentFYStart = new Date(firstFiscalYear.start);

  while (currentFYStart <= currentFiscalYear.start) {
    const fyYear = currentFYStart.getFullYear();
    const fyStart = new Date(fyYear, 11, 1); // December 1st
    const fyEnd = new Date(fyYear + 1, 10, 30); // November 30th
    const fyLabel = `${fyYear}/${fyYear + 1}`;

    // Calculate this fiscal year's data
    const fyData = calculateSingleFiscalYearData(tenant, payments, fyStart, fyEnd, fyLabel);

    // Filter out quarters that are entirely in the future
    const currentQuarter = getFiscalQuarter(today.getMonth());
    const isCurrentFY = fyStart.getTime() === currentFiscalYear.start.getTime();

    if (isCurrentFY) {
      // For current fiscal year, only keep quarters up to and including current quarter
      fyData.quarters = fyData.quarters.filter(q => q.quarter <= currentQuarter);

      // Recalculate year totals based on filtered quarters
      fyData.soll = Math.round(
        fyData.quarters.reduce((sum, q) => sum + q.soll, 0) * 100
      ) / 100;
      fyData.ist = Math.round(
        fyData.quarters.reduce((sum, q) => sum + q.ist, 0) * 100
      ) / 100;
      fyData.differenz = Math.round((fyData.soll - fyData.ist) * 100) / 100;
    }

    // Filter out quarters that are:
    // 1. Entirely before move-in date (soll=0 and ist=0 and before move-in)
    // 2. Entirely in the future (already handled above for current FY)
    // Keep quarters that have any activity (soll > 0 or ist > 0)
    const moveInDate = new Date(tenant.move_in_date);
    moveInDate.setHours(0, 0, 0, 0);

    fyData.quarters = fyData.quarters.filter(q => {
      // Keep if there's any expected rent or payments
      if (q.soll > 0 || q.ist > 0) return true;

      // For quarters with no activity, check if it's after move-in
      // Get the last month of this quarter to check if quarter ended after move-in
      const quarterEndMonth = q.months.length > 0
        ? q.months[q.months.length - 1]
        : null;

      if (!quarterEndMonth) return false;

      const quarterEndDate = new Date(quarterEndMonth.year, quarterEndMonth.month + 1, 0);
      quarterEndDate.setHours(0, 0, 0, 0);

      // Only keep quarters that ended on or after move-in date
      return quarterEndDate >= moveInDate;
    });

    // Only add fiscal year if it has at least one quarter with data
    if (fyData.quarters.length > 0) {
      fiscalYears.push(fyData);
    }

    // Move to next fiscal year (next December)
    currentFYStart = new Date(fyStart);
    currentFYStart.setFullYear(currentFYStart.getFullYear() + 1);
  }

  return fiscalYears;
};

/**
 * Backward compatibility: calculateFiscalYearData now returns all fiscal years
 * (Previously returned only current fiscal year)
 */
export const calculateFiscalYearData = calculateAllFiscalYearsData;

/**
 * Get the date range for a specific lease year and quarter
 * Lease year is labeled by the calendar year containing Jan-Nov
 * December belongs to the preceding calendar month of that label
 * Example: Lease Year 2026, Q1 = Dec 2025, Jan 2026, Feb 2026
 */
export const getQuarterDateRange = (
  leaseYear: number,
  quarter: number
): { start: Date; end: Date } => {
  // Lease year 2026 runs from Dec 2025 to Nov 2026
  const decemberYear = leaseYear - 1;

  let startMonth: number;
  let endMonth: number;
  let startYear: number;
  let endYear: number;

  switch (quarter) {
    case 1: // Dec, Jan, Feb
      startMonth = 11; // December
      startYear = decemberYear;
      endMonth = 1; // February
      endYear = leaseYear;
      break;
    case 2: // Mar, Apr, May
      startMonth = 2; // March
      startYear = leaseYear;
      endMonth = 4; // May
      endYear = leaseYear;
      break;
    case 3: // Jun, Jul, Aug
      startMonth = 5; // June
      startYear = leaseYear;
      endMonth = 7; // August
      endYear = leaseYear;
      break;
    case 4: // Sep, Oct, Nov
      startMonth = 8; // September
      startYear = leaseYear;
      endMonth = 10; // November
      endYear = leaseYear;
      break;
    default:
      throw new Error(`Invalid quarter: ${quarter}`);
  }

  const start = new Date(startYear, startMonth, 1);
  const end = new Date(endYear, endMonth + 1, 0); // Last day of end month

  return { start, end };
};

/**
 * Calculate quarterly data for a single tenant
 */
export interface QuarterlyTenantData {
  tenant: Tenant;
  expected: number; // Soll for the quarter
  paid: number; // Ist for the quarter
  balance: number; // Differenz (expected - paid)
}

export const calculateTenantQuarterlyData = (
  tenant: Tenant,
  payments: Payment[],
  leaseYear: number,
  quarter: number
): QuarterlyTenantData => {
  const { start, end } = getQuarterDateRange(leaseYear, quarter);
  const moveInDate = new Date(tenant.move_in_date);
  moveInDate.setHours(0, 0, 0, 0);

  // Check if tenant was active during this quarter
  // Active = move-in date is on or before end of quarter
  if (moveInDate > end) {
    // Tenant hadn't moved in yet
    return {
      tenant,
      expected: 0,
      paid: 0,
      balance: 0,
    };
  }

  // Calculate expected rent for each month in the quarter
  let expectedTotal = 0;
  let currentDate = new Date(start);

  while (currentDate <= end) {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    expectedTotal += calculateMonthSoll(tenant, month, year);

    currentDate.setMonth(currentDate.getMonth() + 1);
    currentDate.setDate(1);
  }

  // Calculate payments made in this quarter
  const quarterPayments = payments.filter(payment => {
    const paymentDate = new Date(payment.datum);
    return paymentDate >= start && paymentDate <= end;
  });

  const paidTotal = quarterPayments.reduce((sum, p) => sum + p.betrag, 0);
  const balance = expectedTotal - paidTotal;

  return {
    tenant,
    expected: Math.round(expectedTotal * 100) / 100,
    paid: Math.round(paidTotal * 100) / 100,
    balance: Math.round(balance * 100) / 100,
  };
};

/**
 * Calculate quarterly data for all tenants
 */
export interface GlobalQuarterlyReport {
  leaseYear: number;
  quarter: number;
  quarterLabel: string;
  dateRange: string;
  tenants: QuarterlyTenantData[];
  totalExpected: number;
  totalPaid: number;
  totalBalance: number;
}

export const calculateGlobalQuarterlyReport = (
  tenants: Tenant[],
  allPayments: Payment[],
  leaseYear: number,
  quarter: number
): GlobalQuarterlyReport => {
  const { start, end } = getQuarterDateRange(leaseYear, quarter);

  // Format date range
  const formatDateShort = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const dateRange = `${formatDateShort(start)} - ${formatDateShort(end)}`;

  // Calculate data for each tenant
  const tenantData = tenants.map(tenant => {
    const tenantPayments = allPayments.filter(p => p.tenant_id === tenant.id);
    return calculateTenantQuarterlyData(tenant, tenantPayments, leaseYear, quarter);
  });

  // Filter out tenants with no activity in this quarter
  const activeTenants = tenantData.filter(t => t.expected > 0 || t.paid > 0);

  // Calculate totals
  const totalExpected = activeTenants.reduce((sum, t) => sum + t.expected, 0);
  const totalPaid = activeTenants.reduce((sum, t) => sum + t.paid, 0);
  const totalBalance = totalExpected - totalPaid;

  return {
    leaseYear,
    quarter,
    quarterLabel: getQuarterLabel(quarter),
    dateRange,
    tenants: activeTenants,
    totalExpected: Math.round(totalExpected * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalBalance: Math.round(totalBalance * 100) / 100,
  };
};

/**
 * Get available lease years based on tenant move-in dates
 * A year is available if at least one tenant had an active lease during that year
 */
export const getAvailableLeaseYears = (tenants: Tenant[]): number[] => {
  if (tenants.length === 0) return [];

  const years = new Set<number>();
  const today = new Date();

  tenants.forEach(tenant => {
    const moveInDate = new Date(tenant.move_in_date);
    const moveInMonth = moveInDate.getMonth();
    const moveInYear = moveInDate.getFullYear();

    // Calculate the first fiscal year this tenant was active
    // Fiscal year is labeled by Jan-Nov year: "Lease year 2023" = Dec 2022 - Nov 2023
    let firstFiscalYear: number;
    if (moveInMonth === 11) {
      // If moved in December, that's Q1 of next lease year
      // Dec 2023 → lease year 2024
      firstFiscalYear = moveInYear + 1;
    } else {
      // If moved in Jan-Nov, that's in the same lease year
      // Mar 2023 → lease year 2023
      firstFiscalYear = moveInYear;
    }

    // Determine last fiscal year (current or termination date)
    let lastFiscalYear: number;
    if (tenant.termination_date) {
      const terminationDate = new Date(tenant.termination_date);
      const termMonth = terminationDate.getMonth();
      const termYear = terminationDate.getFullYear();

      if (termMonth === 11) {
        // Dec 2023 → lease year 2024
        lastFiscalYear = termYear + 1;
      } else {
        // Jan-Nov 2023 → lease year 2023
        lastFiscalYear = termYear;
      }
    } else {
      // Active tenant - use current fiscal year
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      if (currentMonth === 11) {
        // Current month is December → current lease year is next year
        lastFiscalYear = currentYear + 1;
      } else {
        // Current month is Jan-Nov → current lease year is this year
        lastFiscalYear = currentYear;
      }
    }

    // Add all fiscal years this tenant was active
    for (let year = firstFiscalYear; year <= lastFiscalYear; year++) {
      years.add(year);
    }
  });

  return Array.from(years).sort((a, b) => a - b);
};

/**
 * Get available quarters for a specific lease year based on tenant data
 * A quarter is available if at least one tenant was active during that quarter
 */
export const getAvailableQuarters = (tenants: Tenant[], leaseYear: number): number[] => {
  if (tenants.length === 0) return [];

  const quarters = new Set<number>();
  const today = new Date();

  tenants.forEach(tenant => {
    const moveInDate = new Date(tenant.move_in_date);

    // Calculate fiscal year start and end for the selected year
    const fiscalYearStart = new Date(leaseYear, 11, 1); // December 1st
    const fiscalYearEnd = new Date(leaseYear + 1, 10, 30); // November 30th

    // Determine tenant's end date (termination or today)
    const endDate = tenant.termination_date ? new Date(tenant.termination_date) : today;

    // Check if tenant was active at all during this fiscal year
    if (moveInDate > fiscalYearEnd || endDate < fiscalYearStart) {
      return; // Skip this tenant
    }

    // Check each quarter
    for (let q = 1; q <= 4; q++) {
      const { start: quarterStart, end: quarterEnd } = getQuarterDateRange(leaseYear, q);

      // Tenant is active in this quarter if:
      // - Move-in date is on or before quarter end
      // - End date (termination or today) is on or after quarter start
      if (moveInDate <= quarterEnd && endDate >= quarterStart) {
        quarters.add(q);
      }
    }
  });

  return Array.from(quarters).sort((a, b) => a - b);
};
