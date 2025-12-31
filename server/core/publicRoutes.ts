/**
 * Public API Routes
 * Demo-safe endpoints for payment intents
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { createPaymentIntentSchema, paymentIdSchema } from "./validation.js";
import { normalizeError } from "./errors.js";
import { isDemoMode } from "./demoMode.js";

// Mock storage for demo mode (in-memory)
interface MockPaymentIntent {
  id: string;
  merchantId: string;
  amount: string;
  currency: string;
  settlementCurrency: "USDC" | "EURC" | "USYC";
  paymentAsset?: string;
  paymentChainId?: number;
  conversionPath?: string;
  estimatedFees?: string;
  status: "created" | "pending" | "confirmed" | "failed" | "refunded" | "expired";
  description?: string;
  customerEmail?: string;
  payerWallet?: string;
  merchantWallet?: string;
  txHash?: string;
  settlementTime?: number;
  metadata?: string;
  idempotencyKey?: string;
  isTest: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const mockIntents: Map<string, MockPaymentIntent> = new Map();
let intentCounter = 0;

function generateId(): string {
  return `demo-intent-${Date.now()}-${++intentCounter}`;
}

/**
 * Register public API routes
 */
export function registerPublicRoutes(app: Express): void {
  // Health check
  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      mode: "demo",
      timestamp: new Date().toISOString(),
    });
  });

  // Create payment intent (demo mode)
  app.post("/api/public/intents", async (req: Request, res: Response) => {
    try {
      if (!isDemoMode()) {
        return res.status(403).json({
          error: "DemoModeRequiredError",
          message: "This endpoint is only available in demo mode",
        });
      }

      const result = createPaymentIntentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: "ValidationError",
          message: result.error.errors[0].message,
        });
      }

      const data = result.data;
      const intent: MockPaymentIntent = {
        id: generateId(),
        merchantId: "demo-merchant",
        amount: data.amount,
        currency: data.currency || "USDC",
        settlementCurrency: data.settlementCurrency || "USDC",
        paymentAsset: data.paymentAsset,
        paymentChainId: data.paymentChainId,
        conversionPath: data.conversionPath,
        estimatedFees: data.estimatedFees,
        status: "created",
        description: data.description,
        customerEmail: data.customerEmail,
        isTest: data.isTest !== undefined ? data.isTest : true,
        expiresAt: data.expiresInMinutes
          ? new Date(Date.now() + data.expiresInMinutes * 60 * 1000)
          : undefined,
        idempotencyKey: data.idempotencyKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Handle idempotency
      if (data.idempotencyKey) {
        const existing = Array.from(mockIntents.values()).find(
          (i) => i.idempotencyKey === data.idempotencyKey
        );
        if (existing) {
          return res.json(existing);
        }
      }

      mockIntents.set(intent.id, intent);

      res.status(201).json(intent);
    } catch (error) {
      const normalized = normalizeError(error);
      res.status(500).json(normalized);
    }
  });

  // Get payment intent
  app.get("/api/public/intents/:id", async (req: Request, res: Response) => {
    try {
      if (!isDemoMode()) {
        return res.status(403).json({
          error: "DemoModeRequiredError",
          message: "This endpoint is only available in demo mode",
        });
      }

      const result = paymentIdSchema.safeParse({ id: req.params.id });
      if (!result.success) {
        return res.status(400).json({
          error: "ValidationError",
          message: "Invalid payment ID format",
        });
      }

      const intent = mockIntents.get(result.data.id);
      if (!intent) {
        return res.status(404).json({
          error: "NotFound",
          message: "Payment intent not found",
        });
      }

      res.json(intent);
    } catch (error) {
      const normalized = normalizeError(error);
      res.status(500).json(normalized);
    }
  });

  // List payment intents (demo - returns all)
  app.get("/api/public/intents", async (_req: Request, res: Response) => {
    try {
      if (!isDemoMode()) {
        return res.status(403).json({
          error: "DemoModeRequiredError",
          message: "This endpoint is only available in demo mode",
        });
      }

      const intents = Array.from(mockIntents.values());
      res.json(intents);
    } catch (error) {
      const normalized = normalizeError(error);
      res.status(500).json(normalized);
    }
  });

  // Mock webhook endpoint (for testing webhook delivery)
  app.post("/api/public/webhooks/mock", async (req: Request, res: Response) => {
    try {
      if (!isDemoMode()) {
        return res.status(403).json({
          error: "DemoModeRequiredError",
          message: "This endpoint is only available in demo mode",
        });
      }

      const webhookEvent = req.body;
      console.log("📨 Mock webhook received:", webhookEvent);

      res.json({
        received: true,
        event: webhookEvent,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const normalized = normalizeError(error);
      res.status(500).json(normalized);
    }
  });
}
