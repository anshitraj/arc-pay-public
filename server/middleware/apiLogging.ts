/**
 * Enhanced API Logging Middleware
 * Adds correlation IDs, merchant scoping, and error trace linking
 */

import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import { db } from "../db.js";
import { apiRequestLogs } from "../../shared/schema.js";

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
  }
}

/**
 * Generate correlation ID for request tracking
 */
function generateRequestId(): string {
  return `req_${randomBytes(16).toString("hex")}`;
}

/**
 * Enhanced API logging middleware
 * Logs all API requests with correlation IDs, merchant scoping, and error tracking
 */
export function apiLogging(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = generateRequestId();
  req.requestId = requestId;

  // Capture response
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  let errorTrace: string | null = null;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Capture errors
  const originalResStatus = res.status;
  res.status = function (code: number) {
    if (code >= 400) {
      // Capture error if available
      const error = (res as any).error;
      if (error && error.stack) {
        errorTrace = error.stack;
      }
    }
    return originalResStatus.apply(res, [code]);
  };

  res.on("finish", async () => {
    const duration = Date.now() - start;
    const path = req.path;

    if (path.startsWith("/api")) {
      // Log to console (existing behavior)
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms [${requestId}]`;
      if (req.merchant) {
        logLine += ` [merchant:${req.merchant.id}]`;
      }
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      console.log(logLine);

      // Store in database (non-blocking, fire-and-forget)
      // Use setImmediate to ensure this doesn't block the response
      setImmediate(async () => {
        try {
          await db.insert(apiRequestLogs).values({
            requestId,
            merchantId: req.merchant?.id || null,
            method: req.method,
            path,
            statusCode: res.statusCode,
            latency: duration,
            ipAddress: req.ip || req.socket.remoteAddress || null,
            userAgent: req.headers["user-agent"] || null,
            errorTrace: errorTrace || null,
          });
        } catch (error) {
          // Don't block request if logging fails - silent fail in production
          if (process.env.NODE_ENV === "development") {
            console.error("Failed to log API request:", error);
          }
        }
      });
    }
  });

  next();
}

