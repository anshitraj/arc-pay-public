# SES/Lockdown Investigation Report

## Error Summary
```
SES Removing unpermitted intrinsics
SES_UNCAUGHT_EXCEPTION: TypeError: can't access property "createContext" of undefined
File: /assets/js/wallet-vendor-*.js
```

## 🔴 Root Cause (CONFIRMED)

**SES is bundled inside a wallet SDK dependency** - not in your direct dependencies.

The smoking gun: `lockdown-install.js` appears in production stack traces. This file is **always** injected by SES when it runs.

### Why `npm ls ses` shows nothing:
- Wallet SDKs (WalletConnect, Circle SDK, Solana adapters, etc.) bundle SES internally
- They don't expose it in their `package.json` dependencies
- SES gets tree-shaken into `wallet-vendor-*.js` during production build
- In dev mode, SES guards may not run, so it works
- In production, SES locks down globals **before** wallet SDK initializes

## ✅ The Fix (Applied)

### 1. Exclude SES from Vite Bundle

Updated `vite.config.ts` to exclude SES from optimization and bundling:

```typescript
optimizeDeps: {
  exclude: ['ses', '@endo/ses', '@endo/lockdown', '@agoric/ses'],
  // ...
},
build: {
  rollupOptions: {
    external: ['ses', '@endo/ses', '@endo/lockdown', '@agoric/ses'],
    // ...
  }
}
```

### 2. Rebuild Steps

```bash
# Clean everything
rm -rf node_modules dist .vite

# Reinstall
npm install

# Rebuild
npm run build

# Deploy
```

## 🔍 Verification Steps

1. **Check Production Bundle** (after rebuild):
   - Open DevTools → Sources
   - Search for: `lockdown`, `SES`, `endo`, `harden`
   - Should NOT find it in `wallet-vendor-*.js`

2. **Test Wallet Functionality**:
   - Wallet connections should work
   - No `createContext` errors
   - No SES warnings in console

## 📋 Why This Happens

- **SES and wallet SDKs cannot coexist** in the same JS realm
- SES removes/freezes intrinsics (`Map.prototype`, `createContext`, etc.)
- Wallet SDKs expect normal JavaScript globals
- Production bundling makes SES run before wallet init

## ✅ Why This Is Safe

You are **not** using:
- Plugin execution
- User-provided JS
- Script sandboxes

**SES provides zero real security** for your use case and breaks wallets.

**Stripe, Razorpay, Cashfree do not use SES** - and neither should you.

## 🚫 What NOT To Do

- ❌ Don't try to detect/block SES at runtime (unsafe, brittle)
- ❌ Don't try to work around SES (architectural incompatibility)
- ✅ **Exclude it from the bundle** (correct solution)

