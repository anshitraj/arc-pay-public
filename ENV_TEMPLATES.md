# Environment Variable Templates

## Server Environment Variables

**IMPORTANT:** The server loads environment variables from the **ROOT `.env` file** (not `server/.env`).

Create `.env` in the project root:

```env
DATABASE_URL=postgresql://user:pass@ep-xyz.ap-southeast-1.aws.neon.tech/dbname
PORT=3000
SESSION_SECRET=your-session-secret-here

# ARC Testnet Configuration
ARC_CHAIN_ID=5042002
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_EXPLORER_URL=https://testnet.arcscan.app/tx

# USDC Token (ARC uses USDC as native currency for gas fees)
USDC_TOKEN_ADDRESS=0x3600000000000000000000000000000000000000

# Contract Addresses (set after deployment)
MERCHANT_BADGE_ADDRESS=0x...
INVOICE_PAYMENT_PROOF_ADDRESS=0x...
```

### How to get DATABASE_URL:

1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string from the dashboard
4. Paste it as `DATABASE_URL` in the root `.env` file

---

## Client Environment Variables

Create `client/.env`:

```env
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
VITE_API_URL=http://localhost:3000

# ARC Testnet Configuration
VITE_ARC_CHAIN_ID=5042002
VITE_ARC_RPC_URL=https://rpc.testnet.arc.network
VITE_ARC_EXPLORER_URL=https://testnet.arcscan.app/tx

# USDC Token (ARC uses USDC as native currency for gas fees)
VITE_USDC_TOKEN_ADDRESS=0x3600000000000000000000000000000000000000

# Contract Addresses (set after deployment)
VITE_MERCHANT_BADGE_ADDRESS=0x...
VITE_INVOICE_PAYMENT_PROOF_ADDRESS=0x...
```

### How to get VITE_WALLETCONNECT_PROJECT_ID:

1. Go to [cloud.walletconnect.com](https://cloud.walletconnect.com)
2. Sign in or create an account
3. Create a new project
4. Copy the Project ID
5. Paste it as `VITE_WALLETCONNECT_PROJECT_ID` in `client/.env`

---

## Important Notes

- **Never commit `.env` files to git** - they contain sensitive information
- The `.env` files are in `.gitignore` by default
- Use `.env.example` files as templates (if they exist)
- Restart the dev server after changing environment variables
- **ARC Testnet uses USDC for gas fees** (not ETH) - get testnet USDC from https://faucet.circle.com

---

## Quick Setup Checklist

- [ ] Created root `.env` with `DATABASE_URL` from Neon
- [ ] Created `client/.env` with `VITE_WALLETCONNECT_PROJECT_ID` from WalletConnect
- [ ] Set `PORT=3000` in root `.env` (or use default)
- [ ] Set `SESSION_SECRET` in root `.env` (generate a random string)

