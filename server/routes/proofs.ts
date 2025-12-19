/**
 * Proof Routes
 * Handles payment proof API endpoints
 */

import { Express, Request } from "express";
import { generateInvoiceHash, getPaymentProofStatus, isPaymentEligibleForProof } from "../services/proofService.js";
import { storage } from "../storage.js";
import { optionalApiKey } from "../middleware/apiKeyAuth.js";

// Middleware to get merchant from session or API key
async function getMerchant(req: Request) {
  // Check if merchant already set by API key middleware
  if (req.merchant) {
    return req.merchant;
  }
  
  // Check session
  if (req.session?.merchantId) {
    return await storage.getMerchant(req.session.merchantId);
  }
  
  return undefined;
}

export function registerProofRoutes(app: Express) {
  // Get proof status for a payment (authenticated - session or API key)
  app.get("/api/payments/:id/proof", optionalApiKey, async (req, res) => {
    try {
      const merchant = await getMerchant(req);
      if (!merchant) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const paymentId = req.params.id;
      const payment = await storage.getPayment(paymentId);

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      if (payment.merchantId !== merchant.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const proofStatus = await getPaymentProofStatus(paymentId);
      const eligible = isPaymentEligibleForProof(payment);

      res.json({
        ...proofStatus,
        eligible,
      });
    } catch (error) {
      console.error("Proof status error:", error);
      res.status(500).json({ error: "Failed to get proof status" });
    }
  });

  // Generate invoice hash for a payment (authenticated - session or API key)
  app.post("/api/payments/:id/generate-invoice-hash", optionalApiKey, async (req, res) => {
    try {
      const merchant = await getMerchant(req);
      if (!merchant) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const paymentId = req.params.id;
      const payment = await storage.getPayment(paymentId);

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      if (payment.merchantId !== merchant.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!isPaymentEligibleForProof(payment)) {
        return res.status(400).json({ error: "Payment is not eligible for proof recording" });
      }

      if (!payment.merchantWallet) {
        return res.status(400).json({ error: "Merchant wallet address is required" });
      }

      // Check if proof already exists
      const existingProof = await storage.getPaymentProof(paymentId);
      if (existingProof) {
        return res.json({
          invoiceHash: existingProof.invoiceHash,
          alreadyExists: true,
        });
      }

      const invoiceHash = generateInvoiceHash(
        paymentId,
        payment.merchantWallet,
        payment.amount
      );

      res.json({
        invoiceHash,
        alreadyExists: false,
      });
    } catch (error) {
      console.error("Generate invoice hash error:", error);
      res.status(500).json({ error: "Failed to generate invoice hash" });
    }
  });

  // Record proof (called after frontend records on-chain)
  app.post("/api/payments/:id/record-proof", optionalApiKey, async (req, res) => {
    try {
      const merchant = await getMerchant(req);
      if (!merchant) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const paymentId = req.params.id;
      const { invoiceHash, proofTxHash } = req.body;

      if (!invoiceHash || !proofTxHash) {
        return res.status(400).json({ error: "invoiceHash and proofTxHash are required" });
      }

      const payment = await storage.getPayment(paymentId);

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      if (payment.merchantId !== merchant.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if proof already exists
      const existingProof = await storage.getPaymentProof(paymentId);
      
      if (existingProof) {
        // Update existing proof
        await storage.updatePaymentProof(existingProof.id, {
          proofTxHash,
        });
      } else {
        // Create new proof record
        await storage.createPaymentProof({
          paymentId,
          invoiceHash,
          proofTxHash,
        });
      }

      const updatedProof = await storage.getPaymentProof(paymentId);
      res.json({ success: true, proof: updatedProof });
    } catch (error) {
      console.error("Record proof error:", error);
      res.status(500).json({ error: "Failed to record proof" });
    }
  });
}
