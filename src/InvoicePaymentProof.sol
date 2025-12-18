// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title InvoicePaymentProof
 * @notice Non-custodial payment proof registry for invoice payments
 * @dev Write-once per paymentId, no funds handled, event-driven
 */
contract InvoicePaymentProof is Ownable {
    // Struct to store payment proof data
    struct PaymentProof {
        string paymentId;
        address merchant;
        address payer;
        uint256 amount;
        string currency;
        bytes32 txHash;
        uint256 timestamp;
        bool exists;
    }

    // Mapping: paymentId -> PaymentProof
    mapping(string => PaymentProof) private _proofs;
    
    // Mapping: paymentId -> exists (for duplicate prevention)
    mapping(string => bool) private _paymentIdExists;

    // Event emitted when a payment proof is created
    event PaymentCreated(
        string indexed paymentId,
        address indexed merchant,
        address indexed payer,
        uint256 amount,
        string currency,
        bytes32 txHash,
        uint256 timestamp
    );

    // Event emitted when a payment proof is confirmed
    event PaymentConfirmed(
        string indexed paymentId,
        bytes32 indexed txHash,
        uint256 timestamp
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Record a payment proof (owner only, write-once)
     * @param paymentId Unique payment identifier
     * @param merchant Merchant wallet address
     * @param payer Payer wallet address
     * @param amount Payment amount
     * @param currency Currency symbol (e.g., "USDC")
     * @param txHash Transaction hash of the payment
     */
    function recordProof(
        string memory paymentId,
        address merchant,
        address payer,
        uint256 amount,
        string memory currency,
        bytes32 txHash
    ) external onlyOwner {
        require(bytes(paymentId).length > 0, "InvoicePaymentProof: invalid paymentId");
        require(merchant != address(0), "InvoicePaymentProof: invalid merchant");
        require(payer != address(0), "InvoicePaymentProof: invalid payer");
        require(txHash != bytes32(0), "InvoicePaymentProof: invalid txHash");
        require(!_paymentIdExists[paymentId], "InvoicePaymentProof: paymentId already exists");

        PaymentProof memory proof = PaymentProof({
            paymentId: paymentId,
            merchant: merchant,
            payer: payer,
            amount: amount,
            currency: currency,
            txHash: txHash,
            timestamp: block.timestamp,
            exists: true
        });

        _proofs[paymentId] = proof;
        _paymentIdExists[paymentId] = true;

        emit PaymentCreated(
            paymentId,
            merchant,
            payer,
            amount,
            currency,
            txHash,
            block.timestamp
        );
    }

    /**
     * @notice Confirm a payment proof (owner only)
     * @param paymentId Payment identifier
     * @param txHash Confirmation transaction hash
     */
    function confirmPayment(
        string memory paymentId,
        bytes32 txHash
    ) external onlyOwner {
        require(_paymentIdExists[paymentId], "InvoicePaymentProof: payment not found");
        require(txHash != bytes32(0), "InvoicePaymentProof: invalid txHash");
        
        emit PaymentConfirmed(
            paymentId,
            txHash,
            block.timestamp
        );
    }

    /**
     * @notice Get payment proof for a paymentId
     * @param paymentId Payment identifier
     * @return proof Payment proof data
     */
    function getProof(string memory paymentId) external view returns (PaymentProof memory) {
        require(_paymentIdExists[paymentId], "InvoicePaymentProof: proof not found");
        return _proofs[paymentId];
    }

    /**
     * @notice Check if a proof exists for a paymentId
     * @param paymentId Payment identifier
     * @return true if proof exists
     */
    function proofExists(string memory paymentId) external view returns (bool) {
        return _paymentIdExists[paymentId];
    }

    /**
     * @notice Get transaction hash for a paymentId
     * @param paymentId Payment identifier
     * @return txHash Transaction hash
     */
    function getTxHash(string memory paymentId) external view returns (bytes32) {
        require(_paymentIdExists[paymentId], "InvoicePaymentProof: proof not found");
        return _proofs[paymentId].txHash;
    }
}

