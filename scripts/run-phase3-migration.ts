// Script to run Phase 3 database migration
import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";
import pkg from "pg";
const { Pool } = pkg;

// Load .env from project root
config({ path: resolve(process.cwd(), ".env") });

if (!process.env.DATABASE_URL) {
  console.error("\n❌ ERROR: DATABASE_URL is not set!\n");
  console.error("Make sure you have a .env file in the project root with:");
  console.error("DATABASE_URL=postgresql://user:password@host:port/database\n");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("🚀 Running Phase 3 migration: add_phase3_features.sql");
    console.log("This will add: Subscriptions, Payouts, Fees & Splits tables\n");
    
    const migrationSQL = readFileSync(
      resolve(process.cwd(), "migrations/add_phase3_features.sql"),
      "utf-8"
    );
    
    await client.query(migrationSQL);
    console.log("✅ Phase 3 migration completed successfully!");
    console.log("\nAdded tables:");
    console.log("  - subscriptions");
    console.log("  - subscription_schedules");
    console.log("  - subscription_invoices");
    console.log("  - payouts");
    console.log("  - payout_attempts");
    console.log("  - fee_rules");
    console.log("  - split_rules");
    console.log("  - ledger_entries");
    console.log("\nAdded webhook event types:");
    console.log("  - subscription.created");
    console.log("  - subscription.invoice_generated");
    console.log("  - subscription.past_due");
    console.log("  - subscription.canceled");
    console.log("  - payout.created");
    console.log("  - payout.completed");
    console.log("  - payout.failed");
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    if (error.detail) {
      console.error("Details:", error.detail);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

