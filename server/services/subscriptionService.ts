/**
 * Subscription Service
 * Non-custodial subscriptions: Generate recurring invoices, users pay via hosted checkout
 * NO automatic wallet debits - safe and compliant
 */

import { db } from "../db.js";
import { subscriptions, subscriptionSchedules, subscriptionInvoices, invoices, payments } from "../../shared/schema.js";
import { eq, and, lt, gte } from "drizzle-orm";
import { dispatchWebhook } from "./webhookService.js";
import { createPayment } from "./paymentService.js";
import { storage } from "../storage.js";

export interface CreateSubscriptionRequest {
  merchantId: string;
  customerEmail: string;
  customerName?: string;
  amount: string;
  currency?: string;
  interval: "monthly" | "yearly";
  gracePeriodDays?: number;
  metadata?: Record<string, any>;
}

export interface Subscription {
  id: string;
  merchantId: string;
  customerEmail: string;
  customerName: string | null;
  amount: string;
  currency: string;
  interval: "monthly" | "yearly";
  status: "active" | "paused" | "canceled" | "past_due";
  nextBillingAt: Date;
  gracePeriodDays: number;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Calculate next billing date
 */
function calculateNextBillingDate(interval: "monthly" | "yearly"): Date {
  const now = new Date();
  const next = new Date(now);
  
  if (interval === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setFullYear(next.getFullYear() + 1);
  }
  
  return next;
}

/**
 * Create a subscription
 */
export async function createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
  const nextBillingAt = calculateNextBillingDate(request.interval);
  
  const [subscription] = await db
    .insert(subscriptions)
    .values({
      merchantId: request.merchantId,
      customerEmail: request.customerEmail,
      customerName: request.customerName || null,
      amount: request.amount,
      currency: request.currency || "USDC",
      interval: request.interval,
      status: "active",
      nextBillingAt,
      gracePeriodDays: request.gracePeriodDays || 7,
      metadata: request.metadata ? JSON.stringify(request.metadata) : null,
    })
    .returning();

  // Create initial schedule
  await db.insert(subscriptionSchedules).values({
    subscriptionId: subscription.id,
    scheduledAt: nextBillingAt,
    status: "pending",
  });

  // Dispatch webhook
  await dispatchWebhook(request.merchantId, "subscription.created", {
    type: "subscription.created",
    data: {
      id: subscription.id,
      customerEmail: subscription.customerEmail,
      amount: subscription.amount,
      currency: subscription.currency,
      interval: subscription.interval,
      nextBillingAt: subscription.nextBillingAt,
    },
  }).catch(console.error);

  return subscription as Subscription;
}

/**
 * Generate invoice for subscription billing cycle
 * Called by background job
 */
export async function generateSubscriptionInvoice(subscriptionId: string): Promise<void> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription || subscription.status !== "active") {
    return; // Skip inactive subscriptions
  }

  // Check if invoice already exists for this billing period
  const now = new Date();
  const billingPeriodStart = new Date(subscription.nextBillingAt);
  billingPeriodStart.setDate(billingPeriodStart.getDate() - (subscription.interval === "monthly" ? 30 : 365));
  
  const existingInvoices = await db
    .select()
    .from(subscriptionInvoices)
    .where(
      and(
        eq(subscriptionInvoices.subscriptionId, subscriptionId),
        gte(subscriptionInvoices.billingPeriodStart, billingPeriodStart)
      )
    );

  if (existingInvoices.length > 0) {
    return; // Invoice already generated
  }

  // Get merchant wallet
  const merchant = await storage.getMerchant(subscription.merchantId);
  if (!merchant || !merchant.walletAddress) {
    throw new Error("Merchant wallet address not found");
  }

  // Create invoice
  const invoiceNumber = `SUB-${Date.now().toString(36).toUpperCase()}-${subscription.id.slice(0, 8).toUpperCase()}`;
  const invoice = await storage.createInvoice({
    merchantId: subscription.merchantId,
    invoiceNumber,
    amount: subscription.amount,
    currency: subscription.currency,
    customerEmail: subscription.customerEmail,
    customerName: subscription.customerName || null,
    description: `Subscription billing - ${subscription.interval}`,
    status: "sent",
  });

  // Create PaymentIntent for invoice
  const payment = await createPayment({
    merchantId: subscription.merchantId,
    amount: subscription.amount,
    currency: subscription.currency,
    settlementCurrency: subscription.currency,
    description: `Subscription payment - ${invoiceNumber}`,
    customerEmail: subscription.customerEmail,
    merchantWallet: merchant.walletAddress,
    isTest: true, // Match subscription test mode if needed
  });

  // Link invoice to payment
  await storage.updateInvoice(invoice.id, {
    paymentId: payment.id,
  });

  // Create subscription invoice record
  await db.insert(subscriptionInvoices).values({
    subscriptionId: subscription.id,
    invoiceId: invoice.id,
    paymentId: payment.id,
    billingPeriodStart,
    billingPeriodEnd: new Date(subscription.nextBillingAt),
  });

  // Update schedule
  await db
    .update(subscriptionSchedules)
    .set({
      executedAt: now,
      invoiceId: invoice.id,
      status: "executed",
    })
    .where(
      and(
        eq(subscriptionSchedules.subscriptionId, subscriptionId),
        eq(subscriptionSchedules.status, "pending")
      )
    );

  // Schedule next billing
  const nextBillingAt = calculateNextBillingDate(subscription.interval);
  await db
    .update(subscriptions)
    .set({
      nextBillingAt,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, subscriptionId));

  // Create next schedule
  await db.insert(subscriptionSchedules).values({
    subscriptionId: subscription.id,
    scheduledAt: nextBillingAt,
    status: "pending",
  });

  // Dispatch webhook
  await dispatchWebhook(subscription.merchantId, "subscription.invoice_generated", {
    type: "subscription.invoice_generated",
    data: {
      subscriptionId: subscription.id,
      invoiceId: invoice.id,
      paymentId: payment.id,
      amount: subscription.amount,
      currency: subscription.currency,
      nextBillingAt,
    },
  }).catch(console.error);
}

/**
 * Check for past due subscriptions
 */
export async function checkPastDueSubscriptions(): Promise<void> {
  const now = new Date();
  
  // Find subscriptions with unpaid invoices past grace period
  const pastDueSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        lt(subscriptions.nextBillingAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) // 7 days past due
      )
    );

  for (const subscription of pastDueSubscriptions) {
    // Check if invoice is paid
    const recentInvoices = await db
      .select()
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.subscriptionId, subscription.id))
      .orderBy(subscriptionInvoices.createdAt)
      .limit(1);

    if (recentInvoices.length > 0) {
      const invoice = await storage.getInvoice(recentInvoices[0].invoiceId);
      if (invoice && invoice.status === "paid") {
        continue; // Invoice is paid, skip
      }
    }

    // Mark as past_due
    await db
      .update(subscriptions)
      .set({
        status: "past_due",
        updatedAt: now,
      })
      .where(eq(subscriptions.id, subscription.id));

    // Dispatch webhook
    await dispatchWebhook(subscription.merchantId, "subscription.past_due", {
      type: "subscription.past_due",
      data: {
        id: subscription.id,
        customerEmail: subscription.customerEmail,
        amount: subscription.amount,
        currency: subscription.currency,
      },
    }).catch(console.error);
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string, merchantId: string): Promise<Subscription> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.id, subscriptionId),
        eq(subscriptions.merchantId, merchantId)
      )
    )
    .limit(1);

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  const now = new Date();
  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: now,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, subscriptionId));

  const [updated] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  // Dispatch webhook
  await dispatchWebhook(merchantId, "subscription.canceled", {
    type: "subscription.canceled",
    data: {
      id: updated.id,
      customerEmail: updated.customerEmail,
      canceledAt: updated.canceledAt,
    },
  }).catch(console.error);

  return updated as Subscription;
}

/**
 * Get subscriptions for merchant
 */
export async function getSubscriptions(merchantId: string): Promise<Subscription[]> {
  const subs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.merchantId, merchantId))
    .orderBy(subscriptions.createdAt);

  return subs as Subscription[];
}

/**
 * Background job: Process subscription schedules
 */
export async function processSubscriptionSchedules(): Promise<void> {
  const now = new Date();
  
  // Find pending schedules that are due
  const dueSchedules = await db
    .select()
    .from(subscriptionSchedules)
    .where(
      and(
        eq(subscriptionSchedules.status, "pending"),
        lt(subscriptionSchedules.scheduledAt, now)
      )
    );

  for (const schedule of dueSchedules) {
    try {
      await generateSubscriptionInvoice(schedule.subscriptionId);
    } catch (error) {
      console.error(`Failed to generate invoice for subscription ${schedule.subscriptionId}:`, error);
      // Mark schedule as failed
      await db
        .update(subscriptionSchedules)
        .set({ status: "failed" })
        .where(eq(subscriptionSchedules.id, schedule.id));
    }
  }

  // Check for past due subscriptions
  await checkPastDueSubscriptions();
}

