/**
 * FX Quote Service
 * Handles on-chain FX rate quotes (USDC ↔ EURC)
 * Quotes are locked for a period and expire
 */

import { db } from "../db.js";
import { fxQuotes } from "../../shared/schema.js";
import { eq, and, gt, lt } from "drizzle-orm";

export interface CreateFxQuoteRequest {
  paymentId?: string;
  merchantId?: string;
  fromCurrency: "USDC" | "EURC";
  toCurrency: "USDC" | "EURC";
  amount: string;
  expiresInSeconds?: number; // Default: 30 seconds
}

export interface FxQuote {
  id: string;
  paymentId: string | null;
  merchantId: string | null;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  amount: string;
  convertedAmount: string;
  status: "active" | "expired" | "used";
  expiresAt: Date;
  createdAt: Date;
}

// Mock FX rates (in production, fetch from on-chain DEX or oracle)
const FX_RATES: Record<string, number> = {
  "USDC_EURC": 0.92, // 1 USDC = 0.92 EURC
  "EURC_USDC": 1.087, // 1 EURC = 1.087 USDC
};

/**
 * Get current FX rate (mock implementation)
 * In production, this would fetch from on-chain DEX or oracle
 */
function getFxRate(fromCurrency: "USDC" | "EURC", toCurrency: "USDC" | "EURC"): number {
  if (fromCurrency === toCurrency) {
    return 1.0;
  }

  const key = `${fromCurrency}_${toCurrency}`;
  return FX_RATES[key] || 1.0;
}

/**
 * Create an FX quote
 * Locks the rate for the specified duration
 */
export async function createFxQuote(request: CreateFxQuoteRequest): Promise<FxQuote> {
  const expiresInSeconds = request.expiresInSeconds || 30; // Default 30 seconds
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  const rate = getFxRate(request.fromCurrency, request.toCurrency);
  const amount = parseFloat(request.amount);
  const convertedAmount = amount * rate;

  const [quote] = await db
    .insert(fxQuotes)
    .values({
      paymentId: request.paymentId || null,
      merchantId: request.merchantId || null,
      fromCurrency: request.fromCurrency,
      toCurrency: request.toCurrency,
      rate: rate.toString(),
      amount: request.amount,
      convertedAmount: convertedAmount.toFixed(6),
      status: "active",
      expiresAt,
    })
    .returning();

  return quote as FxQuote;
}

/**
 * Get an active FX quote by ID
 */
export async function getFxQuote(quoteId: string): Promise<FxQuote | null> {
  const [quote] = await db
    .select()
    .from(fxQuotes)
    .where(eq(fxQuotes.id, quoteId));

  if (!quote) {
    return null;
  }

  // Check if quote has expired
  if (new Date(quote.expiresAt) < new Date() && quote.status === "active") {
    // Mark as expired
    await db
      .update(fxQuotes)
      .set({ status: "expired" })
      .where(eq(fxQuotes.id, quoteId));

    return { ...quote, status: "expired" } as FxQuote;
  }

  return quote as FxQuote;
}

/**
 * Mark FX quote as used
 */
export async function markFxQuoteAsUsed(quoteId: string): Promise<void> {
  await db
    .update(fxQuotes)
    .set({ status: "used" })
    .where(eq(fxQuotes.id, quoteId));
}

/**
 * Clean up expired quotes (background job)
 */
export async function cleanupExpiredQuotes(): Promise<void> {
  const now = new Date();
  await db
    .update(fxQuotes)
    .set({ status: "expired" })
    .where(
      and(
        eq(fxQuotes.status, "active"),
        lt(fxQuotes.expiresAt, now)
      )
    );
}

