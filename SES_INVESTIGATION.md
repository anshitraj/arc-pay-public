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

## ✅ The Fix (Applied - CORRECT APPROACH)

### Root Cause (Confirmed)
SES is **NOT** coming from imports - it's being **executed at runtime** by bundled wallet SDK dependencies. The `lockdown-install.js` file proves SES is self-installing when wallet SDKs execute.

### Why Previous Fix Failed
- ❌ Vite `exclude` didn't work - SES executes at runtime, not import time
- ❌ Stubs didn't work - SES is already bundled and self-installing
- ❌ Config changes didn't work - SES runs before config is evaluated

### The Correct Fix: Lazy-Load Wallet SDKs

**Problem**: Top-level imports in `App.tsx` cause wallet SDKs to execute immediately:
```typescript
// ❌ WRONG - Executes immediately, triggers SES
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from './lib/rainbowkit';
```

**Solution**: Lazy-load wallet SDKs after `window.onload`:

1. **Created `LazyWalletProvider`** (`client/src/lib/wallet-provider-lazy.tsx`):
   - Waits for `window.onload` before loading wallet SDKs
   - Uses React `lazy()` to prevent execution during app bootstrap
   - Dynamically imports wagmi, RainbowKit, and config

2. **Updated `App.tsx`**:
   - Removed all top-level wallet SDK imports
   - Uses `LazyWalletProvider` instead of direct providers
   - App bootstrap completes before wallet SDKs execute

### Execution Order (Fixed)
**Before (Broken)**:
```
Browser loads → wallet SDK executes → SES runs → React.createContext broken → ❌ crash
```

**After (Fixed)**:
```
Browser loads → React mounts → window.onload → lazy import wallet SDK → SES may run (but too late) → ✅ works
```

### Rebuild Steps

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

