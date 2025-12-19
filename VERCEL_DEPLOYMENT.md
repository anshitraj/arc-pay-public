# Vercel Deployment Guide

## 📋 Quick Reference: Required Environment Variables

### Essential (Must Have)
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Random secret for sessions
- `VITE_WALLETCONNECT_PROJECT_ID` - WalletConnect Project ID
- `VITE_API_URL` - Your Vercel deployment URL
- `MERCHANT_BADGE_ADDRESS` - Deployed contract address
- `INVOICE_PAYMENT_PROOF_ADDRESS` - Deployed contract address
- `ADMIN_WALLET` - Admin wallet address

### Recommended
- `DEMO_MODE=false` - Set to false for production
- `BASE_URL` - Your production URL
- All `VITE_*` variables matching server config

See full list below ⬇️

---

## Quick Setup

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   Follow the prompts. For production, use:
   ```bash
   vercel --prod
   ```

## Environment Variables

Add these environment variables in your Vercel project settings (Dashboard → Project → Settings → Environment Variables):

### Required Server Environment Variables

#### Database
- `DATABASE_URL` - PostgreSQL connection string
  ```
  postgresql://user:password@host:port/database
  ```
  Example (Neon): `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require`

#### Session & Security
- `SESSION_SECRET` - Secret key for session encryption (generate a random string)
  ```
  openssl rand -base64 32
  ```

#### ARC Blockchain Configuration
- `ARC_CHAIN_ID` - ARC chain ID (default: `5042002` for testnet)
- `ARC_RPC_URL` - ARC RPC endpoint (default: `https://rpc.testnet.arc.network`)
- `ARC_EXPLORER_URL` - ARC explorer URL (default: `https://testnet.arcscan.app`)
- `ARC_API` - (Optional) ARC API key if using ARC API services

#### Smart Contract Addresses
- `MERCHANT_BADGE_ADDRESS` - Deployed MerchantBadge contract address
- `INVOICE_PAYMENT_PROOF_ADDRESS` - Deployed InvoicePaymentProof contract address
- `PAYMENT_REGISTRY_ADDRESS` - (Optional) PaymentRegistry contract address

#### Token Configuration
- `USDC_TOKEN_ADDRESS` - USDC token address (default: `0x3600000000000000000000000000000000000000`)

#### Application Settings
- `DEMO_MODE` - Set to `false` for production (default: `true`)
- `BASE_URL` - Your production URL (e.g., `https://your-app.vercel.app`)
- `PORT` - Server port (Vercel sets this automatically, but you can override)

#### Admin Configuration
- `ADMIN_WALLET` - Admin wallet address for initial admin user setup

#### Private Key (Optional - for contract interactions)
- `PRIVATE_KEY` - Private key for contract interactions (only if you need automated contract calls)

### Required Client Environment Variables (VITE_ prefix)

These must be prefixed with `VITE_` to be exposed to the client:

- `VITE_WALLETCONNECT_PROJECT_ID` - WalletConnect Project ID ([Get one here](https://cloud.walletconnect.com))
- `VITE_API_URL` - Backend API URL (use your Vercel URL: `https://your-app.vercel.app`)
- `VITE_ARC_CHAIN_ID` - ARC chain ID (should match server: `5042002`)
- `VITE_ARC_RPC_URL` - ARC RPC endpoint
- `VITE_ARC_EXPLORER_URL` - ARC explorer URL
- `VITE_MERCHANT_BADGE_ADDRESS` - MerchantBadge contract address
- `VITE_INVOICE_PAYMENT_PROOF_ADDRESS` - InvoicePaymentProof contract address
- `VITE_USDC_TOKEN_ADDRESS` - USDC token address

## Complete Environment Variables List

### Copy this into Vercel Environment Variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Session
SESSION_SECRET=your-random-secret-key-here

# ARC Blockchain
ARC_CHAIN_ID=5042002
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_EXPLORER_URL=https://testnet.arcscan.app

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
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
VITE_API_URL=https://your-app.vercel.app
VITE_ARC_CHAIN_ID=5042002
VITE_ARC_RPC_URL=https://rpc.testnet.arc.network
VITE_ARC_EXPLORER_URL=https://testnet.arcscan.app
VITE_MERCHANT_BADGE_ADDRESS=0x...
VITE_INVOICE_PAYMENT_PROOF_ADDRESS=0x...
VITE_USDC_TOKEN_ADDRESS=0x3600000000000000000000000000000000000000
```

## Build Configuration

Vercel will automatically:
1. Run `npm install`
2. Run `npm run build` (which builds both client and server)
3. Serve the application

The `vercel.json` file configures:
- API routes (`/api/*`) to go to the serverless function at `/api/index.ts`
- All other routes to serve the static client build from `dist/public`
- The Express app is exported as a serverless function handler

## Post-Deployment Steps

1. **Set up your database**:
   - Create a PostgreSQL database (recommended: [Neon](https://neon.tech))
   - Run migrations: `npm run db:push` (or use Vercel CLI)

2. **Verify environment variables**:
   - Check that all variables are set in Vercel dashboard
   - Ensure `BASE_URL` matches your Vercel deployment URL

3. **Test the deployment**:
   - Visit your Vercel URL
   - Test API endpoints
   - Test wallet connection
   - Test payment flow

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18+ by default)

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database allows connections from Vercel IPs
- Ensure SSL is enabled for production databases
- **Important**: Sessions are now stored in PostgreSQL (not memory), so database must be accessible

### Authentication/Login Fails (500 Error)
**Common causes:**
1. **Missing `DATABASE_URL`**: The app requires a PostgreSQL database. Sessions are stored in the database.
2. **Database not accessible**: Check that your database allows connections from Vercel's IP ranges
3. **Missing `SESSION_SECRET`**: Required for session encryption
4. **Database connection timeout**: Increase connection timeout in your database provider settings

**To fix:**
- Verify `DATABASE_URL` is set in Vercel environment variables
- Ensure database is running and accessible
- Check Vercel function logs for detailed error messages
- The session table will be auto-created on first use

### Client Can't Connect to API
- Verify `VITE_API_URL` matches your Vercel deployment URL
- Check CORS settings if needed
- Ensure cookies are enabled (required for session-based auth)

### Environment Variables Not Working
- Ensure client variables have `VITE_` prefix
- Redeploy after adding new environment variables
- Check variable names match exactly (case-sensitive)

## Production Checklist

- [ ] Set `DEMO_MODE=false`
- [ ] Set secure `SESSION_SECRET`
- [ ] Configure production database
- [ ] Set `BASE_URL` to production URL
- [ ] Deploy smart contracts and set addresses
- [ ] Configure WalletConnect Project ID
- [ ] Test all payment flows
- [ ] Set up monitoring/logging
- [ ] Configure custom domain (optional)

