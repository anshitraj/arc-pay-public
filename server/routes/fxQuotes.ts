/**
 * FX Quote Routes
 * Handles FX rate quotes for currency conversion
 */

import type { Express } from "express";
import { z } from "zod";
import { requireApiKey, optionalApiKey } from "../middleware/apiKeyAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { createFxQuote, getFxQuote, markFxQuoteAsUsed } from "../services/fxQuoteService.js";

const createFxQuoteSchema = z.object({
  paymentId: z.string().optional(),
  fromCurrency: z.enum(["USDC", "EURC"]),
  toCurrency: z.enum(["USDC", "EURC"]),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be positive"),
  expiresInSeconds: z.coerce.number().int().positive().optional(),
});

export function registerFxQuoteRoutes(app: Express) {
  // Create FX quote
  app.post(
    "/api/fx-quotes",
    requireApiKey,
    rateLimit,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const result = createFxQuoteSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({ error: result.error.errors[0].message });
        }

        const quote = await createFxQuote({
          paymentId: result.data.paymentId,
          merchantId: req.merchant.id,
          fromCurrency: result.data.fromCurrency,
          toCurrency: result.data.toCurrency,
          amount: result.data.amount,
          expiresInSeconds: result.data.expiresInSeconds,
        });

        res.json(quote);
      } catch (error) {
        console.error("Create FX quote error:", error);
        res.status(500).json({ error: "Failed to create FX quote" });
      }
    }
  );

  // Get FX quote by ID
  app.get(
    "/api/fx-quotes/:id",
    optionalApiKey,
    rateLimit,
    async (req, res) => {
      try {
        const quote = await getFxQuote(req.params.id);

        if (!quote) {
          return res.status(404).json({ error: "FX quote not found" });
        }

        // Verify merchant ownership if authenticated
        if (req.merchant && quote.merchantId && quote.merchantId !== req.merchant.id) {
          return res.status(403).json({ error: "Access denied" });
        }

        res.json(quote);
      } catch (error) {
        console.error("Get FX quote error:", error);
        res.status(500).json({ error: "Failed to get FX quote" });
      }
    }
  );

  // Mark FX quote as used
  app.post(
    "/api/fx-quotes/:id/use",
    requireApiKey,
    rateLimit,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const quote = await getFxQuote(req.params.id);

        if (!quote) {
          return res.status(404).json({ error: "FX quote not found" });
        }

        // Verify merchant ownership
        if (quote.merchantId && quote.merchantId !== req.merchant.id) {
          return res.status(403).json({ error: "Access denied" });
        }

        // Check if quote is still active
        if (quote.status !== "active") {
          return res.status(400).json({ error: `FX quote is ${quote.status}` });
        }

        await markFxQuoteAsUsed(req.params.id);

        res.json({ success: true });
      } catch (error) {
        console.error("Use FX quote error:", error);
        res.status(500).json({ error: "Failed to use FX quote" });
      }
    }
  );
}

