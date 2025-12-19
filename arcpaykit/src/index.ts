import { ArcPayClient } from "./client";
import { Payments } from "./payments";

export class ArcPay {
  payments: Payments;

  constructor(apiKey: string, baseUrl?: string) {
    const client = new ArcPayClient(apiKey, baseUrl);
    this.payments = new Payments(client);
  }
}

// Export types
export type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  Payment,
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
  FailPaymentRequest,
  FailPaymentResponse,
  ExpirePaymentRequest,
  ExpirePaymentResponse,
} from "./payments";

// Default export
export default ArcPay;

