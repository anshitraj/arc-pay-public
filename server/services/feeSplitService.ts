/**
 * Fee & Split Service
 * Ledger-based accounting for platform fees and payment splits
 * PaymentIntent remains authoritative - fees/splits are post-payment accounting
 */

import { db } from "../db.js";
import { feeRules, splitRules, ledgerEntries, payments } from "../../shared/schema.js";
import { eq, and, isNull } from "drizzle-orm";

export interface CreateFeeRuleRequest {
  merchantId?: string; // null = global rule
  feeType: "platform" | "processing";
  feeBasisPoints?: number; // e.g., 30 = 0.3%
  feeFixedAmount?: string; // Fixed fee amount
  currency: string;
}

export interface CreateSplitRuleRequest {
  merchantId: string;
  recipientWallet: string;
  splitBasisPoints: number; // e.g., 1000 = 10%
  currency: string;
}

export interface FeeRule {
  id: string;
  merchantId: string | null;
  feeType: string;
  feeBasisPoints: number | null;
  feeFixedAmount: string | null;
  currency: string;
  active: boolean;
}

export interface SplitRule {
  id: string;
  merchantId: string;
  recipientWallet: string;
  splitBasisPoints: number;
  currency: string;
  active: boolean;
}

/**
 * Calculate fee for a payment
 */
export async function calculateFee(paymentId: string): Promise<{
  feeAmount: string;
  feeRuleId: string | null;
}> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment) {
    throw new Error("Payment not found");
  }

  // Get applicable fee rule (merchant-specific first, then global)
  const merchantRule = await db
    .select()
    .from(feeRules)
    .where(
      and(
        eq(feeRules.merchantId, payment.merchantId),
        eq(feeRules.currency, payment.currency),
        eq(feeRules.active, true),
        eq(feeRules.feeType, "platform")
      )
    )
    .limit(1);

  const globalRule = await db
    .select()
    .from(feeRules)
    .where(
      and(
        isNull(feeRules.merchantId),
        eq(feeRules.currency, payment.currency),
        eq(feeRules.active, true),
        eq(feeRules.feeType, "platform")
      )
    )
    .limit(1);

  const rule = merchantRule[0] || globalRule[0];
  if (!rule) {
    return { feeAmount: "0", feeRuleId: null };
  }

  let feeAmount = 0;
  const paymentAmount = parseFloat(payment.amount);

  // Calculate fee
  if (rule.feeBasisPoints) {
    feeAmount = (paymentAmount * rule.feeBasisPoints) / 10000;
  }
  if (rule.feeFixedAmount) {
    feeAmount += parseFloat(rule.feeFixedAmount);
  }

  return {
    feeAmount: feeAmount.toFixed(6),
    feeRuleId: rule.id,
  };
}

/**
 * Calculate splits for a payment
 */
export async function calculateSplits(paymentId: string): Promise<Array<{
  splitRuleId: string;
  recipientWallet: string;
  splitAmount: string;
}>> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment) {
    throw new Error("Payment not found");
  }

  const rules = await db
    .select()
    .from(splitRules)
    .where(
      and(
        eq(splitRules.merchantId, payment.merchantId),
        eq(splitRules.currency, payment.currency),
        eq(splitRules.active, true)
      )
    );

  const paymentAmount = parseFloat(payment.amount);
  const splits = rules.map((rule) => ({
    splitRuleId: rule.id,
    recipientWallet: rule.recipientWallet,
    splitAmount: ((paymentAmount * rule.splitBasisPoints) / 10000).toFixed(6),
  }));

  return splits;
}

/**
 * Apply fees and splits to a payment (create ledger entries)
 * Called after payment is confirmed
 */
export async function applyFeesAndSplits(paymentId: string): Promise<void> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment || payment.status !== "confirmed") {
    return; // Only apply to confirmed payments
  }

  // Check if already applied
  const existingEntries = await db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.paymentId, paymentId))
    .limit(1);

  if (existingEntries.length > 0) {
    return; // Already applied
  }

  // Calculate and apply fees
  const { feeAmount, feeRuleId } = await calculateFee(paymentId);
  if (parseFloat(feeAmount) > 0 && feeRuleId) {
    await db.insert(ledgerEntries).values({
      merchantId: payment.merchantId,
      paymentId: payment.id,
      entryType: "fee",
      amount: feeAmount, // Positive = debit from merchant
      currency: payment.currency,
      description: "Platform fee",
      feeRuleId,
    });
  }

  // Calculate and apply splits
  const splits = await calculateSplits(paymentId);
  for (const split of splits) {
    await db.insert(ledgerEntries).values({
      merchantId: payment.merchantId,
      paymentId: payment.id,
      entryType: "split",
      amount: split.splitAmount, // Positive = debit from merchant
      currency: payment.currency,
      description: `Split to ${split.recipientWallet}`,
      splitRuleId: split.splitRuleId,
    });
  }
}

/**
 * Get fee summary for a payment
 */
export async function getFeeSummary(paymentId: string): Promise<{
  grossAmount: string;
  fees: string;
  splits: string;
  netAmount: string;
}> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment) {
    throw new Error("Payment not found");
  }

  const entries = await db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.paymentId, paymentId));

  let fees = 0;
  let splits = 0;

  for (const entry of entries) {
    const amount = parseFloat(entry.amount);
    if (entry.entryType === "fee") {
      fees += amount;
    } else if (entry.entryType === "split") {
      splits += amount;
    }
  }

  const grossAmount = parseFloat(payment.amount);
  const netAmount = grossAmount - fees - splits;

  return {
    grossAmount: grossAmount.toFixed(6),
    fees: fees.toFixed(6),
    splits: splits.toFixed(6),
    netAmount: netAmount.toFixed(6),
  };
}

/**
 * Create fee rule
 */
export async function createFeeRule(request: CreateFeeRuleRequest): Promise<FeeRule> {
  const [rule] = await db
    .insert(feeRules)
    .values({
      merchantId: request.merchantId || null,
      feeType: request.feeType,
      feeBasisPoints: request.feeBasisPoints || null,
      feeFixedAmount: request.feeFixedAmount || null,
      currency: request.currency,
      active: true,
    })
    .returning();

  return rule as FeeRule;
}

/**
 * Create split rule
 */
export async function createSplitRule(request: CreateSplitRuleRequest): Promise<SplitRule> {
  // Validate wallet address
  if (!/^0x[a-fA-F0-9]{40}$/.test(request.recipientWallet)) {
    throw new Error("Invalid recipient wallet address");
  }

  // Validate split doesn't exceed 100%
  const existingRules = await db
    .select()
    .from(splitRules)
    .where(
      and(
        eq(splitRules.merchantId, request.merchantId),
        eq(splitRules.currency, request.currency),
        eq(splitRules.active, true)
      )
    );

  const totalBasisPoints = existingRules.reduce((sum, r) => sum + r.splitBasisPoints, 0);
  if (totalBasisPoints + request.splitBasisPoints > 10000) {
    throw new Error("Total splits cannot exceed 100%");
  }

  const [rule] = await db
    .insert(splitRules)
    .values({
      merchantId: request.merchantId,
      recipientWallet: request.recipientWallet.toLowerCase(),
      splitBasisPoints: request.splitBasisPoints,
      currency: request.currency,
      active: true,
    })
    .returning();

  return rule as SplitRule;
}

/**
 * Get fee rules for merchant
 */
export async function getFeeRules(merchantId?: string): Promise<FeeRule[]> {
  if (merchantId) {
    const rules = await db
      .select()
      .from(feeRules)
      .where(eq(feeRules.merchantId, merchantId));
    return rules as FeeRule[];
  }

  // Get global rules
  const rules = await db
    .select()
    .from(feeRules)
    .where(isNull(feeRules.merchantId));
  return rules as FeeRule[];
}

/**
 * Get split rules for merchant
 */
export async function getSplitRules(merchantId: string): Promise<SplitRule[]> {
  const rules = await db
    .select()
    .from(splitRules)
    .where(eq(splitRules.merchantId, merchantId));
  return rules as SplitRule[];
}

