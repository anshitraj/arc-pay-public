/**
 * Adapter Stubs
 * Mock implementations that throw NotImplementedInPublicRepo
 * Real implementations are in the private repository
 */

import { NotImplementedInPublicRepo } from "../core/errors.js";
import type {
  SettlementAdapter,
  CctpAdapter,
  ChainAdapter,
  CreateSettlementRouteRequest,
  SettlementRoute,
} from "./interfaces.js";

export class SettlementAdapterStub implements SettlementAdapter {
  async createSettlementRoute(_request: CreateSettlementRouteRequest): Promise<SettlementRoute> {
    throw new NotImplementedInPublicRepo("SettlementAdapter.createSettlementRoute");
  }

  estimateSettlementRoute(
    _sourceChainId: number | undefined,
    _destinationChainId: number,
    _currency: "USDC" | "EURC" | "USYC",
    _amount: string,
    _isTestnet: boolean
  ) {
    throw new NotImplementedInPublicRepo("SettlementAdapter.estimateSettlementRoute");
  }
}

export class CctpAdapterStub implements CctpAdapter {
  supportsCCTP(_chainId: number, _currency: "USDC" | "EURC" | "USYC", _isTestnet: boolean): boolean {
    throw new NotImplementedInPublicRepo("CctpAdapter.supportsCCTP");
  }

  estimateCCTPBridge(
    _sourceChainId: number,
    _destinationChainId: number,
    _currency: "USDC" | "EURC" | "USYC",
    _isTestnet: boolean,
    _useFastTransfer?: boolean
  ) {
    throw new NotImplementedInPublicRepo("CctpAdapter.estimateCCTPBridge");
  }

  async executeBridge(
    _sourceChainId: number,
    _destinationChainId: number,
    _currency: "USDC" | "EURC" | "USYC",
    _amount: string,
    _recipient: string,
    _isTestnet: boolean
  ) {
    throw new NotImplementedInPublicRepo("CctpAdapter.executeBridge");
  }
}

export class ChainAdapterStub implements ChainAdapter {
  async sendTokens(
    _chainId: number,
    _tokenAddress: string,
    _recipient: string,
    _amount: string
  ): Promise<string> {
    throw new NotImplementedInPublicRepo("ChainAdapter.sendTokens");
  }

  async getTransactionStatus(_chainId: number, _txHash: string) {
    throw new NotImplementedInPublicRepo("ChainAdapter.getTransactionStatus");
  }
}

// Export singleton instances
export const settlementAdapter = new SettlementAdapterStub();
export const cctpAdapter = new CctpAdapterStub();
export const chainAdapter = new ChainAdapterStub();
