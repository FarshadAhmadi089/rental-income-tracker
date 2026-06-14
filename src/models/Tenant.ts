/**
 * Tenant (Mieter) Model
 * Represents a tenant with their rental agreement details
 */
export interface Tenant {
  id: number;
  name: string;
  mietanfang_datum: string; // ISO date string (YYYY-MM-DD)
  jahresmiete: number; // Annual rent in euros
  anmerkungen: string; // Notes/comments
  created_at?: string; // Timestamp
  updated_at?: string; // Timestamp
}

/**
 * Input type for creating a new tenant (without id)
 */
export type TenantInput = Omit<Tenant, 'id' | 'created_at' | 'updated_at'>;
