/**
 * Lazy Wallet Provider
 * 
 * This component lazy-loads wallet SDKs to prevent SES from executing
 * before the app bootstrap completes. Wallet SDKs are only loaded after:
 * 1. window.onload completes
 * 2. User interaction (login/connect button)
 * 
 * This prevents SES (lockdown-install.js) from breaking React.createContext
 * and other JavaScript intrinsics that wallet SDKs need.
 */

import { lazy, Suspense, useEffect, useState, ReactNode } from "react";
import { Loader2 } from "lucide-react";

// Lazy load wallet providers - they will NOT execute until imported
// This prevents SES from executing during app bootstrap
const WagmiProviderLazy = lazy(() => 
  import('wagmi').then(mod => ({ default: mod.WagmiProvider }))
);

const RainbowKitProviderLazy = lazy(() => 
  import('@rainbow-me/rainbowkit').then(mod => {
    // Also lazy-load styles
    import('@rainbow-me/rainbowkit/styles.css').catch(() => {});
    return { default: mod.RainbowKitProvider };
  })
);

// Lazy load config - this imports wagmi/rainbowkit internally
// Must be loaded dynamically to prevent SES from executing early
const loadConfig = () => import('./rainbowkit').then(mod => mod.config);

interface LazyWalletProviderProps {
  children: ReactNode;
}

/**
 * LazyWalletProvider - Only loads wallet SDKs after page load
 * 
 * This prevents SES from executing before React mounts, which breaks
 * wallet SDKs that need normal JavaScript intrinsics.
 */
export function LazyWalletProvider({ children }: LazyWalletProviderProps) {
  const [walletReady, setWalletReady] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // Only load wallet SDKs after window.onload completes
    // This ensures React and app bootstrap complete first
    const loadWallet = async () => {
      // Wait for page to be fully loaded
      if (document.readyState !== 'complete') {
        const handleLoad = () => {
          window.removeEventListener('load', handleLoad);
          initializeWallet();
        };
        window.addEventListener('load', handleLoad);
        return;
      }
      
      // Page already loaded, initialize immediately
      initializeWallet();
    };

    const initializeWallet = async () => {
      try {
        // Dynamic import prevents SES from executing during app bootstrap
        const configModule = await loadConfig();
        setConfig(configModule);
        setWalletReady(true);
      } catch (error) {
        console.error('Failed to load wallet SDK:', error);
        // Continue without wallet functionality
        setWalletReady(true);
      }
    };

    loadWallet();
  }, []);

  // Show loading state until wallet SDKs are ready
  if (!walletReady || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Now lazy-load the providers
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <WagmiProviderLazy config={config}>
        <RainbowKitProviderLazy
          walletList={(wallets) => {
            // Filter out hardware wallets that require device access (USB/Bluetooth)
            return wallets.filter((wallet) => {
              const walletId = wallet.id?.toLowerCase() || '';
              const walletName = wallet.name?.toLowerCase() || '';
              
              const hardwareWalletIds = ['ledger', 'safe', 'trezor', 'keystone', 'ledgerHid', 'ledgerLive'];
              const isHardwareWallet = hardwareWalletIds.some((hwId) => 
                walletId.includes(hwId) || walletName.includes(hwId)
              );
              
              return !isHardwareWallet;
            });
          }}
        >
          {children}
        </RainbowKitProviderLazy>
      </WagmiProviderLazy>
    </Suspense>
  );
}

