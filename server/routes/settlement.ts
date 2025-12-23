/**
 * Settlement Routes
 * Handles payment settlement routing (same-chain or CCTP)
 */

import type { Express } from "express";
import { z } from "zod";
import { requireApiKey } from "../middleware/apiKeyAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import {
  createSettlementRoute,
  getSettlementRoute,
  updateSettlementRoute,
  estimateSettlementRoute,
} from "../services/settlementService.js";

const createSettlementRouteSchema = z.object({
  paymentId: z.string(),
  sourceChainId: z.coerce.number().int().optional(),
  destinationChainId: z.coerce.number().int().optional().default(5042002), // Default: Arc Testnet
  sourceCurrency: z.string(),
  destinationCurrency: z.string(),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be positive"),
});

const updateSettlementRouteSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  cctpBurnTxHash: z.string().optional(),
  cctpMintTxHash: z.string().optional(),
  cctpAttestation: z.string().optional(),
});

export function registerSettlementRoutes(app: Express) {
  // Create settlement route for a payment
  app.post(
    "/api/settlement/routes",
    requireApiKey,
    rateLimit,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const result = createSettlementRouteSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({ error: result.error.errors[0].message });
        }

        // Verify payment belongs to merchant
        const { storage } = await import("../storage.js");
        const payment = await storage.getPayment(result.data.paymentId);
        if (!payment || payment.merchantId !== req.merchant.id) {
          return res.status(404).json({ error: "Payment not found" });
        }

        const route = await createSettlementRoute({
          paymentId: result.data.paymentId,
          merchantId: req.merchant.id,
          sourceChainId: result.data.sourceChainId,
          destinationChainId: result.data.destinationChainId || 5042002,
          sourceCurrency: result.data.sourceCurrency,
          destinationCurrency: result.data.destinationCurrency,
          amount: result.data.amount,
        });

        res.json(route);
      } catch (error) {
        console.error("Create settlement route error:", error);
        res.status(500).json({ error: "Failed to create settlement route" });
      }
    }
  );

  // Get settlement route for a payment
  app.get(
    "/api/settlement/routes/payment/:paymentId",
    requireApiKey,
    rateLimit,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        // Verify payment belongs to merchant
        const { storage } = await import("../storage.js");
        const payment = await storage.getPayment(req.params.paymentId);
        if (!payment || payment.merchantId !== req.merchant.id) {
          return res.status(404).json({ error: "Payment not found" });
        }

        const route = await getSettlementRoute(req.params.paymentId);

        if (!route) {
          return res.status(404).json({ error: "Settlement route not found" });
        }

        res.json(route);
      } catch (error) {
        console.error("Get settlement route error:", error);
        res.status(500).json({ error: "Failed to get settlement route" });
      }
    }
  );

  // Update settlement route
  app.patch(
    "/api/settlement/routes/:id",
    requireApiKey,
    rateLimit,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const result = updateSettlementRouteSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({ error: result.error.errors[0].message });
        }

        // Get route by ID and verify merchant ownership
        const { db } = await import("../db.js");
        const { settlementRoutes } = await import("../../shared/schema.js");
        const { eq } = await import("drizzle-orm");
        
        const [route] = await db
          .select()
          .from(settlementRoutes)
          .where(eq(settlementRoutes.id, req.params.id))
          .limit(1);

        if (!route || route.merchantId !== req.merchant.id) {
          return res.status(404).json({ error: "Settlement route not found" });
        }

        const updatedRoute = await updateSettlementRoute(req.params.id, result.data);

        if (!updatedRoute) {
          return res.status(404).json({ error: "Settlement route not found" });
        }

        res.json(updatedRoute);
      } catch (error) {
        console.error("Update settlement route error:", error);
        res.status(500).json({ error: "Failed to update settlement route" });
      }
    }
  );

  // Estimate settlement route
  app.get(
    "/api/settlement/estimate",
    requireApiKey,
    rateLimit,
    async (req, res) => {
      try {
        const { sourceChainId, destinationChainId, currency, amount, isTestnet } = req.query;

        if (!destinationChainId || !currency || !amount) {
          return res.status(400).json({ error: "Missing required parameters" });
        }

        const estimate = estimateSettlementRoute(
          sourceChainId ? parseInt(sourceChainId as string) : undefined,
          parseInt(destinationChainId as string),
          currency as "USDC" | "EURC",
          amount as string,
          isTestnet === "true"
        );

        res.json(estimate);
      } catch (error) {
        console.error("Estimate settlement route error:", error);
        res.status(500).json({ error: "Failed to estimate settlement route" });
      }
    }
  );
}

