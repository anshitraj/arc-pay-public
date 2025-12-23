/**
 * Fee & Split Routes
 * Handles platform fees and payment splits
 */

import type { Express } from "express";
import { z } from "zod";
import { requireApiKey } from "../middleware/apiKeyAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { enforceTestLiveIsolation } from "../middleware/testLiveIsolation.js";
import {
  createFeeRule,
  createSplitRule,
  getFeeRules,
  getSplitRules,
  getFeeSummary,
} from "../services/feeSplitService.js";
import { FEATURE_FLAGS } from "../config.js";

const createFeeRuleSchema = z.object({
  feeType: z.enum(["platform", "processing"]),
  feeBasisPoints: z.coerce.number().int().min(0).max(10000).optional(), // 0-10000 = 0-100%
  feeFixedAmount: z.string().optional(),
  currency: z.string().optional().default("USDC"),
});

const createSplitRuleSchema = z.object({
  recipientWallet: z.string().refine((val) => /^0x[a-fA-F0-9]{40}$/.test(val), "Invalid wallet address"),
  splitBasisPoints: z.coerce.number().int().min(0).max(10000), // 0-10000 = 0-100%
  currency: z.string().optional().default("USDC"),
});

export function registerFeeRoutes(app: Express) {
  // Feature flag check middleware
  const checkFeatureEnabled = (req: any, res: any, next: any) => {
    if (!FEATURE_FLAGS.feesAndSplitsEnabled) {
      return res.status(503).json({ error: "Fees and splits feature is not enabled" });
    }
    next();
  };

  // Create fee rule
  app.post(
    "/api/fees/rules",
    requireApiKey,
    enforceTestLiveIsolation,
    rateLimit,
    checkFeatureEnabled,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const result = createFeeRuleSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({ error: result.error.errors[0].message });
        }

        const rule = await createFeeRule({
          merchantId: req.merchant.id,
          feeType: result.data.feeType,
          feeBasisPoints: result.data.feeBasisPoints,
          feeFixedAmount: result.data.feeFixedAmount,
          currency: result.data.currency || "USDC",
        });

        res.json(rule);
      } catch (error) {
        console.error("Create fee rule error:", error);
        res.status(500).json({ error: "Failed to create fee rule" });
      }
    }
  );

  // Get fee rules
  app.get(
    "/api/fees/rules",
    requireApiKey,
    enforceTestLiveIsolation,
    rateLimit,
    checkFeatureEnabled,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const rules = await getFeeRules(req.merchant.id);
        res.json(rules);
      } catch (error) {
        console.error("Get fee rules error:", error);
        res.status(500).json({ error: "Failed to get fee rules" });
      }
    }
  );

  // Create split rule
  app.post(
    "/api/splits/rules",
    requireApiKey,
    enforceTestLiveIsolation,
    rateLimit,
    checkFeatureEnabled,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const result = createSplitRuleSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({ error: result.error.errors[0].message });
        }

        const rule = await createSplitRule({
          merchantId: req.merchant.id,
          recipientWallet: result.data.recipientWallet,
          splitBasisPoints: result.data.splitBasisPoints,
          currency: result.data.currency || "USDC",
        });

        res.json(rule);
      } catch (error) {
        console.error("Create split rule error:", error);
        res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create split rule" });
      }
    }
  );

  // Get split rules
  app.get(
    "/api/splits/rules",
    requireApiKey,
    enforceTestLiveIsolation,
    rateLimit,
    checkFeatureEnabled,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const rules = await getSplitRules(req.merchant.id);
        res.json(rules);
      } catch (error) {
        console.error("Get split rules error:", error);
        res.status(500).json({ error: "Failed to get split rules" });
      }
    }
  );

  // Get fee summary for payment
  app.get(
    "/api/payments/:id/fee-summary",
    requireApiKey,
    enforceTestLiveIsolation,
    rateLimit,
    checkFeatureEnabled,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const summary = await getFeeSummary(req.params.id);
        res.json(summary);
      } catch (error) {
        console.error("Get fee summary error:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get fee summary" });
      }
    }
  );
}

