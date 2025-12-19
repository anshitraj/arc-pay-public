"""
Simple tests for ArcPayKit Python SDK.
Run with: python test_arcpaykit.py
"""

import sys
from arcpaykit import ArcPay, ArcPayError

def test_import():
    """Test that the package can be imported."""
    print("[OK] Package imports successfully")
    return True

def test_initialization():
    """Test that ArcPay can be initialized."""
    try:
        arcpay = ArcPay("test-api-key")
        assert arcpay.payments is not None
        print("[OK] ArcPay initializes correctly")
        return True
    except Exception as e:
        print(f"[FAIL] Failed to initialize ArcPay: {e}")
        return False

def test_custom_base_url():
    """Test that custom base URL works."""
    try:
        arcpay = ArcPay("test-api-key", base_url="http://localhost:3000")
        assert arcpay.payments.client.base_url == "http://localhost:3000"
        print("[OK] Custom base URL works")
        return True
    except Exception as e:
        print(f"[FAIL] Custom base URL test failed: {e}")
        return False

def run_tests():
    """Run all tests."""
    print("Running ArcPayKit Python SDK tests...\n")
    
    tests = [
        test_import,
        test_initialization,
        test_custom_base_url,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"[FAIL] Test {test.__name__} raised exception: {e}")
            failed += 1
        print()
    
    print(f"Results: {passed} passed, {failed} failed")
    
    if failed > 0:
        sys.exit(1)
    else:
        print("All tests passed! [OK]")
        return 0

if __name__ == "__main__":
    run_tests()

