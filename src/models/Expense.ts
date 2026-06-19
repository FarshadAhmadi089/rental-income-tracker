/**
 * Expense model - tracks expenses created by team members
 */

export interface Expense {
  id: string;
  name: string;  // e.g., "Cleaning", "Maintenance"
  amount: number;  // AED
  expense_date: string;  // ISO date string
  created_by_id?: string | null;
  created_by_role?: string | null;
  photo_paths?: string[];  // Reserved for Part 2, empty for now
  created_at: string;  // ISO datetime string
}

export interface ExpenseInput {
  name: string;
  amount: number;
  expense_date: string;  // ISO date string (YYYY-MM-DD)
}
