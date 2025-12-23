# arcpaykit

Official ArcPay JavaScript SDK for accepting stablecoin payments.

## Installation

```bash
npm install arcpaykit
```

## Quick Start

Get started in 5 minutes:

```typescript
import { ArcPay } from "arcpaykit";

const arcpay = new ArcPay("your-api-key");

// Create a payment (happy path - recommended)
const payment = await arcpay.payments.create({
  amount: "100.00",
  currency: "USDC",
  description: "Payment for order #123",
  customerEmail: "customer@example.com"
});

// Redirect customer to checkout
console.log(payment.checkout_url); // https://pay.arcpaykit.com/checkout/pay_...

// That's it! ArcPay handles:
// - Merchant wallet (uses your default)
// - Test/live mode (inferred from API key)
// - Payment chain (inferred automatically)
// - Settlement currency (defaults to USDC)
```

**No need to configure:**
- ❌ Merchant wallet (uses your default)
- ❌ Test/live mode (inferred from API key: `sk_arc_test_` vs `sk_arc_live_`)
- ❌ Payment chain ID (inferred automatically)
- ❌ Settlement currency (defaults to USDC)

For advanced use cases, see `payments.createAdvanced()` below.

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

#### `create(data: SimpleCreatePaymentRequest): Promise<CreatePaymentResponse>`

Create a new payment (happy path - recommended for most users).

**Most users should use this method.** It only requires essential fields. All advanced fields are inferred automatically.

**Request:**
```typescript
{
  amount: string;              // Required: Payment amount (e.g., "100.00")
  currency?: string;          // Optional: Payment currency (default: "USDC")
  description?: string;       // Optional: Payment description
  customerEmail?: string;     // Optional: Customer email
}
```

**Example:**
```typescript
const payment = await arcpay.payments.create({
  amount: "100.00",
  currency: "USDC",
  description: "Order #123",
  customerEmail: "customer@example.com"
});
```

#### `createAdvanced(data: CreatePaymentRequest): Promise<CreatePaymentResponse>`

Create a new payment with full control (advanced users only).

**Most users should use `payments.create()` instead.** This method allows full control over all payment parameters.

**Request:**
```typescript
{
  amount: string;                    // Required: Payment amount
  merchantWallet?: string;            // Optional: Merchant wallet (uses default if not provided)
  currency?: string;                 // Optional: Payment currency (default: "USDC")
  settlementCurrency?: "USDC" | "EURC"; // Optional: Settlement currency (default: "USDC")
  paymentAsset?: string;              // Optional: Specific asset identifier
  paymentChainId?: number;           // Optional: Chain ID for payment
  conversionPath?: string;            // Optional: Conversion path JSON
  estimatedFees?: string;            // Optional: Estimated fees
  description?: string;              // Optional: Payment description
  customerEmail?: string;            // Optional: Customer email
  expiresInMinutes?: number;         // Optional: Expiration time in minutes
  isTest?: boolean;                  // Optional: Test mode flag (inferred from API key if not provided)
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

// Create payment (simple - recommended)
const payment = await arcpay.payments.create({
  amount: "50.00",
  currency: "USDC",
  description: "Monthly subscription",
  customerEmail: "customer@example.com"
});

console.log(`Payment created: ${payment.id}`);
console.log(`Checkout URL: ${payment.checkout_url}`);

// Redirect customer
window.location.href = payment.checkout_url;

// Later, check payment status
const status = await arcpay.payments.retrieve(payment.id);
console.log(`Payment status: ${status.status}`);
```

### Advanced Payment Creation

For full control over payment parameters:

```typescript
const payment = await arcpay.payments.createAdvanced({
  amount: "50.00",
  merchantWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  currency: "USDC",
  settlementCurrency: "EURC",
  paymentAsset: "USDC_BASE",
  paymentChainId: 8453,
  description: "Monthly subscription",
  customerEmail: "customer@example.com",
  expiresInMinutes: 30,
  isTest: false,
  gasSponsored: true
});
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

