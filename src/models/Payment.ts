/**
 * Payment Model
 * Represents a single rent payment from a tenant
 */
export interface Payment {
  id: string;
  tenant_id: string; // Foreign key to Tenant
  payment_date: string; // Payment date (ISO date string YYYY-MM-DD)
  amount: number; // Amount paid in AED
  created_at?: string; // Timestamp
}

/**
 * Input type for creating a new payment (without id, created_at)
 */
export type PaymentInput = Omit<Payment, 'id' | 'created_at'>;
