/**
 * Payout Routes
 * Handles merchant payouts/withdrawals
 */

import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { requireApiKey } from "../middleware/apiKeyAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { enforceTestLiveIsolation } from "../middleware/testLiveIsolation.js";
import {
  createPayout,
  completePayout,
  failPayout,
  getPayouts,
} from "../services/payoutService.js";
import { FEATURE_FLAGS } from "../config.js";
import { storage } from "../storage.js";

const createPayoutSchema = z.object({
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be positive"),
  currency: z.string().optional().default("USDC"),
  destinationWallet: z.string().refine((val) => /^0x[a-fA-F0-9]{40}$/.test(val), "Invalid wallet address"),
  destinationChainId: z.coerce.number().int().optional(),
  metadata: z.record(z.any()).optional(),
});

const completePayoutSchema = z.object({
  txHash: z.string().refine((val) => /^0x[a-fA-F0-9]{64}$/.test(val), "Invalid transaction hash"),
});

const failPayoutSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

export function registerPayoutRoutes(app: Express) {
  // Feature flag check middleware
  const checkFeatureEnabled = (req: any, res: any, next: any) => {
    if (!FEATURE_FLAGS.payoutsEnabled) {
      return res.status(503).json({ error: "Payouts feature is not enabled" });
    }
    next();
  };

  // Middleware that supports both session-based auth (dashboard) and API key auth (API)
  const requireAuthOrApiKey = async (req: Request, res: Response, next: NextFunction) => {
    // First check for session-based auth (dashboard)
    if (req.session?.merchantId) {
      try {
        const merchant = await storage.getMerchant(req.session.merchantId);
        if (merchant) {
          req.merchant = merchant;
          return next();
        }
      } catch (error) {
        console.error("Session auth error:", error);
      }
    }

    // Fall back to API key auth
    return requireApiKey(req, res, next);
  };

  // Create payout
  app.post(
    "/api/payouts",
    requireAuthOrApiKey,
    enforceTestLiveIsolation,
    rateLimit,
    checkFeatureEnabled,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const result = createPayoutSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({ error: result.error.errors[0].message });
        }

        const payout = await createPayout({
          merchantId: req.merchant.id,
          amount: result.data.amount,
          currency: result.data.currency || "USDC",
          destinationWallet: result.data.destinationWallet,
          destinationChainId: result.data.destinationChainId,
          metadata: result.data.metadata,
        });

        res.json(payout);
      } catch (error) {
        console.error("Create payout error:", error);
        res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create payout" });
      }
    }
  );

  // Get payouts
  app.get(
    "/api/payouts",
    requireAuthOrApiKey,
    enforceTestLiveIsolation,
    rateLimit,
    checkFeatureEnabled,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const payouts = await getPayouts(req.merchant.id);
        res.json(payouts);
      } catch (error) {
        console.error("Get payouts error:", error);
        res.status(500).json({ error: "Failed to get payouts" });
      }
    }
  );

  // Complete payout (after transaction)
  app.post(
    "/api/payouts/:id/complete",
    requireAuthOrApiKey,
    enforceTestLiveIsolation,
    rateLimit,
    checkFeatureEnabled,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const result = completePayoutSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({ error: result.error.errors[0].message });
        }

        const payout = await completePayout(req.params.id, result.data.txHash, req.merchant.id);
        res.json(payout);
      } catch (error) {
        console.error("Complete payout error:", error);
        res.status(400).json({ error: error instanceof Error ? error.message : "Failed to complete payout" });
      }
    }
  );

  // Fail payout
  app.post(
    "/api/payouts/:id/fail",
    requireAuthOrApiKey,
    enforceTestLiveIsolation,
    rateLimit,
    checkFeatureEnabled,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const result = failPayoutSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({ error: result.error.errors[0].message });
        }

        const payout = await failPayout(req.params.id, result.data.reason, req.merchant.id);
        res.json(payout);
      } catch (error) {
        console.error("Fail payout error:", error);
        res.status(400).json({ error: error instanceof Error ? error.message : "Failed to fail payout" });
      }
    }
  );
}

