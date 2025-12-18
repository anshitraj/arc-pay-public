/**
 * ARC Testnet Utilities
 */

const ARC_EXPLORER_BASE_URL = import.meta.env.VITE_ARC_EXPLORER_URL || "https://testnet.arcscan.app";
const ARC_CHAIN_ID = parseInt(import.meta.env.VITE_ARC_CHAIN_ID || "5042002", 10);

export function getExplorerLink(txHash: string): string {
  // ArcScan uses format: https://testnet.arcscan.app/tx/{txHash}
  // Ensure txHash doesn't have leading/trailing slashes
  const cleanTxHash = txHash.trim();
  return `${ARC_EXPLORER_BASE_URL}/tx/${cleanTxHash}`;
}

export function getArcChainId(): number {
  return ARC_CHAIN_ID;
}

export function getArcNetworkName(): string {
  return "ARC Testnet";
}

export function getUsdcTokenAddress(): `0x${string}` {
  // Official ARC Testnet USDC address (native currency)
  return (import.meta.env.VITE_USDC_TOKEN_ADDRESS || "0x3600000000000000000000000000000000000000") as `0x${string}`;
}

