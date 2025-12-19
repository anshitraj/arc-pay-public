/**
 * Bridge Routes
 * Handles CCTP bridge operations
 */

import type { Express } from "express";
import { z } from "zod";
import { requireApiKey } from "../middleware/apiKeyAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { estimateBridge, supportsCCTP } from "../services/bridgeService.js";

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
  app.post("/api/bridge/estimate", requireApiKey, rateLimit, async (req, res) => {
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

      // Check if CCTP is supported
      if (!supportsCCTP(result.data.fromChainId, result.data.currency, isTestnet)) {
        return res.status(400).json({ error: `CCTP not supported for ${result.data.currency} on chain ${result.data.fromChainId}` });
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
      res.status(500).json({ error: "Failed to estimate bridge" });
    }
  });

  // Initiate bridge (placeholder - would integrate with wallet/smart contract)
  app.post("/api/bridge/initiate", requireApiKey, rateLimit, async (req, res) => {
    try {
      const result = bridgeInitiateSchema.safeParse({
        ...req.body,
        fromChainId: parseInt(req.body.fromChainId),
        toChainId: parseInt(req.body.toChainId),
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const isTestnet = result.data.isTestnet ?? true;

      // Check if CCTP is supported
      if (!supportsCCTP(result.data.fromChainId, result.data.currency, isTestnet)) {
        return res.status(400).json({ error: `CCTP not supported for ${result.data.currency} on chain ${result.data.fromChainId}` });
      }

      // In a real implementation, this would:
      // 1. Initiate the burn transaction on source chain
      // 2. Wait for Circle attestation
      // 3. Initiate the mint transaction on destination chain
      // For now, return a mock response

      res.json({
        message: "Bridge initiated",
        bridgeId: `bridge_${Date.now()}`,
        estimatedTime: isTestnet ? 20 : 45,
        status: "pending",
      });
    } catch (error) {
      console.error("Bridge initiate error:", error);
      res.status(500).json({ error: "Failed to initiate bridge" });
    }
  });

  // Get bridge history
  app.get("/api/bridge/history", requireApiKey, rateLimit, async (req, res) => {
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

