/**
 * Payout Service
 * Handles merchant withdrawals (non-custodial)
 * Uses existing treasury balances
 */

import { db } from "../db.js";
import { payouts, payoutAttempts, treasuryBalances } from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { dispatchWebhook } from "./webhookService.js";
import { storage } from "../storage.js";

export interface CreatePayoutRequest {
  merchantId: string;
  amount: string;
  currency: string;
  destinationWallet: string;
  destinationChainId?: number; // Default: Arc (5042002)
  metadata?: Record<string, any>;
}

export interface Payout {
  id: string;
  merchantId: string;
  amount: string;
  currency: string;
  destinationWallet: string;
  destinationChainId: number;
  status: "pending" | "processing" | "completed" | "failed";
  txHash: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a payout request
 * Note: Actual transaction must be initiated by merchant's wallet (non-custodial)
 */
export async function createPayout(request: CreatePayoutRequest): Promise<Payout> {
  // Verify merchant has sufficient balance
  const balance = await storage.getTreasuryBalance(request.merchantId, request.currency);
  if (!balance) {
    throw new Error(`No balance found for currency ${request.currency}`);
  }

  const balanceAmount = parseFloat(balance.balance);
  const payoutAmount = parseFloat(request.amount);

  if (payoutAmount > balanceAmount) {
    throw new Error("Insufficient balance");
  }

  if (payoutAmount <= 0) {
    throw new Error("Payout amount must be positive");
  }

  // Validate wallet address
  if (!/^0x[a-fA-F0-9]{40}$/.test(request.destinationWallet)) {
    throw new Error("Invalid destination wallet address");
  }

  const [payout] = await db
    .insert(payouts)
    .values({
      merchantId: request.merchantId,
      amount: request.amount,
      currency: request.currency,
      destinationWallet: request.destinationWallet.toLowerCase(),
      destinationChainId: request.destinationChainId || 5042002,
      status: "pending",
      metadata: request.metadata ? JSON.stringify(request.metadata) : null,
    })
    .returning();

  // Create initial attempt
  await db.insert(payoutAttempts).values({
    payoutId: payout.id,
    attemptNumber: 1,
    status: "pending",
  });

  // Dispatch webhook
  await dispatchWebhook(request.merchantId, "payout.created", {
    type: "payout.created",
    data: {
      id: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      destinationWallet: payout.destinationWallet,
      status: payout.status,
    },
  }).catch(console.error);

  return payout as Payout;
}

/**
 * Complete payout (called after merchant initiates transaction)
 */
export async function completePayout(payoutId: string, txHash: string, merchantId: string): Promise<Payout> {
  const [payout] = await db
    .select()
    .from(payouts)
    .where(
      and(
        eq(payouts.id, payoutId),
        eq(payouts.merchantId, merchantId)
      )
    )
    .limit(1);

  if (!payout) {
    throw new Error("Payout not found");
  }

  if (payout.status === "completed") {
    return payout as Payout;
  }

  const now = new Date();

  // Update payout
  await db
    .update(payouts)
    .set({
      status: "completed",
      txHash,
      updatedAt: now,
    })
    .where(eq(payouts.id, payoutId));

  // Update attempt
  await db
    .update(payoutAttempts)
    .set({
      status: "completed",
      txHash,
    })
    .where(
      and(
        eq(payoutAttempts.payoutId, payoutId),
        eq(payoutAttempts.status, "pending")
      )
    );

  // Deduct from treasury balance
  const balance = await storage.getTreasuryBalance(merchantId, payout.currency);
  if (balance) {
    const newBalance = (parseFloat(balance.balance) - parseFloat(payout.amount)).toString();
    await storage.updateTreasuryBalance(balance.id, {
      balance: newBalance,
    });
  }

  const [updated] = await db
    .select()
    .from(payouts)
    .where(eq(payouts.id, payoutId))
    .limit(1);

  // Dispatch webhook
  await dispatchWebhook(merchantId, "payout.completed", {
    type: "payout.completed",
    data: {
      id: updated.id,
      amount: updated.amount,
      currency: updated.currency,
      txHash: updated.txHash,
    },
  }).catch(console.error);

  return updated as Payout;
}

/**
 * Fail payout
 */
export async function failPayout(payoutId: string, reason: string, merchantId: string): Promise<Payout> {
  const [payout] = await db
    .select()
    .from(payouts)
    .where(
      and(
        eq(payouts.id, payoutId),
        eq(payouts.merchantId, merchantId)
      )
    )
    .limit(1);

  if (!payout) {
    throw new Error("Payout not found");
  }

  const now = new Date();

  await db
    .update(payouts)
    .set({
      status: "failed",
      failureReason: reason,
      updatedAt: now,
    })
    .where(eq(payouts.id, payoutId));

  // Update attempt
  await db
    .update(payoutAttempts)
    .set({
      status: "failed",
      errorMessage: reason,
    })
    .where(
      and(
        eq(payoutAttempts.payoutId, payoutId),
        eq(payoutAttempts.status, "pending")
      )
    );

  const [updated] = await db
    .select()
    .from(payouts)
    .where(eq(payouts.id, payoutId))
    .limit(1);

  // Dispatch webhook
  await dispatchWebhook(merchantId, "payout.failed", {
    type: "payout.failed",
    data: {
      id: updated.id,
      amount: updated.amount,
      currency: updated.currency,
      reason,
    },
  }).catch(console.error);

  return updated as Payout;
}

/**
 * Get payouts for merchant
 */
export async function getPayouts(merchantId: string): Promise<Payout[]> {
  const payoutList = await db
    .select()
    .from(payouts)
    .where(eq(payouts.merchantId, merchantId))
    .orderBy(payouts.createdAt);

  return payoutList as Payout[];
}

