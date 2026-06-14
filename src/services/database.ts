import * as SQLite from 'expo-sqlite';
import type { Tenant, TenantInput } from '../models/Tenant';
import type { Payment, PaymentInput } from '../models/Payment';

const DB_NAME = 'rental_income.db';

// Global database instance
let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Get or create the database instance
 */
const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  return dbInstance;
};

/**
 * Initialize database tables - MUST be called before any database operations
 * Returns a Promise that resolves when initialization is complete
 */
export const initDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Initializing database...');
    const db = getDatabase();

    // Enable foreign key constraints
    db.execSync('PRAGMA foreign_keys = ON;');
    console.log('✅ Foreign keys enabled');

    // Create Tenants table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS tenants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mietanfang_datum TEXT NOT NULL,
        jahresmiete REAL NOT NULL,
        anmerkungen TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tenants table created');

    // Create Payments table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mieter_id INTEGER NOT NULL,
        datum TEXT NOT NULL,
        betrag REAL NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mieter_id) REFERENCES tenants(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Payments table created');

    // Create index on mieter_id for faster queries
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_payments_mieter_id
      ON payments(mieter_id);
    `);
    console.log('✅ Index created');

    // Verify tables exist
    const tables = db.getAllSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('tenants', 'payments')"
    );

    if (tables.length !== 2) {
      throw new Error(`Expected 2 tables, found ${tables.length}`);
    }

    console.log('✅ Database initialized successfully - All tables verified');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

/**
 * Get all tenants
 */
export const getAllTenants = (): Tenant[] => {
  const db = getDatabase();
  const result = db.getAllSync<Tenant>('SELECT * FROM tenants ORDER BY name ASC');
  return result;
};

/**
 * Get a single tenant by ID
 */
export const getTenantById = (id: number): Tenant | null => {
  const db = getDatabase();
  const result = db.getFirstSync<Tenant>('SELECT * FROM tenants WHERE id = ?', [id]);
  return result || null;
};

/**
 * Create a new tenant
 */
export const createTenant = (tenant: TenantInput): number => {
  const db = getDatabase();
  const result = db.runSync(
    `INSERT INTO tenants (name, mietanfang_datum, jahresmiete, anmerkungen)
     VALUES (?, ?, ?, ?)`,
    [tenant.name, tenant.mietanfang_datum, tenant.jahresmiete, tenant.anmerkungen]
  );
  return result.lastInsertRowId;
};

/**
 * Update a tenant
 */
export const updateTenant = (id: number, tenant: Partial<TenantInput>): void => {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (tenant.name !== undefined) {
    fields.push('name = ?');
    values.push(tenant.name);
  }
  if (tenant.mietanfang_datum !== undefined) {
    fields.push('mietanfang_datum = ?');
    values.push(tenant.mietanfang_datum);
  }
  if (tenant.jahresmiete !== undefined) {
    fields.push('jahresmiete = ?');
    values.push(tenant.jahresmiete);
  }
  if (tenant.anmerkungen !== undefined) {
    fields.push('anmerkungen = ?');
    values.push(tenant.anmerkungen);
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.runSync(
    `UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
};

/**
 * Delete a tenant (and all associated payments via CASCADE)
 */
export const deleteTenant = (id: number): void => {
  const db = getDatabase();
  db.runSync('DELETE FROM tenants WHERE id = ?', [id]);
};

/**
 * Get all payments for a specific tenant
 */
export const getPaymentsByTenantId = (mieter_id: number): Payment[] => {
  const db = getDatabase();
  const result = db.getAllSync<Payment>(
    'SELECT * FROM payments WHERE mieter_id = ? ORDER BY datum DESC',
    [mieter_id]
  );
  return result;
};

/**
 * Create a new payment
 */
export const createPayment = (payment: PaymentInput): number => {
  const db = getDatabase();
  const result = db.runSync(
    `INSERT INTO payments (mieter_id, datum, betrag)
     VALUES (?, ?, ?)`,
    [payment.mieter_id, payment.datum, payment.betrag]
  );
  return result.lastInsertRowId;
};

/**
 * Delete a payment
 */
export const deletePayment = (id: number): void => {
  const db = getDatabase();
  db.runSync('DELETE FROM payments WHERE id = ?', [id]);
};
