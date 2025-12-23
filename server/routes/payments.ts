/**
 * Payment Routes
 * Handles payment lifecycle: create, confirm, fail, expire
 */

import type { Express } from "express";
import { z } from "zod";
import { requireApiKey, optionalApiKey } from "../middleware/apiKeyAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { enforceTestLiveIsolation } from "../middleware/testLiveIsolation.js";
import { createPayment, confirmPayment, failPayment, expirePayment } from "../services/paymentService.js";
import { storage } from "../storage.js";
import { getExplorerLink } from "../services/arcService.js";

const createPaymentSchema = z.object({
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be positive"),
  currency: z.string().optional().default("USDC"),
  settlementCurrency: z.enum(["USDC", "EURC"]).optional().default("USDC"),
  paymentAsset: z.string().optional(),
  paymentChainId: z.coerce.number().int().optional(),
  conversionPath: z.string().optional(),
  estimatedFees: z.string().optional(),
  description: z.string().optional(),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("").transform(() => undefined)),
  merchantWallet: z.string().refine((val) => /^0x[a-fA-F0-9]{40}$/.test(val), "Invalid wallet address").optional(),
  expiresInMinutes: z.coerce.number().int().positive().optional(),
  isTest: z.coerce.boolean().optional(),
  gasSponsored: z.coerce.boolean().optional().default(false),
  idempotencyKey: z.string().optional(), // Idempotency key for duplicate request prevention
});

/**
 * Infer isTest from API key prefix
 */
function inferIsTestFromApiKey(apiKey: string): boolean {
  // Check if API key starts with test prefix
  if (apiKey.startsWith("sk_arc_test_") || apiKey.startsWith("pk_arc_test_")) {
    return true;
  }
  if (apiKey.startsWith("sk_arc_live_") || apiKey.startsWith("pk_arc_live_")) {
    return false;
  }
  // Default to test mode for unknown prefixes (backward compatibility)
  return true;
}

const confirmPaymentSchema = z.object({
  txHash: z.string().refine((val) => /^0x[a-fA-F0-9]{64}$/.test(val), "Invalid transaction hash"),
  payerWallet: z.string().refine((val) => /^0x[a-fA-F0-9]{40}$/.test(val), "Invalid wallet address"),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("").transform(() => undefined)),
  customerName: z.string().optional(),
});

const failPaymentSchema = z.object({
  reason: z.string().optional(),
});

export function registerPaymentRoutes(app: Express) {
  // Create payment
  app.post(
    "/api/payments/create",
    requireApiKey,
    enforceTestLiveIsolation,
    rateLimit,
    async (req, res) => {
      try {
        if (!req.merchant) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const result = createPaymentSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({ error: result.error.errors[0].message });
        }

        // Extract API key to infer isTest
        const apiKey = req.headers.authorization?.replace("Bearer ", "") || 
                      req.headers["x-api-key"] as string || 
                      req.query.apiKey as string || "";
        
        // Infer defaults
        const inferredIsTest = result.data.isTest !== undefined 
          ? result.data.isTest 
          : inferIsTestFromApiKey(apiKey);

        // Get merchant wallet - use provided, or merchant's walletAddress, or try to get from profile
        let merchantWallet = result.data.merchantWallet;
        if (!merchantWallet) {
          merchantWallet = req.merchant.walletAddress || undefined;
          
          // If still no wallet, try to get default wallet from merchant profile
          if (!merchantWallet && req.merchant.walletAddress) {
            try {
              const profile = await storage.getMerchantProfile(req.merchant.walletAddress);
              // For now, use merchant.walletAddress as default
              // In future, could use profile.defaultWallet if that field exists
              merchantWallet = req.merchant.walletAddress;
            } catch (error) {
              // Silently fail
            }
          }
        }

        if (!merchantWallet) {
          return res.status(400).json({ 
            error: "Merchant wallet address is required. Please set your wallet address in settings or provide merchantWallet in the request." 
          });
        }

        // Check merchant verification status (on-chain badge check)
        const { isMerchantVerified } = await import("../services/badgeService.js");
        const isVerified = await isMerchantVerified(req.merchant.id);
        
        // Get updated merchant status (may have been updated by isMerchantVerified)
        const updatedMerchant = await storage.getMerchant(req.merchant.id);
        const merchantStatus = updatedMerchant?.status || req.merchant.status || "demo";
        
        // Demo merchants can only create test payments (unless verified)
        if (!isVerified && merchantStatus === "demo" && !inferredIsTest) {
          return res.status(403).json({ 
            error: "Demo merchants can only create test payments. Complete business verification to create live payments." 
          });
        }

        // Verified merchants can create both test and live payments
        // pending_verification merchants can create test payments only (same as demo)

        const payment = await createPayment({
          merchantId: req.merchant.id,
          amount: result.data.amount,
          currency: result.data.currency || "USDC",
          settlementCurrency: result.data.settlementCurrency || "USDC",
          paymentAsset: result.data.paymentAsset || undefined, // Default to ARC USDC if not provided
          paymentChainId: result.data.paymentChainId, // Will be inferred if not provided
          conversionPath: result.data.conversionPath,
          estimatedFees: result.data.estimatedFees,
          description: result.data.description,
          customerEmail: result.data.customerEmail,
          merchantWallet: merchantWallet,
          expiresInMinutes: result.data.expiresInMinutes,
          isTest: inferredIsTest,
          gasSponsored: result.data.gasSponsored || false,
          idempotencyKey: result.data.idempotencyKey,
        });

        // Generate checkout URL
        const baseUrl = process.env.BASE_URL || 
          (req.headers.origin ? new URL(req.headers.origin).origin : 'https://pay.arcpaykit.com');
        const checkoutUrl = `${baseUrl}/checkout/${payment.id}`;

        res.json({
          id: payment.id,
          status: payment.status,
          checkout_url: checkoutUrl,
          amount: parseFloat(payment.amount),
          currency: payment.currency,
          merchantWallet: payment.merchantWallet,
          expiresAt: payment.expiresAt,
          createdAt: payment.createdAt,
        });
      } catch (error) {
        console.error("Create payment error:", error);
        res.status(500).json({ error: "Failed to create payment" });
      }
    }
  );

  // Get payment by ID
  app.get("/api/payments/:id", requireApiKey, enforceTestLiveIsolation, rateLimit, async (req, res) => {
    try {
      if (!req.merchant) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const payment = await storage.getPayment(req.params.id);

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      if (payment.merchantId !== req.merchant.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get merchant profile if merchantWallet is available
      let merchantProfile = null;
      if (payment.merchantWallet) {
        try {
          // Normalize wallet address to lowercase for lookup
          const normalizedWallet = payment.merchantWallet.toLowerCase();
          merchantProfile = await storage.getMerchantProfile(normalizedWallet);
        } catch (error) {
          // Silently fail if profile doesn't exist
          console.error("Error fetching merchant profile:", error);
        }
      }

      res.json({
        ...payment,
        explorerLink: payment.txHash ? getExplorerLink(payment.txHash) : null,
        merchantProfile: merchantProfile ? {
          businessName: merchantProfile.businessName,
          logoUrl: merchantProfile.logoUrl,
        } : null,
      });
    } catch (error) {
      console.error("Get payment error:", error);
      res.status(500).json({ error: "Failed to get payment" });
    }
  });

  // Submit transaction hash (when transaction is submitted from frontend)
  // Public endpoint for checkout page (no auth required)
  app.post(
    "/api/payments/submit-tx",
    rateLimit,
    async (req, res) => {
      try {
        const { paymentId, txHash, payerWallet, customerEmail, customerName, gasSponsored } = req.body;
        
        if (!paymentId) {
          return res.status(400).json({ error: "paymentId is required" });
        }

        const result = confirmPaymentSchema.safeParse({ txHash, payerWallet, customerEmail, customerName });
        if (!result.success) {
          return res.status(400).json({ error: result.error.errors[0].message });
        }

        // Get payment (public access for checkout)
        const payment = await storage.getPayment(paymentId);
        if (!payment) {
          return res.status(404).json({ error: "Payment not found" });
        }

        // If merchant is authenticated, verify ownership
        if (req.merchant && payment.merchantId !== req.merchant.id) {
          return res.status(403).json({ error: "Access denied" });
        }

        // Prepare metadata with customer name and gas sponsorship if provided
        let metadata = payment.metadata;
        try {
          const existingMetadata = metadata ? JSON.parse(metadata) : {};
          const updatedMetadata: any = { ...existingMetadata };
          
          if (result.data.customerName) {
            updatedMetadata.customerName = result.data.customerName;
          }
          
          // Update gas sponsorship if provided (user can override merchant's preference)
          if (gasSponsored !== undefined) {
            updatedMetadata.gasSponsored = gasSponsored;
          }
          
          metadata = JSON.stringify(updatedMetadata);
        } catch {
          // If metadata is invalid JSON, create new object
          const newMetadata: any = {};
          if (result.data.customerName) {
            newMetadata.customerName = result.data.customerName;
          }
          if (gasSponsored !== undefined) {
            newMetadata.gasSponsored = gasSponsored;
          }
          metadata = JSON.stringify(newMetadata);
        }

        // Update payment status to pending (will be confirmed by background checker)
        await storage.updatePayment(paymentId, {
          status: "pending",
          txHash: result.data.txHash,
          payerWallet: result.data.payerWallet,
          customerEmail: result.data.customerEmail || payment.customerEmail,
          metadata: metadata || payment.metadata,
        });

        const updatedPayment = await storage.getPayment(paymentId);

        res.json({
          success: true,
          payment: updatedPayment ? {
            ...updatedPayment,
            explorerLink: getExplorerLink(result.data.txHash),
          } : null,
        });
      } catch (error) {
        console.error("Submit tx error:", error);
        res.status(500).json({ error: "Failed to submit transaction" });
      }
    }
  );

  // Confirm payment (when transaction is submitted)
  // Public endpoint for checkout page (no auth required)
  app.post(
    "/api/payments/confirm",
    rateLimit,
    async (req, res) => {
      try {
        const { paymentId, ...confirmData } = req.body;
        const result = confirmPaymentSchema.safeParse(confirmData);

        if (!result.success) {
          return res.status(400).json({ error: result.error.errors[0].message });
        }

        if (!paymentId) {
          return res.status(400).json({ error: "paymentId is required" });
        }

        // Get payment (public access for checkout)
        const payment = await storage.getPayment(paymentId);
        if (!payment) {
          return res.status(404).json({ error: "Payment not found" });
        }

        // If merchant is authenticated, verify ownership
        if (req.merchant && payment.merchantId !== req.merchant.id) {
          return res.status(403).json({ error: "Access denied" });
        }

        // Update payment status to pending (will be confirmed by background checker)
        await storage.updatePayment(paymentId, {
          status: "pending",
          txHash: result.data.txHash,
          payerWallet: result.data.payerWallet,
        });

        const updatedPayment = await storage.getPayment(paymentId);

        res.json({
          success: true,
          payment: updatedPayment ? {
            ...updatedPayment,
            explorerLink: getExplorerLink(result.data.txHash),
          } : null,
        });
      } catch (error) {
        console.error("Confirm payment error:", error);
        res.status(500).json({ error: "Failed to confirm payment" });
      }
    }
  );

  // Fail payment
  app.post("/api/payments/fail", requireApiKey, rateLimit, async (req, res) => {
    try {
      if (!req.merchant) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { paymentId, ...failData } = req.body;
      const result = failPaymentSchema.safeParse(failData);

      if (!paymentId) {
        return res.status(400).json({ error: "paymentId is required" });
      }

      const payment = await storage.getPayment(paymentId);
      if (!payment || payment.merchantId !== req.merchant.id) {
        return res.status(404).json({ error: "Payment not found" });
      }

      const updatedPayment = await failPayment(paymentId, result.data.reason);

      res.json({
        success: true,
        payment: updatedPayment,
      });
    } catch (error) {
      console.error("Fail payment error:", error);
      res.status(500).json({ error: "Failed to fail payment" });
    }
  });

  // Expire payment
  app.post("/api/payments/expire", requireApiKey, rateLimit, async (req, res) => {
    try {
      if (!req.merchant) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { paymentId } = req.body;

      if (!paymentId) {
        return res.status(400).json({ error: "paymentId is required" });
      }

      const payment = await storage.getPayment(paymentId);
      if (!payment || payment.merchantId !== req.merchant.id) {
        return res.status(404).json({ error: "Payment not found" });
      }

      const updatedPayment = await expirePayment(paymentId);

      res.json({
        success: true,
        payment: updatedPayment,
      });
    } catch (error) {
      console.error("Expire payment error:", error);
      res.status(500).json({ error: "Failed to expire payment" });
    }
  });
}

