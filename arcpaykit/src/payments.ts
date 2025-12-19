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
  merchantWallet: string;
  expiresInMinutes?: number;
  isTest?: boolean;
  gasSponsored?: boolean;
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
   * Create a new payment
   */
  create(data: CreatePaymentRequest): Promise<CreatePaymentResponse> {
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

