// Script to add performance indexes
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
    console.log("🚀 Adding performance indexes...");
    
    const migrationSQL = readFileSync(
      resolve(process.cwd(), "migrations/add_performance_indexes.sql"),
      "utf-8"
    );
    
    await client.query(migrationSQL);
    console.log("✅ Performance indexes added successfully!");
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    if (error.code === "42P07") {
      console.log("Note: Some indexes may already exist. This is safe to ignore.");
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

