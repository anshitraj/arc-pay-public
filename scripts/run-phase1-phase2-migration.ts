// Script to run Phase 1 and Phase 2 migration
import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";
import pkg from "pg";
const { Pool } = pkg;

// Load .env from project root
config({ path: resolve(process.cwd(), ".env") });

if (!process.env.DATABASE_URL) {
  console.error("\n❌ ERROR: DATABASE_URL is not set!\n");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("Running migration: add_phase1_phase2_features.sql");
    const migrationSQL = readFileSync(
      resolve(process.cwd(), "migrations/add_phase1_phase2_features.sql"),
      "utf-8"
    );
    
    await client.query(migrationSQL);
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

