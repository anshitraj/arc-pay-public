# Smart Contract Deployment Guide

This guide explains how to deploy the on-chain proof layer contracts to ARC Testnet.

## Contracts

1. **MerchantBadge.sol** - Non-transferable SBT for verified merchants
2. **InvoicePaymentProof.sol** - Minimal contract for recording payment proofs

## Prerequisites

- Node.js and npm/yarn
- Hardhat or Foundry (for compilation and deployment)
- Wallet with ARC Testnet USDC for gas fees (ARC uses USDC as native currency, not ETH)
- Access to ARC Testnet RPC

## Deployment Steps

### Option 1: Using Hardhat

1. **Install dependencies:**
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
```

2. **Create `hardhat.config.js`:**
```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    arcTestnet: {
      url: "https://rpc.testnet.arc.network",
      chainId: 5042002,
      accounts: [process.env.PRIVATE_KEY] // Your deployer private key
    }
  }
};
```

3. **Deploy MerchantBadge:**
```javascript
// scripts/deploy-merchant-badge.js
const hre = require("hardhat");

async function main() {
  const MerchantBadge = await hre.ethers.getContractFactory("MerchantBadge");
  const badge = await MerchantBadge.deploy(
    "ARC Verified Merchant",
    "ARCMERCHANT",
    "ipfs://QmYourMetadataHash/" // IPFS metadata base URI
  );
  
  await badge.waitForDeployment();
  console.log("MerchantBadge deployed to:", await badge.getAddress());
}

main().catch(console.error);
```

4. **Deploy InvoicePaymentProof:**
```javascript
// scripts/deploy-invoice-proof.js
const hre = require("hardhat");

async function main() {
  const InvoicePaymentProof = await hre.ethers.getContractFactory("InvoicePaymentProof");
  const proof = await InvoicePaymentProof.deploy();
  
  await proof.waitForDeployment();
  console.log("InvoicePaymentProof deployed to:", await proof.getAddress());
}

main().catch(console.error);
```

### Option 2: Using Foundry

1. **Install Foundry:**
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. **Initialize project:**
```bash
forge init --no-git
forge install OpenZeppelin/openzeppelin-contracts
```

3. **Deploy contracts:**
```bash
# Deploy MerchantBadge
forge create contracts/MerchantBadge.sol:MerchantBadge \
  --rpc-url https://rpc.testnet.arc.network \
  --private-key $PRIVATE_KEY \
  --constructor-args "ARC Verified Merchant" "ARCMERCHANT" "ipfs://QmYourMetadataHash/"

# Deploy InvoicePaymentProof
forge create contracts/InvoicePaymentProof.sol:InvoicePaymentProof \
  --rpc-url https://rpc.testnet.arc.network \
  --private-key $PRIVATE_KEY
```

## Post-Deployment

After deployment, update your environment variables:

### Server `.env`:
```env
MERCHANT_BADGE_ADDRESS=0x...
INVOICE_PAYMENT_PROOF_ADDRESS=0x...
```

### Client `.env`:
```env
VITE_MERCHANT_BADGE_ADDRESS=0x...
VITE_INVOICE_PAYMENT_PROOF_ADDRESS=0x...
```

## IPFS Metadata

For the Merchant Badge, you need to create IPFS metadata:

1. Create `metadata.json`:
```json
{
  "name": "ARC Verified Merchant",
  "description": "Non-transferable badge proving verified merchant status on ARC Testnet",
  "image": "ipfs://QmYourImageHash",
  "attributes": [
    {
      "trait_type": "Status",
      "value": "Verified"
    }
  ]
}
```

2. Upload to IPFS (using Pinata, NFT.Storage, or similar)

3. Use the base URI in the contract deployment (e.g., `ipfs://QmYourMetadataHash/`)

## Contract Ownership

**Important:** The MerchantBadge contract requires an owner to mint badges. After deployment:

1. Transfer ownership to a secure multisig or admin wallet
2. Or keep the deployer wallet secure for minting operations

The InvoicePaymentProof contract has no owner restrictions - anyone can call `recordProof`.

## Verification

After deployment, verify contracts on ARC Explorer:

1. Go to https://testnet.arcscan.app
2. Find your contract address
3. Verify and publish source code (if explorer supports it)

## Testing

Test the contracts before using in production:

1. Test badge minting with a test merchant address
2. Test proof recording with sample data
3. Verify events are emitted correctly
4. Check that badge is non-transferable

## Security Notes

- Never commit private keys to git
- Use environment variables for sensitive data
- Test thoroughly on testnet before mainnet deployment
- Consider using a multisig for contract ownership
- Review contract code before deployment
