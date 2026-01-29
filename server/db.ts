import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle({ client: pool, schema, casing: "snake_case" });

// Ensure database schema is up to date
export async function ensureSchemaSync() {
  const client = await pool.connect();
  try {
    // Check if 'owner' role exists in the enum
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'owner' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'role')
      ) as owner_exists;
    `);
    
    if (!result.rows[0]?.owner_exists) {
      // Add 'owner' to the role enum
      await client.query(`ALTER TYPE role ADD VALUE IF NOT EXISTS 'owner' BEFORE 'admin';`);
      console.log('[db] Added "owner" role to enum');
    }
  } catch (error) {
    console.error('[db] Error syncing schema:', error);
  } finally {
    client.release();
  }
}
