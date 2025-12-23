/**
 * Settlement Service
 * Handles payment settlement routing (same-chain or CCTP)
 * PaymentIntent → SettlementRoute
 */

import { db } from "../db.js";
import { settlementRoutes, paymentAuditLogs } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { supportsCCTP, estimateCCTPBridge } from "./cctpService.js";

export interface CreateSettlementRouteRequest {
  paymentId: string;
  merchantId: string;
  sourceChainId?: number; // If not provided, assume same-chain
  destinationChainId: number; // Default: Arc (5042001/5042002)
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

/**
 * Determine settlement route type based on chain IDs
 */
function determineRouteType(
  sourceChainId: number | undefined,
  destinationChainId: number
): "same_chain" | "cctp" {
  // Same chain if source is not provided or matches destination
  if (!sourceChainId || sourceChainId === destinationChainId) {
    return "same_chain";
  }

  // Check if CCTP is supported
  const isTestnet = destinationChainId === 5042002;
  const currency = "USDC"; // Default currency
  if (supportsCCTP(sourceChainId, currency as "USDC" | "EURC", isTestnet)) {
    return "cctp";
  }

  // Fallback to same-chain if CCTP not supported
  return "same_chain";
}

/**
 * Create a settlement route for a payment
 */
export async function createSettlementRoute(
  request: CreateSettlementRouteRequest
): Promise<SettlementRoute> {
  const routeType = determineRouteType(
    request.sourceChainId,
    request.destinationChainId
  );

  const [route] = await db
    .insert(settlementRoutes)
    .values({
      paymentId: request.paymentId,
      merchantId: request.merchantId,
      routeType,
      sourceChainId: request.sourceChainId || null,
      destinationChainId: request.destinationChainId,
      sourceCurrency: request.sourceCurrency,
      destinationCurrency: request.destinationCurrency,
      amount: request.amount,
      status: "pending",
    })
    .returning();

  // Create audit log
  await db.insert(paymentAuditLogs).values({
    paymentId: request.paymentId,
    merchantId: request.merchantId,
    action: "settlement_routed",
    fromStatus: null,
    toStatus: null,
    metadata: JSON.stringify({
      routeType,
      sourceChainId: request.sourceChainId,
      destinationChainId: request.destinationChainId,
      routeId: route.id,
    }),
  }).catch(console.error);

  return route as SettlementRoute;
}

/**
 * Get settlement route for a payment
 */
export async function getSettlementRoute(
  paymentId: string
): Promise<SettlementRoute | null> {
  const [route] = await db
    .select()
    .from(settlementRoutes)
    .where(eq(settlementRoutes.paymentId, paymentId))
    .limit(1);

  return route as SettlementRoute | null;
}

/**
 * Update settlement route status
 */
export async function updateSettlementRoute(
  routeId: string,
  updates: {
    status?: "pending" | "processing" | "completed" | "failed";
    cctpBurnTxHash?: string;
    cctpMintTxHash?: string;
    cctpAttestation?: string;
  }
): Promise<SettlementRoute | null> {
  const [route] = await db
    .update(settlementRoutes)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(settlementRoutes.id, routeId))
    .returning();

  if (route && updates.status) {
    // Create audit log
    await db.insert(paymentAuditLogs).values({
      paymentId: route.paymentId,
      merchantId: route.merchantId,
      action: "settlement_status_changed",
      fromStatus: null,
      toStatus: updates.status,
      metadata: JSON.stringify({
        routeId: route.id,
        routeType: route.routeType,
        cctpBurnTxHash: updates.cctpBurnTxHash,
        cctpMintTxHash: updates.cctpMintTxHash,
      }),
    }).catch(console.error);
  }

  return route as SettlementRoute | null;
}

/**
 * Estimate settlement route (same-chain or CCTP)
 */
export function estimateSettlementRoute(
  sourceChainId: number | undefined,
  destinationChainId: number,
  currency: "USDC" | "EURC",
  amount: string,
  isTestnet: boolean
): {
  routeType: "same_chain" | "cctp";
  estimatedTime: number;
  estimatedFees: string;
} {
  const routeType = determineRouteType(sourceChainId, destinationChainId);

  if (routeType === "same_chain") {
    return {
      routeType: "same_chain",
      estimatedTime: 0, // Instant
      estimatedFees: "0",
    };
  }

  // CCTP route
  const estimate = estimateCCTPBridge(
    sourceChainId || destinationChainId,
    destinationChainId,
    currency,
    isTestnet,
    true // Use fast transfer
  );

  return {
    routeType: "cctp",
    estimatedTime: estimate.estimatedTime,
    estimatedFees: estimate.estimatedFees,
  };
}

