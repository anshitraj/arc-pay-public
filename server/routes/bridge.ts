/**
 * Bridge Routes
 * Handles CCTP bridge operations
 */

import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { rateLimit } from "../middleware/rateLimit.js";
import { estimateBridge, isValidCCTPRoute } from "../services/bridgeService.js";
import { initiateCCTPBurn, completeCCTPMint, estimateCCTPBridge } from "../services/cctpService.js";

/**
 * Session-based authentication middleware for dashboard routes
 */
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

const bridgeEstimateSchema = z.object({
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be positive"),
  currency: z.enum(["USDC", "EURC"]),
  fromChainId: z.number().int().positive(),
  toChainId: z.number().int().positive(),
  isTestnet: z.boolean().optional(),
});

const bridgeInitiateSchema = z.object({
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be positive"),
  currency: z.enum(["USDC", "EURC"]),
  fromChainId: z.number().int().positive(),
  toChainId: z.number().int().positive(),
  fromAddress: z.string().refine((val) => /^0x[a-fA-F0-9]{40}$/.test(val), "Invalid from address"),
  toAddress: z.string().refine((val) => /^0x[a-fA-F0-9]{40}$/.test(val), "Invalid to address"),
  isTestnet: z.boolean().optional(),
});

export function registerBridgeRoutes(app: Express) {
  // Estimate bridge
  app.post("/api/bridge/estimate", requireAuth, rateLimit, async (req, res) => {
    try {
      const result = bridgeEstimateSchema.safeParse({
        ...req.body,
        fromChainId: parseInt(req.body.fromChainId),
        toChainId: parseInt(req.body.toChainId),
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const isTestnet = result.data.isTestnet ?? true;

      // Check if CCTP bridge route is valid
      if (!isValidCCTPRoute(result.data.fromChainId, result.data.toChainId, result.data.currency, isTestnet)) {
        return res.status(400).json({ 
          error: `CCTP bridge not supported from chain ${result.data.fromChainId} to chain ${result.data.toChainId} for ${result.data.currency}` 
        });
      }

      const estimate = await estimateBridge({
        amount: result.data.amount,
        currency: result.data.currency,
        fromChainId: result.data.fromChainId,
        toChainId: result.data.toChainId,
        fromAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`, // Placeholder
        toAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`, // Placeholder
        isTestnet,
      });

      res.json(estimate);
    } catch (error) {
      console.error("Bridge estimate error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to estimate bridge";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Initiate bridge (placeholder - would integrate with wallet/smart contract)
  app.post("/api/bridge/initiate", requireAuth, rateLimit, async (req, res) => {
    try {
      const result = bridgeInitiateSchema.safeParse({
        ...req.body,
        fromChainId: parseInt(req.body.fromChainId),
        toChainId: parseInt(req.body.toChainId),
      });

      if (!result.success) {
        const firstError = result.error.errors[0];
        return res.status(400).json({ 
          error: firstError.message || `Missing required field: ${firstError.path.join('.')}` 
        });
      }

      const isTestnet = result.data.isTestnet ?? true;

      // Check if CCTP bridge route is valid
      if (!isValidCCTPRoute(result.data.fromChainId, result.data.toChainId, result.data.currency, isTestnet)) {
        return res.status(400).json({ 
          error: `CCTP bridge not supported from chain ${result.data.fromChainId} to chain ${result.data.toChainId} for ${result.data.currency}` 
        });
      }

      // CCTP Bridge Flow:
      // 1. User signs burn transaction on source chain (TokenMessenger.depositForBurn)
      // 2. Backend polls Circle Attestation Service for attestation
      // 3. User signs mint transaction on destination chain (MessageTransmitter.receiveMessage)
      //
      // Note: Actual implementation requires:
      // - Frontend wallet integration for signing transactions
      // - Circle's CCTP contract addresses and domain mappings
      // - Circle Attestation Service API access
      // - Proper message construction from burn events
      //
      // For now, return estimate-based response
      const estimate = await estimateBridge({
        amount: result.data.amount,
        currency: result.data.currency,
        fromChainId: result.data.fromChainId,
        toChainId: result.data.toChainId,
        fromAddress: result.data.fromAddress,
        toAddress: result.data.toAddress,
        isTestnet,
      });

      res.json({
        message: "Bridge initiated",
        bridgeId: `bridge_${Date.now()}`,
        estimatedTime: estimate.estimatedTime,
        status: "pending",
        steps: estimate.steps,
      });
    } catch (error) {
      console.error("Bridge initiate error:", error);
      res.status(500).json({ error: "Failed to initiate bridge" });
    }
  });

  // Get bridge history
  app.get("/api/bridge/history", requireAuth, rateLimit, async (req, res) => {
    try {
      // In a real implementation, this would fetch from database
      // For now, return empty array
      res.json([]);
    } catch (error) {
      console.error("Get bridge history error:", error);
      res.status(500).json({ error: "Failed to get bridge history" });
    }
  });
}

