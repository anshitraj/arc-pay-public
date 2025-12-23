/**
 * Test/Live Mode Isolation Middleware
 * Ensures strict separation between test and live mode:
 * - Test API keys can only access test payments
 * - Live API keys can only access live payments
 * - Test payments cannot touch live settlement
 */

import type { Request, Response, NextFunction } from "express";
import { db } from "../db.js";
import { payments, apiKeys } from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";

declare module "express-serve-static-core" {
  interface Request {
    apiKeyMode?: "test" | "live";
  }
}

/**
 * Get API key mode (test or live)
 */
async function getApiKeyMode(apiKey: string): Promise<"test" | "live" | null> {
  // Check apiKeys table first
  const [keyRecord] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyPrefix, apiKey))
    .limit(1);

  if (keyRecord) {
    return keyRecord.mode;
  }

  // Fallback: check if key starts with test/live prefix
  if (apiKey.startsWith("pk_arc_test_") || apiKey.startsWith("sk_arc_test_")) {
    return "test";
  }
  if (apiKey.startsWith("pk_arc_live_") || apiKey.startsWith("sk_arc_live_")) {
    return "live";
  }

  return null;
}

/**
 * Middleware to enforce test/live mode isolation
 * Must be used after requireApiKey middleware
 */
export async function enforceTestLiveIsolation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Skip if no merchant (public endpoints)
  if (!req.merchant) {
    return next();
  }

  // Extract API key from request
  const apiKey =
    req.headers.authorization?.replace("Bearer ", "") ||
    req.headers["x-api-key"] ||
    (req.query.apiKey as string);

  if (!apiKey) {
    return next(); // No API key, skip isolation check
  }

  try {
    const mode = await getApiKeyMode(apiKey);
    req.apiKeyMode = mode || undefined;

    // If accessing a payment, verify mode matches
    const paymentId = req.params.paymentId || req.params.id || req.body.paymentId;
    if (paymentId && mode) {
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (payment) {
        const paymentIsTest = payment.isTest;
        const keyIsTest = mode === "test";

        // Strict isolation: test keys can only access test payments, live keys can only access live payments
        if (paymentIsTest !== keyIsTest) {
          return res.status(403).json({
            error: "Mode mismatch",
            message: `Cannot access ${paymentIsTest ? "test" : "live"} payment with ${keyIsTest ? "test" : "live"} API key`,
          });
        }
      }
    }

    next();
  } catch (error) {
    console.error("Test/live isolation check error:", error);
    // Don't block on error, but log it
    next();
  }
}

/**
 * Helper to filter payments by mode
 */
export function filterPaymentsByMode<T extends { isTest: boolean }>(
  payments: T[],
  mode: "test" | "live"
): T[] {
  const isTest = mode === "test";
  return payments.filter((p) => p.isTest === isTest);
}

