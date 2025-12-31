// Load environment variables if not already loaded
import { config } from "dotenv";
import { resolve } from "path";

// Use the working directory as the project root so the path resolution
// works in both dev (ESM) and the bundled production build (CJS) where
// import.meta.url is unavailable.
const projectRoot = process.cwd();

// Load .env from project root
config({ path: resolve(projectRoot, ".env") });

import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "../shared/schema.js";

// In demo mode, database is optional (uses in-memory storage for public routes)
const isDemoMode = process.env.ARCPAY_PUBLIC_DEMO_MODE === "true";

if (!process.env.DATABASE_URL && !isDemoMode) {
  console.error("\n❌ ERROR: DATABASE_URL is not set!\n");
  console.error("Make sure you have a .env file in the project root with:");
  console.error("DATABASE_URL=postgresql://user:password@host:port/database\n");
  throw new Error("DATABASE_URL environment variable is not set");
}

if (!process.env.DATABASE_URL && isDemoMode) {
  console.log("⚠️  DATABASE_URL not set - using demo mode with in-memory storage for public routes");
}

// Only create pool if DATABASE_URL is set
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool configuration - optimized for performance
  max: 30, // Increased from 20 - Maximum number of clients in the pool
  min: 5, // Minimum number of clients to keep in pool (reduces connection overhead)
  idleTimeoutMillis: 10000, // Reduced from 30s - Close idle clients faster to free resources
  connectionTimeoutMillis: 5000, // Reduced from 30s - Fail fast if connection can't be established
  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 0, // Start keepalive immediately
  // Statement timeout (set per connection)
  statement_timeout: 10000, // 10 seconds for query execution
}) : null;

// Set up pool event handlers only if pool exists
if (pool) {
  // Set statement timeout on connection (30 seconds for query execution)
  pool.on("connect", async (client) => {
    await client.query("SET statement_timeout = 30000"); // 30 seconds
  });

  // Handle pool errors gracefully
  pool.on("error", (err) => {
    console.error("Unexpected error on idle database client:", err);
    // Don't exit the process, just log the error
    // The pool will handle reconnection automatically
  });

  // Handle connection errors
  pool.on("connect", () => {
    // Connection established successfully
  });

  pool.on("acquire", () => {
    // Client acquired from pool
  });

  pool.on("remove", () => {
    // Client removed from pool
  });
}

// Create db instance only if pool exists, otherwise export null
// In demo mode, public routes use in-memory storage
export const db = pool ? drizzle(pool, { schema }) : null;
export { pool };
