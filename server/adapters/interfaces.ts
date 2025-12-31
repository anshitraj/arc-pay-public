/**
 * Adapter Interfaces
 * Interfaces for settlement, CCTP, and chain operations
 * Implementations are stubs in the public repository
 */

export interface SettlementAdapter {
  /**
   * Create a settlement route for a payment
   * @throws NotImplementedInPublicRepo in public repo
   */
  createSettlementRoute(request: CreateSettlementRouteRequest): Promise<SettlementRoute>;

  /**
   * Estimate settlement route
   * @throws NotImplementedInPublicRepo in public repo
   */
  estimateSettlementRoute(
    sourceChainId: number | undefined,
    destinationChainId: number,
    currency: "USDC" | "EURC" | "USYC",
    amount: string,
    isTestnet: boolean
  ): {
    routeType: "same_chain" | "cctp";
    estimatedTime: number;
    estimatedFees: string;
  };
}

export interface CctpAdapter {
  /**
   * Check if CCTP is supported for a chain/currency
   * @throws NotImplementedInPublicRepo in public repo
   */
  supportsCCTP(chainId: number, currency: "USDC" | "EURC" | "USYC", isTestnet: boolean): boolean;

  /**
   * Estimate CCTP bridge
   * @throws NotImplementedInPublicRepo in public repo
   */
  estimateCCTPBridge(
    sourceChainId: number,
    destinationChainId: number,
    currency: "USDC" | "EURC" | "USYC",
    isTestnet: boolean,
    useFastTransfer?: boolean
  ): {
    estimatedTime: number;
    estimatedFees: string;
  };

  /**
   * Execute CCTP bridge (burn on source, mint on destination)
   * @throws NotImplementedInPublicRepo in public repo
   */
  executeBridge(
    sourceChainId: number,
    destinationChainId: number,
    currency: "USDC" | "EURC" | "USYC",
    amount: string,
    recipient: string,
    isTestnet: boolean
  ): Promise<{
    burnTxHash: string;
    mintTxHash?: string;
    attestation?: string;
  }>;
}

export interface ChainAdapter {
  /**
   * Send tokens on-chain
   * @throws NotImplementedInPublicRepo in public repo
   */
  sendTokens(
    chainId: number,
    tokenAddress: string,
    recipient: string,
    amount: string
  ): Promise<string>; // Returns txHash

  /**
   * Get transaction status
   * @throws NotImplementedInPublicRepo in public repo
   */
  getTransactionStatus(chainId: number, txHash: string): Promise<{
    status: "pending" | "confirmed" | "failed";
    blockNumber?: number;
    confirmations?: number;
  }>;
}

// Types for settlement
export interface CreateSettlementRouteRequest {
  paymentId: string;
  merchantId: string;
  sourceChainId?: number;
  destinationChainId: number;
  sourceCurrency: string;
  destinationCurrency: string;
  amount: string;
}

export interface SettlementRoute {
  id: string;
  paymentId: string;
  merchantId: string;
  routeType: "same_chain" | "cctp";
  sourceChainId: number | null;
  destinationChainId: number;
  sourceCurrency: string;
  destinationCurrency: string;
  amount: string;
  status: "pending" | "processing" | "completed" | "failed";
  cctpBurnTxHash: string | null;
  cctpMintTxHash: string | null;
  cctpAttestation: string | null;
  createdAt: Date;
  updatedAt: Date;
}
