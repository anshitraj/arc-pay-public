import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { mainnet, sepolia, base, baseSepolia } from 'wagmi/chains';

// ARC Testnet configuration
const arcTestnet = {
  id: parseInt(import.meta.env.VITE_ARC_CHAIN_ID || '5042002', 10),
  name: 'ARC Testnet',
  nativeCurrency: {
    decimals: 6, // USDC uses 6 decimals
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_ARC_RPC_URL || 'https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ARC Explorer',
      url: import.meta.env.VITE_ARC_EXPLORER_URL || 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
} as const;

// ARC Mainnet configuration
const arcMainnet = {
  id: 5042001,
  name: 'ARC Network',
  nativeCurrency: {
    decimals: 6,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ARC Explorer',
      url: 'https://arcscan.app',
    },
  },
  testnet: false,
} as const;

// Get WalletConnect Project ID
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  console.warn(
    'VITE_WALLETCONNECT_PROJECT_ID is not set. WalletConnect features will not work. ' +
    'Get a project ID from https://cloud.walletconnect.com'
  );
}

// Configure RainbowKit with browser-only wallets
// Hardware wallets (Ledger, Safe, etc.) are excluded via walletList filter in RainbowKitProvider
// This prevents the browser from requesting local network device access permission
export const config = getDefaultConfig({
  appName: 'ArcPayKit',
  projectId: projectId || '00000000000000000000000000000000', // Fallback to prevent errors
  chains: [arcTestnet, arcMainnet, baseSepolia, base, mainnet, sepolia], // All supported chains
  ssr: false, // If your dApp uses server-side rendering (SSR)
  autoConnect: false, // Disable auto-connect to prevent wallets from auto-connecting
  transports: {
    [arcTestnet.id]: http(),
    [arcMainnet.id]: http(),
    [baseSepolia.id]: http(),
    [base.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

