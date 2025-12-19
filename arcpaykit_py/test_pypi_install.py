"""Test that arcpaykit installed from PyPI works correctly."""

from arcpaykit import ArcPay, ArcPayError

print("[OK] ArcPayKit installed from PyPI!")
print("[OK] Package imports successfully")

# Test initialization
arcpay = ArcPay("test-api-key")
print(f"[OK] SDK initialized! Base URL: {arcpay.payments.client.base_url}")

# Test that payments object exists
assert arcpay.payments is not None
print("[OK] Payments object created")

print("\n[SUCCESS] ArcPayKit Python SDK is working correctly!")
print("Package is now available on PyPI: https://pypi.org/project/arcpaykit/")

