/**
 * Core Types
 * Public-safe type definitions for payment intents, merchants, and webhook events
 */

export interface PaymentIntent {
  id: string;
  merchantId: string;
  amount: string;
  currency: string;
  settlementCurrency: "USDC" | "EURC" | "USYC";
  paymentAsset?: string;
  paymentChainId?: number;
  conversionPath?: string;
  estimatedFees?: string;
  status: "created" | "pending" | "confirmed" | "failed" | "refunded" | "expired";
  description?: string;
  customerEmail?: string;
  payerWallet?: string;
  merchantWallet?: string;
  txHash?: string;
  settlementTime?: number;
  metadata?: string;
  idempotencyKey?: string;
  isTest: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Merchant {
  id: string;
  userId: string;
  name: string;
  apiKey: string;
  webhookSecret: string;
  walletAddress?: string;
  logoUrl?: string;
  status: "demo" | "pending_verification" | "verified";
  createdAt: Date;
}

export interface WebhookEvent {
  type: 
    | "payment.created"
    | "payment.confirmed"
    | "payment.succeeded"
    | "payment.failed"
    | "payment.refunded"
    | "payment.intent.created"
    | "payment.intent.pending"
    | "payment.intent.completed"
    | "payment.intent.failed";
  data: Record<string, unknown>;
  timestamp: string;
}

export interface CreatePaymentIntentRequest {
  amount: string;
  currency?: string;
  settlementCurrency?: "USDC" | "EURC" | "USYC";
  paymentAsset?: string;
  paymentChainId?: number;
  conversionPath?: string;
  estimatedFees?: string;
  description?: string;
  customerEmail?: string;
  expiresInMinutes?: number;
  isTest?: boolean;
  gasSponsored?: boolean;
  merchantFeePercentage?: number;
  idempotencyKey?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  details?: unknown;
}
