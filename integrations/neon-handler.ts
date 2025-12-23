/**
 * Neon DB Webhook Handler Template
 * 
 * SETUP INSTRUCTIONS:
 * 1. Copy this file to your Next.js/Express project
 * 2. Install dependencies: npm install @neondatabase/serverless crypto
 * 3. Set DATABASE_URL and WEBHOOK_SECRET environment variables
 * 4. Deploy your API route (e.g., /api/webhooks/arcpay)
 * 5. Copy the route URL and add it as a webhook endpoint in ArcPay dashboard
 * 
 * This handler automatically saves payment data to your Neon database.
 */

import { neon } from "@neondatabase/serverless";
import { createHmac, timingSafeEqual } from "crypto";

// Initialize Neon client
const sql = neon(process.env.DATABASE_URL!);
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

/**
 * Verify webhook signature
 */
function verifySignature(payload: string, signature: string): boolean {
  const hmac = createHmac("sha256", WEBHOOK_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex");
  
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");
  
  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }
  
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * Webhook handler (Next.js API Route example)
 * For Express: app.post("/api/webhooks/arcpay", handler)
 */
export default async function handler(req: any, res: any) {
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Get signature from headers
    const signature = req.headers["x-arc-signature"] || "";
    const eventType = req.headers["x-arc-event-type"] || "";

    // Get raw body (important for signature verification)
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    // Verify signature
    if (!verifySignature(rawBody, signature)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Parse event data
    const event = JSON.parse(rawBody);

    // Handle different event types
    switch (event.type) {
      case "payment.intent.completed":
      case "payment.succeeded":
        // Save payment to database
        await sql`
          INSERT INTO arcpay_payments (
            payment_id, amount, currency, status, tx_hash, payer_wallet, created_at
          ) VALUES (
            ${event.data.id},
            ${event.data.amount},
            ${event.data.currency},
            ${event.data.status},
            ${event.data.txHash || null},
            ${event.data.payerWallet || null},
            NOW()
          )
          ON CONFLICT (payment_id) DO NOTHING
        `;
        return res.status(200).json({ received: true });

      case "invoice.paid":
        // Save invoice to database
        await sql`
          INSERT INTO arcpay_invoices (
            invoice_id, invoice_number, amount, currency, status, customer_email, customer_name, created_at
          ) VALUES (
            ${event.data.id},
            ${event.data.invoiceNumber},
            ${event.data.amount},
            ${event.data.currency},
            ${event.data.status},
            ${event.data.customerEmail},
            ${event.data.customerName || null},
            NOW()
          )
          ON CONFLICT (invoice_id) DO NOTHING
        `;
        return res.status(200).json({ received: true });

      case "payout.completed":
        // Save payout to database
        await sql`
          INSERT INTO arcpay_payouts (
            payout_id, amount, currency, tx_hash, status, created_at
          ) VALUES (
            ${event.data.id},
            ${event.data.amount},
            ${event.data.currency},
            ${event.data.txHash || null},
            'completed',
            NOW()
          )
          ON CONFLICT (payout_id) DO NOTHING
        `;
        return res.status(200).json({ received: true });

      default:
        // Unknown event type - just acknowledge
        return res.status(200).json({ received: true });
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Express.js example:
/*
import express from "express";
const app = express();
app.use(express.text({ type: "*/*" })); // Important: get raw body

app.post("/api/webhooks/arcpay", async (req, res) => {
  const signature = req.headers["x-arc-signature"] as string;
  const rawBody = req.body; // Raw body as string
  
  if (!verifySignature(rawBody, signature)) {
    return res.status(401).json({ error: "Invalid signature" });
  }
  
  const event = JSON.parse(rawBody);
  // ... handle event (same as above)
});
*/

