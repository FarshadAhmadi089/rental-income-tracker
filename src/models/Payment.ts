/**
 * Payment (Zahlung) Model
 * Represents a single rent payment from a tenant
 */
export interface Payment {
  id: number;
  mieter_id: number; // Foreign key to Tenant
  datum: string; // Payment date (ISO date string YYYY-MM-DD)
  betrag: number; // Amount paid in euros
  created_at?: string; // Timestamp
}

/**
 * Input type for creating a new payment (without id)
 */
export type PaymentInput = Omit<Payment, 'id' | 'created_at'>;
