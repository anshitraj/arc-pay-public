/**
 * Bridge Service
 * Handles cross-chain bridging using Circle CCTP (Cross-Chain Transfer Protocol)
 * Supports USDC and EURC canonical burn-and-mint bridging
 * 
 * CCTP Flow:
 * 1. Burn USDC on source chain via TokenMessenger.depositForBurn()
 * 2. Wait for Circle Attestation Service to attest to the burn
 * 3. Mint USDC on destination chain via MessageTransmitter.receiveMessage()
 * 
 * Fast Transfer: Uses Circle's Fast Transfer Allowance for faster-than-finality transfers (~30s)
 * Standard Transfer: Waits for hard finality (~15-30 minutes)
 */

import { createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { base, baseSepolia, mainnet, sepolia } from 'viem/chains';
import { estimateCCTPBridge, supportsCCTP as cctpSupports } from './cctpService.js';

// Circle CCTP contract addresses (testnet)
const CCTP_TESTNET_CONFIG = {
  // Base Sepolia (testnet)
  baseSepolia: {
    tokenMessenger: '0x9f3B8679C73C2Fef8b59B4f3444d4e156fb70AA5' as `0x${string}`,
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
    eurc: null as `0x${string}` | null, // EURC may not be available on testnet
  },
  // Sepolia (testnet)
  sepolia: {
    tokenMessenger: '0x9f3B8679C73C2Fef8b59B4f3444d4e156fb70AA5' as `0x${string}`,
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`,
    eurc: null as `0x${string}` | null,
  },
};

// Circle CCTP contract addresses (mainnet)
const CCTP_MAINNET_CONFIG = {
  base: {
    tokenMessenger: '0x1682Ae6375C4E4A97e4B583BC4cB31Cc3a3b2c6e' as `0x${string}`,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
    eurc: '0x1aBaEA1f7C830bD89Acc67eC4f5164b1b3905C3c' as `0x${string}`,
  },
  mainnet: {
    tokenMessenger: '0xbd3fa81B58Ba92a82136038B25aDec7066af3155' as `0x${string}`,
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}`,
    eurc: '0x1aBaEA1f7C830bD89Acc67eC4f5164b1b3905C3c' as `0x${string}`,
  },
};

// ARC chain ID (testnet and mainnet)
const ARC_TESTNET_CHAIN_ID = 5042002;
const ARC_MAINNET_CHAIN_ID = 5042001; // Update with actual mainnet chain ID

export interface BridgeRequest {
  amount: string;
  currency: 'USDC' | 'EURC';
  fromChainId: number;
  toChainId: number;
  fromAddress: `0x${string}`;
  toAddress: `0x${string}`;
  isTestnet?: boolean;
}

export interface BridgeEstimate {
  estimatedTime: number; // seconds
  estimatedFees: string; // in settlement currency
  steps: string[];
}

/**
 * Get CCTP configuration for a chain
 */
function getCCTPConfig(chainId: number, isTestnet: boolean) {
  if (isTestnet) {
    if (chainId === baseSepolia.id) return CCTP_TESTNET_CONFIG.baseSepolia;
    if (chainId === sepolia.id) return CCTP_TESTNET_CONFIG.sepolia;
  } else {
    if (chainId === base.id) return CCTP_MAINNET_CONFIG.base;
    if (chainId === mainnet.id) return CCTP_MAINNET_CONFIG.mainnet;
  }
  return null;
}

/**
 * Estimate bridge time and fees
 */
export async function estimateBridge(request: BridgeRequest): Promise<BridgeEstimate> {
  const isTestnet = request.isTestnet ?? true;
  const arcChainId = isTestnet ? ARC_TESTNET_CHAIN_ID : ARC_MAINNET_CHAIN_ID;
  const fromIsArc = request.fromChainId === arcChainId;
  const toIsArc = request.toChainId === arcChainId;

  // Determine which chain has CCTP support (for burn/mint operations)
  const cctpChainId = fromIsArc ? request.toChainId : request.fromChainId;
  const config = getCCTPConfig(cctpChainId, isTestnet);

  if (!config) {
    throw new Error(`CCTP not supported for this bridge route`);
  }

  // Use CCTP service to estimate bridge time and fees
  // Fast Transfer enables ~30s transfers (testnet) vs ~15min standard
  const { estimatedTime, estimatedFees: cctpFees } = estimateCCTPBridge(
    request.fromChainId,
    request.toChainId,
    request.currency,
    isTestnet,
    true // Use Fast Transfer by default
  );
  
  const estimatedFees = cctpFees;

  // Determine bridge direction for steps description
  const fromChainName = fromIsArc ? 'Arc Network' : `chain ${request.fromChainId}`;
  const toChainName = toIsArc ? 'Arc Network' : `chain ${request.toChainId}`;

  // Determine if using Fast Transfer or Standard Transfer
  const useFastTransfer = estimatedTime < 120; // Less than 2 minutes = Fast Transfer
  
  const steps = [
    `Burn ${request.amount} ${request.currency} on ${fromChainName}`,
    useFastTransfer 
      ? 'Wait for Circle attestation (Fast Transfer - ~30s)'
      : 'Wait for Circle attestation (Standard Transfer - ~15min)',
    `Mint ${request.amount} ${request.currency} on ${toChainName}`,
  ];

  return {
    estimatedTime,
    estimatedFees,
    steps,
  };
}

/**
 * Check if a chain supports CCTP bridging
 */
export function supportsCCTP(chainId: number, currency: 'USDC' | 'EURC', isTestnet: boolean): boolean {
  return cctpSupports(chainId, currency, isTestnet);
}

/**
 * Check if a bridge route is valid for CCTP
 * CCTP bridges work:
 * - FROM CCTP-supported chains (Base, Ethereum, etc.) TO Arc Network
 * - FROM Arc Network TO CCTP-supported chains (Base, Ethereum, etc.)
 */
export function isValidCCTPRoute(
  fromChainId: number,
  toChainId: number,
  currency: 'USDC' | 'EURC',
  isTestnet: boolean
): boolean {
  const arcChainId = isTestnet ? ARC_TESTNET_CHAIN_ID : ARC_MAINNET_CHAIN_ID;
  const fromIsArc = fromChainId === arcChainId;
  const toIsArc = toChainId === arcChainId;

  // If both chains are Arc, invalid route
  if (fromIsArc && toIsArc) return false;

  // If FROM Arc TO CCTP-supported chain, valid (Arc can bridge TO CCTP chains)
  if (fromIsArc && supportsCCTP(toChainId, currency, isTestnet)) return true;

  // If FROM CCTP-supported chain TO Arc, valid (CCTP chains can bridge TO Arc)
  if (toIsArc && supportsCCTP(fromChainId, currency, isTestnet)) return true;

  // If both chains support CCTP, valid (for cross-CCTP bridges)
  if (supportsCCTP(fromChainId, currency, isTestnet) && supportsCCTP(toChainId, currency, isTestnet)) return true;

  return false;
}

/**
 * Get supported payment assets for a given settlement currency
 */
export function getSupportedPaymentAssets(
  settlementCurrency: 'USDC' | 'EURC',
  isTestnet: boolean
): Array<{ asset: string; chainId: number; chainName: string; requiresBridge: boolean; requiresSwap: boolean }> {
  const assets = [];

  // Always support native settlement currency on Arc
  assets.push({
    asset: `${settlementCurrency}_ARC`,
    chainId: isTestnet ? ARC_TESTNET_CHAIN_ID : ARC_MAINNET_CHAIN_ID,
    chainName: 'Arc Network',
    requiresBridge: false,
    requiresSwap: false,
  });

  // Support USDC on EVM testnets (Base Sepolia, Sepolia) via CCTP
  if (settlementCurrency === 'USDC') {
    if (isTestnet) {
      assets.push({
        asset: 'USDC_BASE_SEPOLIA',
        chainId: baseSepolia.id,
        chainName: 'Base Sepolia',
        requiresBridge: true,
        requiresSwap: false,
      });
      assets.push({
        asset: 'USDC_SEPOLIA',
        chainId: sepolia.id,
        chainName: 'Sepolia',
        requiresBridge: true,
        requiresSwap: false,
      });
    } else {
      assets.push({
        asset: 'USDC_BASE',
        chainId: base.id,
        chainName: 'Base',
        requiresBridge: true,
        requiresSwap: false,
      });
      assets.push({
        asset: 'USDC_MAINNET',
        chainId: mainnet.id,
        chainName: 'Ethereum',
        requiresBridge: true,
        requiresSwap: false,
      });
    }
  }

  // Support ETH on EVM testnets (requires swap to USDC/EURC, then bridge)
  if (isTestnet) {
    assets.push({
      asset: 'ETH_BASE_SEPOLIA',
      chainId: baseSepolia.id,
      chainName: 'Base Sepolia',
      requiresBridge: true,
      requiresSwap: true,
    });
    assets.push({
      asset: 'ETH_SEPOLIA',
      chainId: sepolia.id,
      chainName: 'Sepolia',
      requiresBridge: true,
      requiresSwap: true,
    });
  } else {
    assets.push({
      asset: 'ETH_BASE',
      chainId: base.id,
      chainName: 'Base',
      requiresBridge: true,
      requiresSwap: true,
    });
    assets.push({
      asset: 'ETH_MAINNET',
      chainId: mainnet.id,
      chainName: 'Ethereum',
      requiresBridge: true,
      requiresSwap: true,
    });
  }

  return assets;
}

/**
 * Generate conversion path description
 */
export function generateConversionPath(
  paymentAsset: string,
  settlementCurrency: 'USDC' | 'EURC',
  isTestnet: boolean
): string {
  const [asset, chain] = paymentAsset.split('_');
  const chainName = chain === 'ARC' ? 'Arc Network' : chain.replace('_', ' ');

  if (asset === settlementCurrency && chain === 'ARC') {
    return 'Direct payment on Arc Network';
  }

  if (asset === settlementCurrency) {
    return `${asset} on ${chainName} → Bridge via CCTP → ${settlementCurrency} on Arc`;
  }

  if (asset === 'ETH') {
    return `ETH on ${chainName} → Swap to ${settlementCurrency} → Bridge via CCTP → ${settlementCurrency} on Arc`;
  }

  return `${asset} on ${chainName} → ${settlementCurrency} on Arc`;
}

/**
 * Estimate conversion fees and time
 */
export function estimateConversion(
  paymentAsset: string,
  settlementCurrency: 'USDC' | 'EURC',
  amount: string,
  isTestnet: boolean
): { estimatedTime: number; estimatedFees: string; conversionPath: string } {
  const [asset, chain] = paymentAsset.split('_');
  const requiresSwap = asset !== settlementCurrency;
  const requiresBridge = chain !== 'ARC';

  let estimatedTime = 0;
  let estimatedFees = '0';

  // Swap time (if needed)
  if (requiresSwap) {
    estimatedTime += isTestnet ? 10 : 30; // Simulated swap time
    estimatedFees = (parseFloat(estimatedFees) + (isTestnet ? 0.01 : 0.05)).toFixed(2);
  }

  // Bridge time (if needed)
  if (requiresBridge) {
    estimatedTime += isTestnet ? 20 : 45; // CCTP bridge time
    estimatedFees = (parseFloat(estimatedFees) + (isTestnet ? 0.01 : 0.05)).toFixed(2);
  }

  // Direct payment on Arc
  if (!requiresSwap && !requiresBridge) {
    estimatedTime = 1; // Sub-second finality on Arc
    estimatedFees = '0';
  }

  const conversionPath = generateConversionPath(paymentAsset, settlementCurrency, isTestnet);

  return {
    estimatedTime,
    estimatedFees,
    conversionPath,
  };
}

