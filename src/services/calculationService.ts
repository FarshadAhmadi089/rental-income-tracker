import type { Tenant } from '../models/Tenant';
import type { Payment } from '../models/Payment';

/**
 * Tenant Balance Information
 */
export interface TenantBalance {
  tenant: Tenant;
  soll: number; // Total rent due (from start until today)
  ist: number; // Total payments received
  saldo: number; // Balance (negative = overpaid, positive = outstanding)
  monatlicheRate: number; // Monthly rent rate
}

/**
 * Calculate the total rent due (Soll) from start date until today (or termination date)
 *
 * Formula:
 * - Calculate months between start date and end date (today or termination_date)
 * - For partial first month: calculate days/total_days_in_month ratio
 * - Total = (full_months * monthly_rate) + (partial_month_rent)
 * - If tenant has termination_date, calculation stops at that date
 */
export const calculateSoll = (tenant: Tenant): number => {
  const startDate = new Date(tenant.move_in_date);
  const today = new Date();

  // If tenant has terminated, use termination date as end date
  const endDate = tenant.termination_date
    ? new Date(tenant.termination_date)
    : today;

  // Reset time to midnight for accurate day calculation
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const monthlyRate = tenant.annual_rent / 12;

  let totalDue = 0;
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const daysInMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    ).getDate();

    // Check if this is the first (partial) month
    const isFirstMonth = currentDate.getMonth() === startDate.getMonth() &&
                         currentDate.getFullYear() === startDate.getFullYear();

    // Check if this is the end (partial) month
    const isEndMonth = currentDate.getMonth() === endDate.getMonth() &&
                       currentDate.getFullYear() === endDate.getFullYear();

    if (isFirstMonth && isEndMonth) {
      // Both first and end month (same month)
      const daysInPeriod = endDate.getDate() - startDate.getDate() + 1;
      totalDue += (monthlyRate / daysInMonth) * daysInPeriod;
      break;
    } else if (isFirstMonth) {
      // First month (partial)
      const daysFromStart = daysInMonth - startDate.getDate() + 1;
      totalDue += (monthlyRate / daysInMonth) * daysFromStart;
    } else if (isEndMonth) {
      // End month (partial)
      const daysUntilEnd = endDate.getDate();
      totalDue += (monthlyRate / daysInMonth) * daysUntilEnd;
      break;
    } else {
      // Full month
      totalDue += monthlyRate;
    }

    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
    currentDate.setDate(1);
  }

  return Math.round(totalDue * 100) / 100; // Round to 2 decimals
};

/**
 * Calculate total payments received (Ist)
 */
export const calculateIst = (payments: Payment[]): number => {
  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return Math.round(total * 100) / 100; // Round to 2 decimals
};

/**
 * Calculate balance (Saldo)
 * Positive = tenant owes money (Rückstand)
 * Negative = tenant has overpaid (Guthaben)
 */
export const calculateSaldo = (soll: number, ist: number): number => {
  return Math.round((soll - ist) * 100) / 100; // Round to 2 decimals
};

/**
 * Get complete balance information for a tenant
 */
export const getTenantBalance = (tenant: Tenant, payments: Payment[]): TenantBalance => {
  const soll = calculateSoll(tenant);
  const ist = calculateIst(payments);
  const saldo = calculateSaldo(soll, ist);
  const monatlicheRate = Math.round((tenant.annual_rent / 12) * 100) / 100;

  return {
    tenant,
    soll,
    ist,
    saldo,
    monatlicheRate,
  };
};

/**
 * Get all tenant balances
 * Note: Requires payments to be fetched separately for each tenant
 */
export const getAllTenantBalances = (tenants: Tenant[], allPayments: Payment[]): TenantBalance[] => {
  return tenants.map(tenant => {
    const tenantPayments = allPayments.filter(payment => payment.tenant_id === tenant.id);
    return getTenantBalance(tenant, tenantPayments);
  });
};

/**
 * Format currency for display (AED)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
  }).format(amount);
};

/**
 * Format number without currency symbol (for compact displays)
 */
export const formatNumber = (amount: number): string => {
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};
