"""
Example usage of the ArcPayKit Python SDK.
"""

from arcpaykit import ArcPay
import os

# Initialize the client
# Replace with your actual API key
api_key = os.getenv("ARCPAY_API_KEY", "your-api-key-here")
arcpay = ArcPay(api_key)

# Example 1: Create a payment
print("Creating a payment...")
try:
    payment = arcpay.payments.create(
        amount="100.00",
        currency="USDC",
        merchant_wallet="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        description="Example payment",
        customer_email="customer@example.com",
        expires_in_minutes=30
    )
    print(f"Payment created: {payment['id']}")
    print(f"Checkout URL: {payment['checkout_url']}")
    print(f"Status: {payment['status']}")
except Exception as e:
    print(f"Error creating payment: {e}")

# Example 2: Retrieve a payment
# Uncomment and replace with actual payment ID
# print("\nRetrieving payment...")
# try:
#     payment_id = "pay_..."
#     retrieved = arcpay.payments.retrieve(payment_id)
#     print(f"Payment status: {retrieved['status']}")
#     print(f"Amount: {retrieved['amount']} {retrieved['currency']}")
# except Exception as e:
#     print(f"Error retrieving payment: {e}")

# Example 3: Using custom base URL (for development/staging)
# arcpay_dev = ArcPay(
#     api_key,
#     base_url="http://localhost:3000"
# )

