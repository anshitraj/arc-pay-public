# ARC Pay Smart Contracts

This directory contains the smart contracts for the ARC Pay payment gateway. These contracts are designed to be audited and deployed publicly.

## Contracts

### InvoicePaymentProof.sol
Minimal contract for recording payment receipts on-chain. Provides immutable proof of payment.

**Purpose**: Record payment proofs for invoice payments, creating an on-chain audit trail.

**Roles**:
- `owner`: Can record payment proofs via `recordProof()`
- Public: Can read proofs via `getProof()` and `proofExists()`

**Upgradeability**: Not upgradeable (immutable contract)

**Events**:
- `PaymentProofRecorded(string indexed paymentId, address indexed merchant, address indexed payer, uint256 amount, string currency, bytes32 txHash, uint256 timestamp)`

**Key Functions**:
- `recordProof(...)`: Owner-only function to record a payment proof (write-once per paymentId)
- `getProof(string paymentId)`: Public view function to retrieve a payment proof
- `proofExists(string paymentId)`: Public view function to check if a proof exists

**Security Assumptions**:
- Only the owner (gateway backend) can record proofs
- Each paymentId can only be recorded once (write-once)
- No funds are handled by this contract
- All inputs are validated (non-zero addresses, non-empty paymentId, valid txHash)

### MerchantBadge.sol
Non-transferable Soulbound Token (SBT) for verified merchants. Merchants become eligible after completing verification.

**Purpose**: Issue non-transferable badges to verified merchants as proof of verification status.

**Roles**:
- `owner`: Can set base URI for token metadata
- Merchants: Can mint their own badge (one per address)

**Upgradeability**: Not upgradeable (immutable contract)

**Events**:
- `MerchantBadgeMinted(address indexed merchant, uint256 indexed tokenId)`

**Key Functions**:
- `mint(address merchant)`: Merchant can mint their own badge (one per address)
- `getBadgeTokenId(address merchant)`: Get token ID for a merchant
- `hasBadge(address merchant)`: Check if merchant has a badge
- `setBaseURI(string baseTokenURI)`: Owner-only function to set metadata base URI

**Security Assumptions**:
- Tokens are non-transferable (all transfer functions revert)
- Each address can only mint one badge
- Merchants can only mint to themselves (msg.sender == merchant)

### PaymentRegistry.sol
Minimal payment registry for emitting payment events. Non-custodial - contract never holds funds.

**Purpose**: Emit events for payment creation and confirmation, providing an on-chain event log.

**Roles**:
- Public: Anyone can call `createPayment()` and `confirmPayment()`

**Upgradeability**: Not upgradeable (immutable contract)

**Events**:
- `PaymentCreated(string indexed paymentId, address indexed merchant, uint256 amount, string currency)`
- `PaymentConfirmed(string indexed paymentId, address indexed payer, bytes32 indexed txHash)`

**Key Functions**:
- `createPayment(...)`: Emit payment creation event
- `confirmPayment(...)`: Record payment confirmation with transaction hash
- `getPaymentTxHash(string paymentId)`: Get transaction hash for a payment

**Security Assumptions**:
- Non-custodial - contract never holds funds
- Events are informational only
- No access control (anyone can emit events)

## Deployment

### Prerequisites
- Foundry installed (`forge --version`)
- Private key with testnet ETH/USDC for deployment
- Environment variables set:
  - `ARC_TESTNET_RPC_URL`: RPC endpoint for ARC testnet
  - `PRIVATE_KEY`: Private key for deployment (without 0x prefix)

### Testnet Deployment

1. **Deploy InvoicePaymentProof**:
   ```bash
   forge script script/DeployInvoicePaymentProof.s.sol:DeployInvoicePaymentProof --rpc-url $ARC_TESTNET_RPC_URL --broadcast --verify
   ```

2. **Deploy MerchantBadge**:
   ```bash
   forge script script/DeployMerchantBadge.s.sol:DeployMerchantBadge --rpc-url $ARC_TESTNET_RPC_URL --broadcast --verify
   ```

3. **Deploy PaymentRegistry** (optional):
   ```bash
   forge script script/DeployPaymentRegistry.s.sol:DeployPaymentRegistry --rpc-url $ARC_TESTNET_RPC_URL --broadcast --verify
   ```

### Mainnet Deployment

⚠️ **WARNING**: Only deploy to mainnet after thorough testing and security audits.

1. Update `foundry.toml` with mainnet RPC URL
2. Use mainnet private key (stored securely)
3. Deploy with verification:
   ```bash
   forge script script/DeployInvoicePaymentProof.s.sol:DeployInvoicePaymentProof --rpc-url $ARC_MAINNET_RPC_URL --broadcast --verify
   ```

## Testing

Run all tests:
```bash
forge test
```

Run tests with verbosity:
```bash
forge test -vvv
```

Run specific test:
```bash
forge test --match-test testRecordProof
```

## Audit Notes

### Invariants
1. **InvoicePaymentProof**: Each paymentId can only be recorded once
2. **MerchantBadge**: Each address can only have one badge, badges are non-transferable
3. **PaymentRegistry**: Events are informational only, no funds are handled

### Known Limitations
- InvoicePaymentProof requires owner to record proofs (centralized control)
- MerchantBadge allows self-minting (merchants can mint their own badges)
- PaymentRegistry has no access control (anyone can emit events)

### Audit Scope
- Contract logic and access control
- Event emissions and data integrity
- Gas optimization
- Reentrancy protection (not applicable - no external calls with funds)

### Out of Scope
- Off-chain backend logic
- Frontend integration
- Database schema
- API endpoints

## License

MIT License - See LICENSE file in this directory.
