/**
 * CCTP Service
 * Implements Circle's Cross-Chain Transfer Protocol (CCTP)
 * Handles burn, attestation, and mint operations for USDC/EURC transfers
 */

import { createPublicClient, http, parseUnits, formatUnits, Address, Hash, pad } from 'viem';
import { base, baseSepolia, mainnet, sepolia } from 'viem/chains';

// CCTP Domain IDs (Circle's domain mapping)
const CCTP_DOMAINS = {
  // Testnet domains
  5042002: 26, // Arc Testnet
  [baseSepolia.id]: 6, // Base Sepolia
  [sepolia.id]: 0, // Ethereum Sepolia
  
  // Mainnet domains
  5042001: 26, // Arc Mainnet
  [base.id]: 6, // Base
  [mainnet.id]: 0, // Ethereum
} as Record<number, number>;

// Circle CCTP contract addresses (testnet)
const CCTP_TESTNET_CONFIG = {
  // Arc Testnet - TokenMessengerV2
  5042002: {
    tokenMessenger: '0x8FE689990c688CcFDD58f7EB8974218be2542DAA' as Address,
    messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa09875659861CE275' as Address,
    usdc: '0x3600000000000000000000000000000000000000' as Address, // USDC ERC-20 interface (6 decimals)
    eurc: '0x89850855Aa3bE2F677c06383Cec88985F319072a' as Address,
    domain: 26,
  },
  // Base Sepolia
  [baseSepolia.id]: {
    tokenMessenger: '0x9f3B8679C73C2Fef8b59B4f3444d4e156fb70AA5' as Address,
    messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD' as Address,
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
    eurc: null as Address | null,
    domain: 6,
  },
  // Sepolia
  [sepolia.id]: {
    tokenMessenger: '0x9f3B8679C73C2Fef8b59B4f3444d4e156fb70AA5' as Address,
    messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD' as Address,
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address,
    eurc: null as Address | null,
    domain: 0,
  },
};

// Circle CCTP contract addresses (mainnet)
const CCTP_MAINNET_CONFIG = {
  // Arc Mainnet - TokenMessengerV2 (update addresses if different from testnet)
  5042001: {
    tokenMessenger: '0x8FE689990c688CcFDD58f7EB8974218be2542DAA' as Address, // Update if mainnet differs
    messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa09875659861CE275' as Address, // Update if mainnet differs
    usdc: '0x3600000000000000000000000000000000000000' as Address,
    eurc: '0x89850855Aa3bE2F677c06383Cec88985F319072a' as Address, // Update if mainnet differs
    domain: 26,
  },
  [base.id]: {
    tokenMessenger: '0x1682Ae6375C4E4A97e4B583BC4cB31Cc3a3b2c6e' as Address,
    messageTransmitter: '0x1682Ae6375C4E4A97e4B583BC4cB31Cc3a3b2c6e' as Address,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
    eurc: '0x1aBaEA1f7C830bD89Acc67eC4f5164b1b3905C3c' as Address,
    domain: 6,
  },
  [mainnet.id]: {
    tokenMessenger: '0xbd3fa81B58Ba92a82136038B25aDec7066af3155' as Address,
    messageTransmitter: '0x0a992d191DEeC32aFe36203Ad87D7d289a738F81' as Address,
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
    eurc: '0x1aBaEA1f7C830bD89Acc67eC4f5164b1b3905C3c' as Address,
    domain: 0,
  },
};

// Circle Attestation Service API endpoints
const CCTP_ATTESTATION_API = {
  testnet: 'https://iris-api-sandbox.circle.com',
  mainnet: 'https://iris-api.circle.com',
};

// CCTP TokenMessenger ABI (depositForBurn function)
const TOKEN_MESSENGER_ABI = [
  {
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
    ],
    name: 'depositForBurn',
    outputs: [{ name: 'nonce', type: 'uint64' }, { name: 'burnToken', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// CCTP MessageTransmitter ABI (receiveMessage function)
const MESSAGE_TRANSMITTER_ABI = [
  {
    inputs: [
      { name: 'message', type: 'bytes' },
      { name: 'attestation', type: 'bytes' },
    ],
    name: 'receiveMessage',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ERC20 ABI (approve, transfer, balanceOf)
const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface CCTPBridgeRequest {
  amount: string;
  currency: 'USDC' | 'EURC';
  fromChainId: number;
  toChainId: number;
  fromAddress: Address;
  toAddress: Address;
  isTestnet?: boolean;
}

export interface CCTPBridgeResult {
  bridgeId: string;
  burnTxHash?: Hash;
  attestation?: string;
  mintTxHash?: Hash;
  status: 'pending' | 'burning' | 'attesting' | 'minting' | 'completed' | 'failed';
  estimatedTime: number;
}

/**
 * Get CCTP configuration for a chain
 */
function getCCTPConfig(chainId: number, isTestnet: boolean) {
  if (isTestnet) {
    return CCTP_TESTNET_CONFIG[chainId as keyof typeof CCTP_TESTNET_CONFIG] || null;
  } else {
    return CCTP_MAINNET_CONFIG[chainId as keyof typeof CCTP_MAINNET_CONFIG] || null;
  }
}

/**
 * Get CCTP domain for a chain
 */
function getCCTPDomain(chainId: number): number | null {
  return CCTP_DOMAINS[chainId] ?? null;
}

/**
 * Fetch attestation from Circle's Attestation Service
 * For Fast Transfer, this enables faster-than-finality transfers
 */
async function fetchAttestation(
  messageHash: string,
  isTestnet: boolean
): Promise<string | null> {
  const apiBase = isTestnet ? CCTP_ATTESTATION_API.testnet : CCTP_ATTESTATION_API.mainnet;
  
  try {
    // Poll for attestation (Circle's service provides it after soft finality)
    const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${apiBase}/attestations/${messageHash}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'complete' && data.attestation) {
          return data.attestation;
        }
      }

      // Wait 2 seconds before next attempt
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return null;
  } catch (error) {
    console.error('Error fetching attestation:', error);
    return null;
  }
}

/**
 * Initiate CCTP bridge - Step 1: Burn USDC on source chain
 * This function would be called from the frontend with a wallet signature
 */
export async function initiateCCTPBurn(
  request: CCTPBridgeRequest
): Promise<{ nonce: bigint; burnTxHash: Hash }> {
  const isTestnet = request.isTestnet ?? true;
  const config = getCCTPConfig(request.fromChainId, isTestnet);
  
  if (!config) {
    throw new Error(`CCTP not supported on chain ${request.fromChainId}`);
  }

  const tokenAddress = request.currency === 'USDC' ? config.usdc : config.eurc;
  if (!tokenAddress) {
    throw new Error(`${request.currency} not supported on chain ${request.fromChainId}`);
  }

  const destinationDomain = getCCTPDomain(request.toChainId);
  if (destinationDomain === null) {
    throw new Error(`Destination chain ${request.toChainId} not supported`);
  }

  // Convert amount to wei (USDC/EURC use 6 decimals)
  const amountWei = parseUnits(request.amount, 6);

  // Create public client for source chain
  const rpcUrl = getRpcUrl(request.fromChainId, isTestnet);
  const client = createPublicClient({
    chain: getChainConfig(request.fromChainId),
    transport: http(rpcUrl),
  });

  // Note: In a real implementation, this would require:
  // 1. User's wallet to sign the transaction
  // 2. Approval transaction first (if needed)
  // 3. Then depositForBurn transaction
  
  // For now, return a mock response structure
  // The actual transaction would be:
  // const hash = await client.writeContract({
  //   address: config.tokenMessenger,
  //   abi: TOKEN_MESSENGER_ABI,
  //   functionName: 'depositForBurn',
  //   args: [
  //     amountWei,
  //     destinationDomain,
  //     pad(request.toAddress, { size: 32 }), // Convert address to bytes32
  //     tokenAddress,
  //   ],
  //   account: request.fromAddress,
  // });

  return {
    nonce: BigInt(Date.now()), // Mock nonce
    burnTxHash: `0x${'0'.repeat(64)}` as Hash, // Mock hash
  };
}

/**
 * Complete CCTP bridge - Step 2: Get attestation and mint on destination chain
 */
export async function completeCCTPMint(
  request: CCTPBridgeRequest,
  burnTxHash: Hash,
  messageHash: string
): Promise<{ mintTxHash: Hash }> {
  const isTestnet = request.isTestnet ?? true;
  const config = getCCTPConfig(request.toChainId, isTestnet);
  
  if (!config) {
    throw new Error(`CCTP not supported on chain ${request.toChainId}`);
  }

  // Fetch attestation from Circle's service
  const attestation = await fetchAttestation(messageHash, isTestnet);
  
  if (!attestation) {
    throw new Error('Failed to get attestation from Circle');
  }

  // Create public client for destination chain
  const rpcUrl = getRpcUrl(request.toChainId, isTestnet);
  const client = createPublicClient({
    chain: getChainConfig(request.toChainId),
    transport: http(rpcUrl),
  });

  // Note: In a real implementation, this would require:
  // 1. Construct the message from the burn event
  // 2. User's wallet to sign the mint transaction
  // 3. Call receiveMessage on MessageTransmitter contract
  
  // const hash = await client.writeContract({
  //   address: config.messageTransmitter,
  //   abi: MESSAGE_TRANSMITTER_ABI,
  //   functionName: 'receiveMessage',
  //   args: [message, attestation],
  //   account: request.toAddress,
  // });

  return {
    mintTxHash: `0x${'0'.repeat(64)}` as Hash, // Mock hash
  };
}

/**
 * Get RPC URL for a chain
 */
function getRpcUrl(chainId: number, isTestnet: boolean): string {
  // This would use environment variables or a provider service
  if (chainId === baseSepolia.id) return 'https://sepolia.base.org';
  if (chainId === sepolia.id) return 'https://rpc.sepolia.org';
  if (chainId === base.id) return 'https://mainnet.base.org';
  if (chainId === mainnet.id) return 'https://eth.llamarpc.com';
  if (chainId === 5042002) return process.env.VITE_ARC_RPC_URL || 'https://rpc.testnet.arc.network';
  if (chainId === 5042001) return process.env.VITE_ARC_RPC_URL_MAINNET || 'https://rpc.arc.network';
  
  throw new Error(`Unknown chain ID: ${chainId}`);
}

/**
 * Get chain config for viem
 */
function getChainConfig(chainId: number) {
  if (chainId === baseSepolia.id) return baseSepolia;
  if (chainId === sepolia.id) return sepolia;
  if (chainId === base.id) return base;
  if (chainId === mainnet.id) return mainnet;
  
  // Arc Network custom chain config
  return {
    id: chainId,
    name: chainId === 5042002 ? 'Arc Testnet' : 'Arc Mainnet',
    nativeCurrency: {
      decimals: 6,
      name: 'USDC',
      symbol: 'USDC',
    },
    rpcUrls: {
      default: {
        http: [getRpcUrl(chainId, chainId === 5042002)],
      },
    },
  };
}

/**
 * Estimate CCTP bridge time and fees
 * Fast Transfer: ~30 seconds (testnet) to ~60 seconds (mainnet)
 * Standard Transfer: ~15 minutes
 */
export function estimateCCTPBridge(
  fromChainId: number,
  toChainId: number,
  currency: 'USDC' | 'EURC',
  isTestnet: boolean,
  useFastTransfer: boolean = true
): { estimatedTime: number; estimatedFees: string } {
  // Fast Transfer times (faster than finality)
  if (useFastTransfer) {
    return {
      estimatedTime: isTestnet ? 30 : 60, // seconds
      estimatedFees: isTestnet ? '0.01' : '0.05', // Minimal fees
    };
  }

  // Standard Transfer times (wait for hard finality)
  return {
    estimatedTime: isTestnet ? 900 : 1800, // 15-30 minutes
    estimatedFees: isTestnet ? '0.01' : '0.05',
  };
}

/**
 * Check if CCTP is supported for a chain and currency
 */
export function supportsCCTP(chainId: number, currency: 'USDC' | 'EURC', isTestnet: boolean): boolean {
  const config = getCCTPConfig(chainId, isTestnet);
  if (!config) return false;
  
  if (currency === 'USDC') return !!config.usdc;
  if (currency === 'EURC') return !!config.eurc;
  return false;
}

