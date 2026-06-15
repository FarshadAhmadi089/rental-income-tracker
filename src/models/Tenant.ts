/**
 * Tenant Model
 * Represents a tenant with their rental agreement details
 */
export interface Tenant {
  id: string;
  name: string;
  move_in_date: string; // ISO date string (YYYY-MM-DD)
  annual_rent: number; // Annual rent in AED
  notes: string; // Notes/comments
  termination_date: string | null; // ISO date string (YYYY-MM-DD) - null if active
  created_at?: string; // Timestamp
  updated_at?: string; // Timestamp
}

/**
 * Input type for creating a new tenant (without id, created_at, updated_at)
 */
export type TenantInput = Omit<Tenant, 'id' | 'created_at' | 'updated_at'>;
