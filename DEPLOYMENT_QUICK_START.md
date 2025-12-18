# Contract Deployment Quick Start

## Prerequisites

1. ✅ Hardhat installed (already done)
2. ✅ Contracts ready in `contracts/` folder
3. ⚠️ **You need a wallet with ARC Testnet ETH for gas fees**

## Step 1: Get Your Private Key

**⚠️ SECURITY WARNING:** Never commit your private key to git!

1. Export your wallet's private key (from MetaMask, etc.)
2. Add it to your root `.env` file:

```env
PRIVATE_KEY=your_private_key_here_without_0x_prefix
```

**OR** if you prefer to set it temporarily:

```powershell
$env:PRIVATE_KEY="your_private_key_here"
```

## Step 2: Get ARC Testnet USDC

**Important:** ARC Testnet uses **USDC for gas fees**, not ETH!

You need testnet USDC to pay for gas fees. Get it from:
- ARC Testnet Faucet: https://faucet.circle.com
- USDC is the native currency on ARC Testnet

## Step 3: Verify Your .env Configuration

Make sure your root `.env` has:

```env
# ARC Testnet Configuration
ARC_CHAIN_ID=5042002
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_EXPLORER_URL=https://testnet.arcscan.app

# Your deployer private key (for deployment)
PRIVATE_KEY=your_private_key_here

# Optional: IPFS base URI for MerchantBadge metadata
MERCHANT_BADGE_BASE_URI=ipfs://QmPlaceholder/
```

**Note:** The code now defaults to the correct Chain ID `5042002` for ARC Testnet.

## Step 4: Compile Contracts

```bash
npm run compile
```

This will compile your Solidity contracts and check for errors.

## Step 5: Deploy Contracts

### Option A: Deploy All Contracts at Once (Recommended)

```bash
npm run deploy:all
```

This will deploy both contracts and show you the addresses.

### Option B: Deploy Individually

```bash
# Deploy MerchantBadge only
npm run deploy:badge

# Deploy InvoicePaymentProof only
npm run deploy:proof
```

## Step 6: Update Your .env Files

After deployment, the script will show you the contract addresses. Add them to:

### Root `.env` (server):
```env
MERCHANT_BADGE_ADDRESS=0x...
INVOICE_PAYMENT_PROOF_ADDRESS=0x...
```

### `client/.env`:
```env
VITE_MERCHANT_BADGE_ADDRESS=0x...
VITE_INVOICE_PAYMENT_PROOF_ADDRESS=0x...
```

## Step 7: Verify Deployment

1. Check the explorer links provided by the deployment script
2. Verify the contracts are deployed correctly
3. Test the contracts if needed

## Troubleshooting

### Error: "insufficient funds"
- You need ARC Testnet USDC in your deployer wallet (ARC uses USDC for gas fees, not ETH)
- Get testnet USDC from the faucet: https://faucet.circle.com

### Error: "nonce too high"
- Your wallet has pending transactions
- Wait for them to confirm or reset your nonce

### Error: "network mismatch"
- Check your `ARC_CHAIN_ID` in `.env`
- Verify the RPC URL is correct

### Error: "private key not set"
- Make sure `PRIVATE_KEY` is in your root `.env` file
- Or set it as an environment variable

## What's Next?

After deployment:
1. ✅ Update `.env` files with contract addresses
2. ✅ Restart your dev server: `npm run dev`
3. ✅ Test badge minting functionality
4. ✅ Test proof recording functionality

## Security Reminders

- ⚠️ Never commit `.env` files to git
- ⚠️ Never share your private key
- ⚠️ Use a separate wallet for testnet deployments
- ⚠️ Consider using a hardware wallet for mainnet
