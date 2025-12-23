# Production Environment Variables Setup

## 🔧 Required Environment Variables for Production

### Essential Variables (Must Have)

#### Database
- `DATABASE_URL` - PostgreSQL connection string
  ```
  postgresql://user:password@host:port/database?sslmode=require
  ```

#### Session & Security
- `SESSION_SECRET` - Random secret for session encryption
  ```bash
  # Generate with: openssl rand -base64 32
  ```

#### ARC Blockchain Configuration
- `ARC_CHAIN_ID` - ARC chain ID (default: `5042002` for testnet, `5042001` for mainnet)
- `ARC_RPC_URL` - ARC RPC endpoint
  - Testnet: `https://rpc.testnet.arc.network`
  - Mainnet: `https://rpc.arc.network`
- `ARC_EXPLORER_URL` - ARC explorer URL
  - Testnet: `https://testnet.arcscan.app`
  - Mainnet: `https://arcscan.app`

#### Smart Contract Addresses
- `MERCHANT_BADGE_ADDRESS` - Deployed MerchantBadge contract address
- `INVOICE_PAYMENT_PROOF_ADDRESS` - Deployed InvoicePaymentProof contract address
- `PAYMENT_REGISTRY_ADDRESS` - (Optional) PaymentRegistry contract address

#### Application Settings
- `DEMO_MODE` - Set to `false` for production ⚠️ **IMPORTANT**
- `BASE_URL` - Your production URL (e.g., `https://your-app.vercel.app`)
- `NODE_ENV` - Set to `production`
- `ALLOW_SELF_SIGNED_CERTS` - Set to `false` for production (or omit)

#### Admin Configuration
- `ADMIN_WALLET` - Admin wallet address for initial admin user setup

### Client Environment Variables (VITE_ prefix)

These must be prefixed with `VITE_` to be exposed to the client:

- `VITE_WALLETCONNECT_PROJECT_ID` - WalletConnect Project ID
- `VITE_API_URL` - Backend API URL (should match your BASE_URL)
- `VITE_ARC_CHAIN_ID` - ARC chain ID (should match server ARC_CHAIN_ID)
- `VITE_ARC_RPC_URL` - ARC RPC endpoint (should match server ARC_RPC_URL)
- `VITE_ARC_EXPLORER_URL` - ARC explorer URL (should match server ARC_EXPLORER_URL)
- `VITE_MERCHANT_BADGE_ADDRESS` - MerchantBadge contract address
- `VITE_INVOICE_PAYMENT_PROOF_ADDRESS` - InvoicePaymentProof contract address
- `VITE_USDC_TOKEN_ADDRESS` - USDC token address (default: `0x3600000000000000000000000000000000000000`)

### Optional Variables

- `USDC_TOKEN_ADDRESS` - USDC token address (default provided)
- `PRIVATE_KEY` - Private key for contract interactions (only if needed)
- `ARC_API` - ARC API key if using ARC API services
- `SUBSCRIPTIONS_ENABLED` - Enable subscriptions (default: true)
- `PAYOUTS_ENABLED` - Enable payouts (default: true)
- `FEES_AND_SPLITS_ENABLED` - Enable fees and splits (default: true)

## 📋 Quick Setup Checklist

### In Vercel Dashboard:

1. **Go to**: Project → Settings → Environment Variables

2. **Add all required variables** (see list above)

3. **Important settings for production**:
   - ✅ `DEMO_MODE=false` (critical!)
   - ✅ `NODE_ENV=production`
   - ✅ `BASE_URL=https://your-app.vercel.app`
   - ✅ `ALLOW_SELF_SIGNED_CERTS=false` (or omit)

4. **After adding variables**:
   - Redeploy your application
   - Variables are applied on next deployment

## 🔐 Security Notes

- Never commit `.env` files to git
- Use strong, random `SESSION_SECRET`
- Keep contract addresses and private keys secure
- Use environment-specific values (testnet vs mainnet)

## 🚀 Recent Changes Requiring Updates

### SSL Certificate Handling
- Added support for self-signed certificates in development
- Production should use proper SSL certificates
- Set `ALLOW_SELF_SIGNED_CERTS=false` or omit in production

### Badge Verification
- Enhanced verification checks with SSL error handling
- Merchant status auto-updates when verified
- No additional env vars needed

### Payment Links
- Fixed routing for `/checkout/:id` paths
- No additional env vars needed

## 📝 Example Production .env

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Session
SESSION_SECRET=your-generated-random-secret-here

# ARC Blockchain (Mainnet)
ARC_CHAIN_ID=5042001
ARC_RPC_URL=https://rpc.arc.network
ARC_EXPLORER_URL=https://arcscan.app

# Smart Contracts
MERCHANT_BADGE_ADDRESS=0x...
INVOICE_PAYMENT_PROOF_ADDRESS=0x...

# Application
DEMO_MODE=false
BASE_URL=https://your-app.vercel.app
NODE_ENV=production

# Admin
ADMIN_WALLET=0x...

# Client (VITE_ prefix)
VITE_WALLETCONNECT_PROJECT_ID=your-project-id
VITE_API_URL=https://your-app.vercel.app
VITE_ARC_CHAIN_ID=5042001
VITE_ARC_RPC_URL=https://rpc.arc.network
VITE_ARC_EXPLORER_URL=https://arcscan.app
VITE_MERCHANT_BADGE_ADDRESS=0x...
VITE_INVOICE_PAYMENT_PROOF_ADDRESS=0x...
VITE_USDC_TOKEN_ADDRESS=0x3600000000000000000000000000000000000000
```

## ✅ Verification Steps

After deployment:
1. Check that `DEMO_MODE=false` is set
2. Verify all contract addresses are correct
3. Test payment creation
4. Test badge verification
5. Check SSL certificate errors are resolved
6. Verify payment links work correctly

