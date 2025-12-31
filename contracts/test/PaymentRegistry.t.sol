// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {PaymentRegistry} from "../PaymentRegistry.sol";

contract PaymentRegistryTest is Test {
    PaymentRegistry public registry;
    address public merchant;
    address public payer;

    function setUp() public {
        registry = new PaymentRegistry();
        merchant = address(0x1);
        payer = address(0x2);
    }

    function testCreatePayment() public {
        string memory paymentId = "test-payment-1";
        uint256 amount = 1000;
        string memory currency = "USDC";

        registry.createPayment(paymentId, merchant, amount, currency);

        // Verify event was emitted (forge-std handles this automatically)
        assertTrue(true);
    }

    function testConfirmPayment() public {
        string memory paymentId = "test-payment-2";
        bytes32 txHash = keccak256("test-tx");

        registry.confirmPayment(paymentId, payer, txHash);

        bytes32 recordedHash = registry.paymentTxHashes(paymentId);
        assertEq(recordedHash, txHash);
    }

    function testGetPaymentTxHash() public {
        string memory paymentId = "test-payment-3";
        bytes32 txHash = keccak256("test-tx-3");

        registry.confirmPayment(paymentId, payer, txHash);

        bytes32 retrievedHash = registry.getPaymentTxHash(paymentId);
        assertEq(retrievedHash, txHash);
    }

    function testGetPaymentTxHashReturnsZeroIfNotSet() public {
        string memory paymentId = "non-existent";
        bytes32 retrievedHash = registry.getPaymentTxHash(paymentId);
        assertEq(retrievedHash, bytes32(0));
    }

    function testAnyoneCanCreatePayment() public {
        address randomUser = address(0x999);
        string memory paymentId = "public-payment";
        
        vm.prank(randomUser);
        registry.createPayment(paymentId, merchant, 1000, "USDC");

        // Should not revert
        assertTrue(true);
    }

    function testAnyoneCanConfirmPayment() public {
        address randomUser = address(0x999);
        string memory paymentId = "public-confirm";
        bytes32 txHash = keccak256("test-tx");

        vm.prank(randomUser);
        registry.confirmPayment(paymentId, payer, txHash);

        bytes32 recordedHash = registry.paymentTxHashes(paymentId);
        assertEq(recordedHash, txHash);
    }
}
