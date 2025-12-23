/**
 * Subscription Routes
 * Handles subscription management (non-custodial, invoice-based)
 */

import type { Express } from "express";
import { z } from "zod";
import { requireApiKey } from "../middleware/apiKeyAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { enforceTestLiveIsolation } from "../middleware/testLiveIsolation.js";
import {
  createSubscription,
  cancelSubscription,
  getSubscriptions,
} from "../services/subscriptionService.js";
import { FEATURE_FLAGS } from "../config.js";

const createSubscriptionSchema = z.object({
  customerEmail: z.string().email("Invalid email"),
  customerName: z.string().optional(),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be positive"),
  currency: z.string().optional().default("USDC"),
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
  gracePeriodDays: z.coerce.number().int().positive().max(30).optional(),
  metadata: z.record(z.any()).optional(),
});

export function registerSubscriptionRoutes(app: Express) {
  // Feature flag check middleware
  const checkFeatureEnabled = (req: any, res: any, next: any) => {
    if (!FEATURE_FLAGS.subscriptionsEnabled) {
      return res.status(503).json({ error: "Subscriptions feature is not enabled" });
    }
    next();
  };

  // Create subscription
  app.post(
    "/api/subscriptions",
    requireApiKey,
    enforceTestLiveIsolation,
    rateLimit,
    checkFeatureEnabled,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const result = createSubscriptionSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({ error: result.error.errors[0].message });
        }

        const subscription = await createSubscription({
          merchantId: req.merchant.id,
          customerEmail: result.data.customerEmail,
          customerName: result.data.customerName,
          amount: result.data.amount,
          currency: result.data.currency || "USDC",
          interval: result.data.interval || "monthly",
          gracePeriodDays: result.data.gracePeriodDays,
          metadata: result.data.metadata,
        });

        res.json(subscription);
      } catch (error) {
        console.error("Create subscription error:", error);
        res.status(500).json({ error: "Failed to create subscription" });
      }
    }
  );

  // Get subscriptions
  app.get(
    "/api/subscriptions",
    requireApiKey,
    enforceTestLiveIsolation,
    rateLimit,
    checkFeatureEnabled,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const subscriptions = await getSubscriptions(req.merchant.id);
        res.json(subscriptions);
      } catch (error) {
        console.error("Get subscriptions error:", error);
        res.status(500).json({ error: "Failed to get subscriptions" });
      }
    }
  );

  // Cancel subscription
  app.post(
    "/api/subscriptions/:id/cancel",
    requireApiKey,
    enforceTestLiveIsolation,
    rateLimit,
    checkFeatureEnabled,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const subscription = await cancelSubscription(req.params.id, req.merchant.id);
        res.json(subscription);
      } catch (error) {
        console.error("Cancel subscription error:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to cancel subscription" });
      }
    }
  );
}

