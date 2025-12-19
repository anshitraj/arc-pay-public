/**
 * Badge Routes
 * Handles merchant badge API endpoints
 */

import { Express, Request, Response, NextFunction } from "express";
import { getMerchantBadgeStatus, isMerchantEligibleForBadge } from "../services/badgeService.js";
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

export function registerBadgeRoutes(app: Express) {
  // Get badge status (authenticated - session or API key)
  app.get("/api/badges/status", optionalApiKey, async (req, res) => {
    try {
      const merchant = await getMerchant(req);
      if (!merchant) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const status = await getMerchantBadgeStatus(merchant.id);
      res.json(status);
    } catch (error) {
      console.error("Badge status error:", error);
      res.status(500).json({ error: "Failed to get badge status" });
    }
  });

  // Check verification status (on-chain check)
  app.get("/api/badges/verification", optionalApiKey, async (req, res) => {
    try {
      const merchant = await getMerchant(req);
      if (!merchant) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { isMerchantVerified } = await import("../services/badgeService.js");
      const isVerified = await isMerchantVerified(merchant.id);
      res.json({ verified: isVerified });
    } catch (error) {
      console.error("Verification check error:", error);
      res.status(500).json({ error: "Failed to check verification" });
    }
  });

  // Public endpoint to check verification by wallet address (for checkout pages)
  app.get("/api/badges/verification/:walletAddress", async (req, res) => {
    try {
      const walletAddress = req.params.walletAddress.toLowerCase();
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({ error: "Invalid wallet address" });
      }

      const { checkBadgeOwnership } = await import("../services/arcService.js");
      const MERCHANT_BADGE_ADDRESS = process.env.MERCHANT_BADGE_ADDRESS;
      
      if (!MERCHANT_BADGE_ADDRESS) {
        return res.json({ verified: false });
      }

      const hasBadge = await checkBadgeOwnership(walletAddress, MERCHANT_BADGE_ADDRESS);
      res.json({ verified: hasBadge });
    } catch (error) {
      console.error("Public verification check error:", error);
      res.status(500).json({ error: "Failed to check verification" });
    }
  });

  // Check eligibility (authenticated - session or API key)
  app.get("/api/badges/eligibility", optionalApiKey, async (req, res) => {
    try {
      const merchant = await getMerchant(req);
      if (!merchant) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const eligible = await isMerchantEligibleForBadge(merchant.id);
      res.json({ eligible });
    } catch (error) {
      console.error("Badge eligibility error:", error);
      res.status(500).json({ error: "Failed to check eligibility" });
    }
  });

  // Record badge mint (called after frontend mints)
  app.post("/api/badges/record-mint", optionalApiKey, async (req, res) => {
    try {
      const merchant = await getMerchant(req);
      if (!merchant) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { tokenId, mintTxHash } = req.body;

      if (!tokenId || !mintTxHash) {
        return res.status(400).json({ error: "tokenId and mintTxHash are required" });
      }

      // Check if badge already exists
      const existingBadge = await storage.getMerchantBadge(merchant.id);
      
      if (existingBadge) {
        // Update existing badge
        await storage.updateMerchantBadge(merchant.id, {
          tokenId: tokenId.toString(),
          mintTxHash,
        });
      } else {
        // Create new badge record
        await storage.createMerchantBadge({
          merchantId: merchant.id,
          tokenId: tokenId.toString(),
          mintTxHash,
        });
      }

      const updatedBadge = await storage.getMerchantBadge(merchant.id);
      res.json({ success: true, badge: updatedBadge });
    } catch (error) {
      console.error("Record badge mint error:", error);
      res.status(500).json({ error: "Failed to record badge mint" });
    }
  });
}
