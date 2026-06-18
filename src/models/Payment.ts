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
  created_by_id?: string; // User ID who created this payment
  created_by_role?: string; // Role of creator: admin, rent_collector, spectator
}

/**
 * Input type for creating a new payment (without id, created_at, creator fields)
 */
export type PaymentInput = Omit<Payment, 'id' | 'created_at' | 'created_by_id' | 'created_by_role'>;
