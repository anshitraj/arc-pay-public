import { ArcPayClient } from "./client";

export interface CreatePaymentRequest {
  amount: string;
  currency?: string;
  settlementCurrency?: "USDC" | "EURC";
  paymentAsset?: string;
  paymentChainId?: number;
  conversionPath?: string;
  estimatedFees?: string;
  description?: string;
  customerEmail?: string;
  merchantWallet?: string; // Optional - will use merchant's default wallet if not provided
  expiresInMinutes?: number;
  isTest?: boolean;
  gasSponsored?: boolean;
}

/**
 * Simple payment creation request (happy path)
 * Only requires essential fields - all others are inferred
 */
export interface SimpleCreatePaymentRequest {
  amount: string;
  currency?: string; // Optional, defaults to USDC
  description?: string;
  customerEmail?: string;
}

export interface CreatePaymentResponse {
  id: string;
  status: string;
  checkout_url: string;
  amount: number;
  currency: string;
  merchantWallet: string;
  expiresAt: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  merchantId: string;
  amount: string;
  currency: string;
  settlementCurrency: string;
  paymentAsset?: string;
  paymentChainId?: number;
  conversionPath?: string;
  estimatedFees?: string;
  status: "created" | "pending" | "confirmed" | "failed" | "refunded" | "expired";
  description?: string;
  customerEmail?: string;
  payerWallet?: string;
  merchantWallet: string;
  txHash?: string;
  settlementTime?: number;
  metadata?: string;
  isDemo: boolean;
  isTest: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  explorerLink?: string;
}

export interface ConfirmPaymentRequest {
  paymentId: string;
  txHash: string;
  payerWallet: string;
  customerEmail?: string;
  customerName?: string;
  gasSponsored?: boolean;
}

export interface ConfirmPaymentResponse {
  success: boolean;
  payment: Payment | null;
}

export interface FailPaymentRequest {
  paymentId: string;
  reason?: string;
}

export interface FailPaymentResponse {
  success: boolean;
  payment: Payment;
}

export interface ExpirePaymentRequest {
  paymentId: string;
}

export interface ExpirePaymentResponse {
  success: boolean;
  payment: Payment;
}

export class Payments {
  constructor(private client: ArcPayClient) {}

  /**
   * Create a new payment (happy path - recommended for most users)
   * 
   * This method only requires essential fields. All advanced fields are inferred:
   * - merchantWallet: Uses merchant's default wallet from profile
   * - isTest: Inferred from API key prefix (sk_arc_test_ / sk_arc_live_)
   * - paymentAsset: Defaults to ARC USDC
   * - settlementCurrency: Defaults to USDC
   * - paymentChainId: Inferred automatically
   * 
   * @example
   * ```typescript
   * const payment = await arcpay.payments.create({
   *   amount: "100.00",
   *   currency: "USDC",
   *   description: "Payment for order #123",
   *   customerEmail: "customer@example.com"
   * });
   * ```
   */
  create(data: SimpleCreatePaymentRequest): Promise<CreatePaymentResponse> {
    return this.client.request<CreatePaymentResponse>("/api/payments/create", {
      method: "POST",
      body: JSON.stringify({
        amount: data.amount,
        currency: data.currency || "USDC",
        description: data.description,
        customerEmail: data.customerEmail,
        // All other fields are inferred server-side
      })
    });
  }

  /**
   * Create a new payment with full control (advanced users only)
   * 
   * Most users should use payments.create() instead.
   * This method allows full control over all payment parameters.
   */
  createAdvanced(data: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    return this.client.request<CreatePaymentResponse>("/api/payments/create", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  /**
   * Retrieve a payment by ID
   */
  retrieve(id: string): Promise<Payment> {
    return this.client.request<Payment>(`/api/payments/${id}`);
  }

  /**
   * Submit a transaction hash for a payment
   */
  submitTx(data: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse> {
    return this.client.request<ConfirmPaymentResponse>("/api/payments/submit-tx", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  /**
   * Confirm a payment (legacy endpoint)
   */
  confirm(data: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse> {
    return this.client.request<ConfirmPaymentResponse>("/api/payments/confirm", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  /**
   * Mark a payment as failed
   */
  fail(data: FailPaymentRequest): Promise<FailPaymentResponse> {
    return this.client.request<FailPaymentResponse>("/api/payments/fail", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  /**
   * Expire a payment
   */
  expire(data: ExpirePaymentRequest): Promise<ExpirePaymentResponse> {
    return this.client.request<ExpirePaymentResponse>("/api/payments/expire", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }
}

