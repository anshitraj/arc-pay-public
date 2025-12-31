// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {InvoicePaymentProof} from "../InvoicePaymentProof.sol";

contract InvoicePaymentProofTest is Test {
    InvoicePaymentProof public proof;
    address public owner;
    address public merchant;
    address public payer;

    function setUp() public {
        owner = address(this);
        merchant = address(0x1);
        payer = address(0x2);
        
        proof = new InvoicePaymentProof(owner);
    }

    function testRecordProof() public {
        string memory paymentId = "test-payment-1";
        uint256 amount = 1000;
        string memory currency = "USDC";
        bytes32 txHash = keccak256("test-tx");

        proof.recordProof(paymentId, merchant, payer, amount, currency, txHash);

        InvoicePaymentProof.PaymentProof memory recorded = proof.getProof(paymentId);
        assertEq(recorded.paymentId, paymentId);
        assertEq(recorded.merchant, merchant);
        assertEq(recorded.payer, payer);
        assertEq(recorded.amount, amount);
        assertEq(recorded.currency, currency);
        assertEq(recorded.txHash, txHash);
        assertTrue(recorded.exists);
    }

    function testProofExists() public {
        string memory paymentId = "test-payment-2";
        bytes32 txHash = keccak256("test-tx-2");

        assertFalse(proof.proofExists(paymentId));

        proof.recordProof(paymentId, merchant, payer, 1000, "USDC", txHash);

        assertTrue(proof.proofExists(paymentId));
    }

    function testCannotRecordDuplicatePaymentId() public {
        string memory paymentId = "duplicate-payment";
        bytes32 txHash = keccak256("test-tx");

        proof.recordProof(paymentId, merchant, payer, 1000, "USDC", txHash);

        vm.expectRevert("InvoicePaymentProof: paymentId already recorded");
        proof.recordProof(paymentId, merchant, payer, 2000, "USDC", txHash);
    }

    function testCannotRecordWithInvalidPaymentId() public {
        string memory emptyPaymentId = "";
        bytes32 txHash = keccak256("test-tx");

        vm.expectRevert("InvoicePaymentProof: invalid paymentId");
        proof.recordProof(emptyPaymentId, merchant, payer, 1000, "USDC", txHash);
    }

    function testCannotRecordWithZeroAddress() public {
        string memory paymentId = "test-payment";
        bytes32 txHash = keccak256("test-tx");

        vm.expectRevert("InvoicePaymentProof: invalid merchant");
        proof.recordProof(paymentId, address(0), payer, 1000, "USDC", txHash);

        vm.expectRevert("InvoicePaymentProof: invalid payer");
        proof.recordProof(paymentId, merchant, address(0), 1000, "USDC", txHash);
    }

    function testCannotRecordWithZeroTxHash() public {
        string memory paymentId = "test-payment";
        bytes32 zeroHash = bytes32(0);

        vm.expectRevert("InvoicePaymentProof: invalid txHash");
        proof.recordProof(paymentId, merchant, payer, 1000, "USDC", zeroHash);
    }

    function testOnlyOwnerCanRecord() public {
        string memory paymentId = "test-payment";
        bytes32 txHash = keccak256("test-tx");
        address nonOwner = address(0x999);

        vm.prank(nonOwner);
        vm.expectRevert();
        proof.recordProof(paymentId, merchant, payer, 1000, "USDC", txHash);
    }

    function testGetProofRevertsIfNotExists() public {
        string memory paymentId = "non-existent";

        vm.expectRevert("InvoicePaymentProof: proof not found");
        proof.getProof(paymentId);
    }
}
