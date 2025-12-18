/**
 * API Keys Routes
 * Handles API key management for developers
 */

import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { rateLimit } from "../middleware/rateLimit";
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { apiKeys } from "@shared/schema";
import { db } from "../db";

function requireAuth(req: Request, res: Response, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

const regenerateKeySchema = z.object({
  keyType: z.enum(["publishable", "secret"]),
  mode: z.enum(["test", "live"]),
});

const createKeySchema = z.object({
  mode: z.enum(["test", "live"]).optional(),
  name: z.string().optional(),
});

const updateKeyNameSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(100, "Name is too long"),
});

/**
 * Generate API key with prefix
 */
function generateApiKey(prefix: string): string {
  const randomPart = randomBytes(24).toString("hex");
  return `${prefix}${randomPart}`;
}

/**
 * Get wallet address for merchant, using merchant ID as fallback if wallet address is not set
 */
function getMerchantWalletAddress(merchant: { id: string; walletAddress: string | null }): string {
  if (merchant.walletAddress) {
    return merchant.walletAddress.toLowerCase();
  }
  // Use merchant ID as fallback - create deterministic wallet-like address
  // Hash the merchant ID to get a consistent 40-character hex string
  const hash = createHash('sha256').update(merchant.id).digest('hex');
  return `0x${hash.slice(0, 40)}`;
}

/**
 * Hash API key for storage
 */
function hashApiKey(key: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(key, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify API key against hash
 */
function verifyApiKey(key: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const hashBuffer = Buffer.from(hash, "hex");
  const testHash = scryptSync(key, salt, 64);
  return timingSafeEqual(hashBuffer, testHash);
}

export function registerApiKeyRoutes(app: Express) {
  // Create API keys for merchant (for current mode)
  app.post("/api/developers/api-keys/create", requireAuth, rateLimit, async (req, res) => {
    try {
      if (!req.session.merchantId) {
        return res.status(401).json({ error: "No merchant found" });
      }

      const result = createKeySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const merchant = await storage.getMerchant(req.session.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const { mode, name } = result.data;
      const targetMode = mode === "test" ? "test" : "live";

      const walletAddress = getMerchantWalletAddress(merchant);
      let apiKeys = await storage.getApiKeys(walletAddress);
      
      // Enforce limit of 2 keys total
      if (apiKeys.length >= 2) {
        return res.status(400).json({ error: "Maximum limit of 2 API keys reached. Please delete an existing key before creating a new one." });
      }
      
      // Check if keys already exist for this mode
      const hasPublishable = apiKeys.some(k => k.keyType === "publishable" && k.mode === targetMode);
      const hasSecret = apiKeys.some(k => k.keyType === "secret" && k.mode === targetMode);

      if (hasPublishable && hasSecret) {
        return res.status(400).json({ error: `API keys already exist for ${targetMode} mode` });
      }

      const newKeys: any[] = [];
      
      if (!hasPublishable) {
        const prefix = `pk_arc_${targetMode}_`;
        const key = generateApiKey(prefix);
        const newKey = await storage.createApiKey({
          walletAddress: walletAddress,
          keyType: "publishable",
          mode: targetMode,
          keyPrefix: key,
          hashedKey: "",
          name: name || undefined,
        });
        newKeys.push(newKey);
      }
      
      if (!hasSecret) {
        const prefix = `sk_arc_${targetMode}_`;
        const key = generateApiKey(prefix);
        const hashedKey = hashApiKey(key);
        const newKey = await storage.createApiKey({
          walletAddress: walletAddress,
          keyType: "secret",
          mode: targetMode,
          keyPrefix: key,
          hashedKey,
          name: name || undefined,
        });
        newKeys.push(newKey);
      }

      // Refresh keys list
      apiKeys = await storage.getApiKeys(walletAddress);
      
      res.json({ 
        message: "API keys created successfully",
        keys: apiKeys.filter(k => k.mode === targetMode)
      });
    } catch (error) {
      console.error("Create API keys error:", error);
      res.status(500).json({ error: "Failed to create API keys" });
    }
  });

  // Get all API keys for merchant
  app.get("/api/developers/api-keys", requireAuth, rateLimit, async (req, res) => {
    try {
      if (!req.session.merchantId) {
        return res.status(401).json({ error: "No merchant found" });
      }

      const merchant = await storage.getMerchant(req.session.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const walletAddress = getMerchantWalletAddress(merchant);
      let apiKeys = await storage.getApiKeys(walletAddress);
      
      // Auto-create keys if they don't exist
      const hasTestPublishable = apiKeys.some(k => k.keyType === "publishable" && k.mode === "test");
      const hasTestSecret = apiKeys.some(k => k.keyType === "secret" && k.mode === "test");
      const hasLivePublishable = apiKeys.some(k => k.keyType === "publishable" && k.mode === "live");
      const hasLiveSecret = apiKeys.some(k => k.keyType === "secret" && k.mode === "live");

      // Create missing keys
      const newKeys: any[] = [];
      
      if (!hasTestPublishable) {
        const prefix = "pk_arc_test_";
        const key = generateApiKey(prefix);
        const newKey = await storage.createApiKey({
          walletAddress: walletAddress,
          keyType: "publishable",
          mode: "test",
          keyPrefix: key,
          hashedKey: "",
          name: undefined,
        });
        newKeys.push(newKey);
      }
      
      if (!hasTestSecret) {
        const prefix = "sk_arc_test_";
        const key = generateApiKey(prefix);
        const hashedKey = hashApiKey(key);
        const newKey = await storage.createApiKey({
          walletAddress: walletAddress,
          keyType: "secret",
          mode: "test",
          keyPrefix: key,
          hashedKey,
          name: undefined,
        });
        newKeys.push(newKey);
      }
      
      if (!hasLivePublishable) {
        const prefix = "pk_arc_live_";
        const key = generateApiKey(prefix);
        const newKey = await storage.createApiKey({
          walletAddress: walletAddress,
          keyType: "publishable",
          mode: "live",
          keyPrefix: key,
          hashedKey: "",
          name: undefined,
        });
        newKeys.push(newKey);
      }
      
      if (!hasLiveSecret) {
        const prefix = "sk_arc_live_";
        const key = generateApiKey(prefix);
        const hashedKey = hashApiKey(key);
        const newKey = await storage.createApiKey({
          walletAddress: walletAddress,
          keyType: "secret",
          mode: "live",
          keyPrefix: key,
          hashedKey,
          name: undefined,
        });
        newKeys.push(newKey);
      }

      // Refresh keys list
      if (newKeys.length > 0) {
        apiKeys = await storage.getApiKeys(walletAddress);
      }
      
      res.json(apiKeys);
    } catch (error) {
      console.error("Get API keys error:", error);
      res.status(500).json({ error: "Failed to get API keys" });
    }
  });

  // Reveal secret key (requires confirmation)
  app.post("/api/developers/api-keys/:id/reveal", requireAuth, rateLimit, async (req, res) => {
    try {
      if (!req.session.merchantId) {
        return res.status(401).json({ error: "No merchant found" });
      }

      const merchant = await storage.getMerchant(req.session.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const walletAddress = getMerchantWalletAddress(merchant);
      const apiKey = await storage.getApiKey(req.params.id);
      if (!apiKey) {
        return res.status(404).json({ error: "API key not found" });
      }

      if (apiKey.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (apiKey.keyType !== "secret") {
        return res.status(400).json({ error: "Only secret keys can be revealed" });
      }

      // Get full key from storage (we need to store it temporarily or reconstruct)
      // For now, return the key prefix (in production, you'd decrypt or retrieve from secure storage)
      const fullKey = await storage.getApiKeyFullValue(req.params.id);
      
      res.json({ fullKey });
    } catch (error) {
      console.error("Reveal API key error:", error);
      res.status(500).json({ error: "Failed to reveal API key" });
    }
  });

  // Regenerate API key
  app.post("/api/developers/api-keys/:id/regenerate", requireAuth, rateLimit, async (req, res) => {
    try {
      if (!req.session.merchantId) {
        return res.status(401).json({ error: "No merchant found" });
      }

      const result = regenerateKeySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const merchant = await storage.getMerchant(req.session.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const walletAddress = getMerchantWalletAddress(merchant);
      const existingKey = await storage.getApiKey(req.params.id);
      if (!existingKey) {
        return res.status(404).json({ error: "API key not found" });
      }

      if (existingKey.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Revoke old key
      await storage.revokeApiKey(req.params.id);

      // Generate new key
      const prefix = result.data.keyType === "publishable" 
        ? `pk_arc_${result.data.mode}_` 
        : `sk_arc_${result.data.mode}_`;
      const newKey = generateApiKey(prefix);
      const hashedKey = result.data.keyType === "secret" ? hashApiKey(newKey) : "";

      // Store full key temporarily for retrieval (in production, use secure vault)
      // For MVP, we'll store it in the keyPrefix for now (not secure, but functional)
      // Better: Create a secure_keys table with encryption
      const fullKeyPrefix = newKey; // Store full key in prefix for MVP
      
      const newApiKey = await storage.createApiKey({
        walletAddress: walletAddress,
        keyType: result.data.keyType,
        mode: result.data.mode,
        keyPrefix: fullKeyPrefix, // Store full key here for MVP
        hashedKey,
        name: existingKey.name || undefined, // Preserve name when regenerating
      });

      // Log regeneration event
      await storage.logApiKeyEvent({
        apiKeyId: newApiKey.id,
        eventType: "regenerated",
        metadata: { oldKeyId: req.params.id },
      });

      res.json({ 
        id: newApiKey.id,
        fullKey: newKey, // Return full key only on regeneration
        keyType: newApiKey.keyType,
        mode: newApiKey.mode,
      });
    } catch (error) {
      console.error("Regenerate API key error:", error);
      res.status(500).json({ error: "Failed to regenerate API key" });
    }
  });

  // Delete API key
  app.delete("/api/developers/api-keys/:id", requireAuth, rateLimit, async (req, res) => {
    try {
      if (!req.session.merchantId) {
        return res.status(401).json({ error: "No merchant found" });
      }

      const merchant = await storage.getMerchant(req.session.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const walletAddress = getMerchantWalletAddress(merchant);
      const existingKey = await storage.getApiKey(req.params.id);
      if (!existingKey) {
        return res.status(404).json({ error: "API key not found" });
      }

      if (existingKey.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Delete the key
      await storage.deleteApiKey(req.params.id);

      // Log deletion event
      await storage.logApiKeyEvent({
        apiKeyId: req.params.id,
        eventType: "deleted",
        metadata: { keyType: existingKey.keyType, mode: existingKey.mode },
      });

      res.json({ message: "API key deleted successfully" });
    } catch (error) {
      console.error("Delete API key error:", error);
      res.status(500).json({ error: "Failed to delete API key" });
    }
  });

  // Update API key name
  app.put("/api/developers/api-keys/:id/name", requireAuth, rateLimit, async (req, res) => {
    try {
      if (!req.session.merchantId) {
        return res.status(401).json({ error: "No merchant found" });
      }

      const result = updateKeyNameSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const merchant = await storage.getMerchant(req.session.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const walletAddress = getMerchantWalletAddress(merchant);
      const existingKey = await storage.getApiKey(req.params.id);
      if (!existingKey) {
        return res.status(404).json({ error: "API key not found" });
      }

      if (existingKey.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Update the name
      await db
        .update(apiKeys)
        .set({ name: result.data.name })
        .where(eq(apiKeys.id, req.params.id));

      const updatedKey = await storage.getApiKey(req.params.id);

      res.json({ 
        message: "API key name updated successfully",
        key: updatedKey
      });
    } catch (error) {
      console.error("Update API key name error:", error);
      res.status(500).json({ error: "Failed to update API key name" });
    }
  });
}

