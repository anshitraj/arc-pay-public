/**
 * Core Validation
 * Public-safe validation schemas using Zod
 */

import { z } from "zod";

export const createPaymentIntentSchema = z.object({
  amount: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Amount must be a positive number"
  ),
  currency: z.string().optional().default("USDC"),
  settlementCurrency: z.enum(["USDC", "EURC", "USYC"]).default("USDC"),
  paymentAsset: z.string().optional(),
  paymentChainId: z.coerce.number().int().optional(),
  conversionPath: z.string().optional(),
  estimatedFees: z.string().optional(),
  description: z.string().optional(),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("").transform(() => undefined)),
  expiresInMinutes: z.coerce.number().int().positive().optional(),
  isTest: z.coerce.boolean().optional(),
  gasSponsored: z.coerce.boolean().optional().default(false),
  merchantFeePercentage: z.coerce.number().min(0).max(100).optional(),
  idempotencyKey: z.string().optional(),
});

export const paymentIdSchema = z.object({
  id: z.string().uuid("Invalid payment ID format"),
});

export const webhookEventSchema = z.object({
  type: z.enum([
    "payment.created",
    "payment.confirmed",
    "payment.succeeded",
    "payment.failed",
    "payment.refunded",
    "payment.intent.created",
    "payment.intent.pending",
    "payment.intent.completed",
    "payment.intent.failed",
  ]),
  data: z.record(z.unknown()),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type PaymentIdInput = z.infer<typeof paymentIdSchema>;
export type WebhookEventInput = z.infer<typeof webhookEventSchema>;
