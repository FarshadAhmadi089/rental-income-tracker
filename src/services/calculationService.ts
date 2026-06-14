import type { Tenant } from '../models/Tenant';
import type { Payment } from '../models/Payment';
import { getPaymentsByTenantId } from './database';

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
 * Calculate the total rent due (Soll) from start date until today
 *
 * Formula:
 * - Calculate months between start date and today
 * - For partial first month: calculate days/total_days_in_month ratio
 * - Total = (full_months * monthly_rate) + (partial_month_rent)
 */
export const calculateSoll = (tenant: Tenant): number => {
  const startDate = new Date(tenant.mietanfang_datum);
  const today = new Date();

  // Reset time to midnight for accurate day calculation
  startDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const monthlyRate = tenant.jahresmiete / 12;

  let totalDue = 0;
  let currentDate = new Date(startDate);

  while (currentDate <= today) {
    const daysInMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    ).getDate();

    // Check if this is the first (partial) month
    const isFirstMonth = currentDate.getMonth() === startDate.getMonth() &&
                         currentDate.getFullYear() === startDate.getFullYear();

    // Check if this is the current (partial) month
    const isCurrentMonth = currentDate.getMonth() === today.getMonth() &&
                           currentDate.getFullYear() === today.getFullYear();

    if (isFirstMonth && isCurrentMonth) {
      // Both first and current month (same month)
      const daysInPeriod = today.getDate() - startDate.getDate() + 1;
      totalDue += (monthlyRate / daysInMonth) * daysInPeriod;
      break;
    } else if (isFirstMonth) {
      // First month (partial)
      const daysFromStart = daysInMonth - startDate.getDate() + 1;
      totalDue += (monthlyRate / daysInMonth) * daysFromStart;
    } else if (isCurrentMonth) {
      // Current month (partial)
      const daysUntilToday = today.getDate();
      totalDue += (monthlyRate / daysInMonth) * daysUntilToday;
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
export const calculateIst = (mieter_id: number): number => {
  const payments = getPaymentsByTenantId(mieter_id);
  const total = payments.reduce((sum, payment) => sum + payment.betrag, 0);
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
export const getTenantBalance = (tenant: Tenant): TenantBalance => {
  const soll = calculateSoll(tenant);
  const ist = calculateIst(tenant.id);
  const saldo = calculateSaldo(soll, ist);
  const monatlicheRate = Math.round((tenant.jahresmiete / 12) * 100) / 100;

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
 */
export const getAllTenantBalances = (tenants: Tenant[]): TenantBalance[] => {
  return tenants.map(tenant => getTenantBalance(tenant));
};

/**
 * Format currency for display (EUR)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};
