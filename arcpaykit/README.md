# arcpaykit

Official ArcPay JavaScript SDK for accepting stablecoin payments.

## Installation

```bash
npm install arcpaykit
```

## Quick Start

```typescript
import { ArcPay } from "arcpaykit";

const arcpay = new ArcPay("your-api-key");

// Create a payment
const payment = await arcpay.payments.create({
  amount: "100.00",
  currency: "USDC",
  merchantWallet: "0x...",
  description: "Payment for order #123"
});

console.log(payment.checkout_url); // Send this URL to your customer

// Retrieve a payment
const retrieved = await arcpay.payments.retrieve(payment.id);
```

## API Reference

### ArcPay

Main SDK class.

#### Constructor

```typescript
new ArcPay(apiKey: string, baseUrl?: string)
```

- `apiKey`: Your ArcPay API key
- `baseUrl`: Optional base URL (defaults to `https://pay.arcpaykit.com`)

### Payments

#### `create(data: CreatePaymentRequest): Promise<CreatePaymentResponse>`

Create a new payment.

**Request:**
```typescript
{
  amount: string;                    // Required: Payment amount
  currency?: string;                 // Optional: Payment currency (default: "USDC")
  settlementCurrency?: "USDC" | "EURC"; // Optional: Settlement currency (default: "USDC")
  paymentAsset?: string;              // Optional: Specific asset identifier
  paymentChainId?: number;           // Optional: Chain ID for payment
  conversionPath?: string;            // Optional: Conversion path JSON
  estimatedFees?: string;            // Optional: Estimated fees
  description?: string;              // Optional: Payment description
  customerEmail?: string;            // Optional: Customer email
  merchantWallet: string;             // Required: Merchant wallet address
  expiresInMinutes?: number;         // Optional: Expiration time in minutes
  isTest?: boolean;                  // Optional: Test mode flag
  gasSponsored?: boolean;            // Optional: Gas sponsorship preference
}
```

**Response:**
```typescript
{
  id: string;
  status: string;
  checkout_url: string;
  amount: number;
  currency: string;
  merchantWallet: string;
  expiresAt: string;
  createdAt: string;
}
```

#### `retrieve(id: string): Promise<Payment>`

Retrieve a payment by ID.

#### `submitTx(data: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse>`

Submit a transaction hash for a payment.

**Request:**
```typescript
{
  paymentId: string;        // Required
  txHash: string;           // Required: Transaction hash
  payerWallet: string;      // Required: Payer wallet address
  customerEmail?: string;   // Optional
  customerName?: string;    // Optional
  gasSponsored?: boolean;  // Optional
}
```

#### `confirm(data: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse>`

Confirm a payment (legacy endpoint).

#### `fail(data: FailPaymentRequest): Promise<FailPaymentResponse>`

Mark a payment as failed.

**Request:**
```typescript
{
  paymentId: string;  // Required
  reason?: string;    // Optional failure reason
}
```

#### `expire(data: ExpirePaymentRequest): Promise<ExpirePaymentResponse>`

Expire a payment.

**Request:**
```typescript
{
  paymentId: string;  // Required
}
```

## Examples

### Create and Track a Payment

```typescript
import { ArcPay } from "arcpaykit";

const arcpay = new ArcPay(process.env.ARCPAY_API_KEY!);

// Create payment
const payment = await arcpay.payments.create({
  amount: "50.00",
  currency: "USDC",
  merchantWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  description: "Monthly subscription",
  customerEmail: "customer@example.com",
  expiresInMinutes: 30
});

console.log(`Payment created: ${payment.id}`);
console.log(`Checkout URL: ${payment.checkout_url}`);

// Later, check payment status
const status = await arcpay.payments.retrieve(payment.id);
console.log(`Payment status: ${status.status}`);
```

### Using Custom Base URL

```typescript
const arcpay = new ArcPay(
  "your-api-key",
  "https://staging.arcpaykit.com"
);
```

## Error Handling

The SDK throws errors for failed requests:

```typescript
try {
  const payment = await arcpay.payments.create({...});
} catch (error) {
  console.error("Payment creation failed:", error.message);
}
```

## REST API

The SDK is a thin wrapper around the ArcPay REST API. You can also use the REST API directly if needed. See the [ArcPay API documentation](https://docs.arcpaykit.com) for more details.

## License

MIT

