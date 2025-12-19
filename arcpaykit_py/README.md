# arcpaykit

Official ArcPay Python SDK for accepting stablecoin payments.

## Installation

```bash
pip install arcpaykit
```

## Quick Start

```python
from arcpaykit import ArcPay

# Initialize the client
arcpay = ArcPay("your-api-key")

# Create a payment
payment = arcpay.payments.create(
    amount="100.00",
    currency="USDC",
    merchant_wallet="0x...",
    description="Payment for order #123"
)

print(payment["checkout_url"])  # Send this URL to your customer

# Retrieve a payment
retrieved = arcpay.payments.retrieve(payment["id"])
```

## API Reference

### ArcPay

Main SDK class.

#### Constructor

```python
ArcPay(api_key: str, base_url: str = "https://pay.arcpaykit.com")
```

- `api_key`: Your ArcPay API key
- `base_url`: Optional base URL (defaults to `https://pay.arcpaykit.com`)

### Payments

#### `create(...) -> dict`

Create a new payment.

**Parameters:**
- `amount` (str, required): Payment amount (e.g., "100.00")
- `merchant_wallet` (str, required): Merchant wallet address
- `currency` (str, optional): Payment currency (default: "USDC")
- `settlement_currency` (str, optional): Settlement currency ("USDC" or "EURC")
- `payment_asset` (str, optional): Specific asset identifier
- `payment_chain_id` (int, optional): Chain ID for payment
- `conversion_path` (str, optional): Conversion path JSON string
- `estimated_fees` (str, optional): Estimated fees
- `description` (str, optional): Payment description
- `customer_email` (str, optional): Customer email address
- `expires_in_minutes` (int, optional): Expiration time in minutes
- `is_test` (bool, optional): Test mode flag
- `gas_sponsored` (bool, optional): Gas sponsorship preference

**Returns:**
```python
{
    "id": "pay_...",
    "status": "pending",
    "checkout_url": "https://pay.arcpaykit.com/checkout/pay_...",
    "amount": 100.00,
    "currency": "USDC",
    "merchantWallet": "0x...",
    "expiresAt": "2024-...",
    "createdAt": "2024-..."
}
```

#### `retrieve(payment_id: str) -> dict`

Retrieve a payment by ID.

#### `submit_tx(...) -> dict`

Submit a transaction hash for a payment.

**Parameters:**
- `payment_id` (str, required): Payment ID
- `tx_hash` (str, required): Transaction hash
- `payer_wallet` (str, required): Payer wallet address
- `customer_email` (str, optional): Customer email
- `customer_name` (str, optional): Customer name
- `gas_sponsored` (bool, optional): Gas sponsorship preference

#### `confirm(...) -> dict`

Confirm a payment (legacy endpoint).

#### `fail(payment_id: str, reason: str = None) -> dict`

Mark a payment as failed.

#### `expire(payment_id: str) -> dict`

Expire a payment.

## Examples

### Create and Track a Payment

```python
from arcpaykit import ArcPay
import os

# Initialize with API key from environment
arcpay = ArcPay(os.getenv("ARCPAY_API_KEY"))

# Create payment
payment = arcpay.payments.create(
    amount="50.00",
    currency="USDC",
    merchant_wallet="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    description="Monthly subscription",
    customer_email="customer@example.com",
    expires_in_minutes=30
)

print(f"Payment created: {payment['id']}")
print(f"Checkout URL: {payment['checkout_url']}")

# Later, check payment status
status = arcpay.payments.retrieve(payment["id"])
print(f"Payment status: {status['status']}")
```

### Using Custom Base URL

```python
arcpay = ArcPay(
    "your-api-key",
    base_url="https://staging.arcpaykit.com"
)
```

### Error Handling

The SDK raises `ArcPayError` for failed requests:

```python
from arcpaykit import ArcPay, ArcPayError

try:
    payment = arcpay.payments.create(...)
except ArcPayError as e:
    print(f"Payment creation failed: {e}")
```

## REST API

The SDK is a thin wrapper around the ArcPay REST API. You can also use the REST API directly if needed. See the [ArcPay API documentation](https://docs.arcpaykit.com) for more details.

## License

MIT

