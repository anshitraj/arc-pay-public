/**
 * LazyRainbowKit - Loads RainbowKit/wagmi ONLY when needed
 * 
 * CRITICAL: This component must NOT be imported in App.tsx or main.tsx
 * Use it ONLY on pages that need wallet functionality (Login, Checkout, etc.)
 * 
 * This prevents SES from executing during app bootstrap, which breaks React.createContext
 */

import { useEffect, useState, ReactNode } from 'react';

type Props = { children: ReactNode };

export default function LazyRainbowKit({ children }: Props) {
  const [WalletTree, setWalletTree] = useState<null | React.FC<Props>>(null);

  useEffect(() => {
    const load = async () => {
      // Dynamic imports - wagmi/RainbowKit only load when this function executes
      const wagmi = await import('wagmi');
      const rainbow = await import('@rainbow-me/rainbowkit');
      
      // Lazy-load styles
      import('@rainbow-me/rainbowkit/styles.css').catch(() => {});

      const { WagmiProvider } = wagmi;
      const { RainbowKitProvider } = rainbow;

      // IMPORTANT: Import wagmi config dynamically (it also imports wagmi/rainbowkit)
      const { config } = await import('./rainbowkit');

      setWalletTree(() => ({ children }) => (
        <WagmiProvider config={config}>
          <RainbowKitProvider
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
          </RainbowKitProvider>
        </WagmiProvider>
      ));
    };

    // 🔑 CRITICAL: Delay until after full page load
    // This ensures React finishes initializing before wallet SDKs execute
    if (document.readyState === 'complete') {
      load();
    } else {
      window.addEventListener('load', load, { once: true });
    }
  }, []);

  // Before wallet loads → render children normally (no wallet functionality)
  if (!WalletTree) return <>{children}</>;

  return <WalletTree>{children}</WalletTree>;
}

