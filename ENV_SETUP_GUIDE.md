# Environment Variables Setup Guide

## ✅ Answer to Your Questions

### 1. **How Many ENV Files Are Required?**

You need **2 `.env` files**:

1. **Root `.env`** (at `e:\arc\gateway\.env`) - for **SERVER** configuration
2. **`client/.env`** (at `e:\arc\gateway\client\.env`) - for **CLIENT** configuration

### 2. **Where Should ENV Files Be Located?**

- ✅ **Root `.env`** - Server loads from here (NOT `server/.env`)
- ✅ **`client/.env`** - Client (Vite) loads from here automatically

**Important:** The server code (`server/index.ts`, `server/db.ts`) loads from the **root `.env` file**, not from `server/.env`. The documentation has been updated to reflect this.

### 3. **Is Your ENV Correct?**

Based on the image you showed, your root `.env` has:
- ✅ `DATABASE_URL` - Looks correct (Neon PostgreSQL connection)
- ✅ `PORT=3000` - Correct
- ⚠️ `SESSION_SECRET=your-secret-heres` - **This is a placeholder!** You need to change this to a random secret string.

**You also need to verify your `client/.env` file exists and has the required variables.**

### 4. **Where to Deploy Contracts?**

Deploy contracts to **ARC Testnet** (Chain ID: 5042002)

**Network Details:**
- RPC URL: `https://rpc.testnet.arc.network`
- Chain ID: `5042002`
- Explorer: `https://testnet.arcscan.app`
- **Currency:** USDC (used for gas fees, not ETH)
- **Faucet:** https://faucet.circle.com

See `CONTRACT_DEPLOYMENT.md` for detailed deployment instructions.

---

## 📋 Complete Environment Setup

### Root `.env` (Server Configuration)

Location: `e:\arc\gateway\.env`

```env
# Database Configuration
DATABASE_URL=postgresql://neondb_owner:npg_pV7FOhJS4zWe@ep-little-sea-a4qdb8bj-po.../neondb

# Server Configuration
PORT=3000
SESSION_SECRET=CHANGE-THIS-TO-A-RANDOM-SECRET-STRING

# ARC Testnet Configuration
ARC_CHAIN_ID=5042002
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_EXPLORER_URL=https://testnet.arcscan.app/tx

# Contract Addresses (set after deployment)
MERCHANT_BADGE_ADDRESS=0x...
INVOICE_PAYMENT_PROOF_ADDRESS=0x...
```

**⚠️ Action Required:**
- Replace `SESSION_SECRET` with a random string (e.g., use `openssl rand -hex 32` or generate online)
- Add contract addresses after deploying contracts

### `client/.env` (Client Configuration)

Location: `e:\arc\gateway\client\.env`

```env
# WalletConnect Configuration
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here

# API Configuration
VITE_API_URL=http://localhost:3000

# ARC Testnet Configuration
VITE_ARC_CHAIN_ID=5042002
VITE_ARC_RPC_URL=https://rpc.testnet.arc.network
VITE_ARC_EXPLORER_URL=https://testnet.arcscan.app/tx

# Contract Addresses (set after deployment)
VITE_MERCHANT_BADGE_ADDRESS=0x...
VITE_INVOICE_PAYMENT_PROOF_ADDRESS=0x...
```

**⚠️ Action Required:**
- Get `VITE_WALLETCONNECT_PROJECT_ID` from [cloud.walletconnect.com](https://cloud.walletconnect.com)
- Add contract addresses after deploying contracts

---

## 🚀 Contract Deployment

### Quick Steps:

1. **Install Hardhat or Foundry** (see `CONTRACT_DEPLOYMENT.md`)

2. **Deploy to ARC Testnet:**
   - Network: ARC Testnet
   - Chain ID: 5042002
   - RPC: `https://rpc.testnet.arc.network`
   - **Note:** ARC uses USDC for gas fees (not ETH)

3. **After Deployment:**
   - Copy contract addresses
   - Add to root `.env` (without `VITE_` prefix)
   - Add to `client/.env` (with `VITE_` prefix)

### Contracts to Deploy:

1. **MerchantBadge.sol** → `MERCHANT_BADGE_ADDRESS`
2. **InvoicePaymentProof.sol** → `INVOICE_PAYMENT_PROOF_ADDRESS`

---

## ✅ Verification Checklist

- [ ] Root `.env` exists with `DATABASE_URL`, `PORT`, `SESSION_SECRET`
- [ ] `SESSION_SECRET` is changed from placeholder to random string
- [ ] `client/.env` exists with `VITE_WALLETCONNECT_PROJECT_ID`
- [ ] Both files have ARC Testnet configuration (Chain ID: 5042002)
- [ ] Contract addresses added after deployment (if contracts are deployed)

---

## 🔍 How to Verify Your Setup

### Check Server ENV:
```bash
# The server loads from root .env
# Check that server/index.ts loads: resolve(projectRoot, ".env")
```

### Check Client ENV:
```bash
# Vite automatically loads from client/.env
# Variables must start with VITE_ to be exposed to client
```

---

## 📚 Additional Resources

- `ENV_TEMPLATES.md` - Detailed templates
- `CONTRACT_DEPLOYMENT.md` - Contract deployment guide
- `DEVELOPMENT_STATUS.md` - Current project status
