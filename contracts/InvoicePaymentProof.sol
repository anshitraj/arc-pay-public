// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title InvoicePaymentProof
 * @notice Minimal contract to record payment proofs on-chain
 * @dev Write-once per paymentId, no funds handled, owner-only writes
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

    // Event emitted when a payment proof is recorded
    event PaymentProofRecorded(
        string indexed paymentId,
        address indexed merchant,
        address indexed payer,
        uint256 amount,
        string currency,
        bytes32 txHash,
        uint256 timestamp
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Record a payment proof (write-once, owner-only)
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
        require(!_proofs[paymentId].exists, "InvoicePaymentProof: paymentId already recorded");

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

        emit PaymentProofRecorded(
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
     * @notice Get payment proof for a paymentId
     * @param paymentId The payment identifier
     * @return proof Payment proof data
     */
    function getProof(string memory paymentId) external view returns (PaymentProof memory) {
        require(_proofs[paymentId].exists, "InvoicePaymentProof: proof not found");
        return _proofs[paymentId];
    }

    /**
     * @notice Check if a proof exists for a paymentId
     * @param paymentId The payment identifier
     * @return true if proof exists
     */
    function proofExists(string memory paymentId) external view returns (bool) {
        return _proofs[paymentId].exists;
    }
}
