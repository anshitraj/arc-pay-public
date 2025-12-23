/**
 * Supabase Edge Function Template for ArcPay Webhooks
 * 
 * SETUP INSTRUCTIONS:
 * 1. Copy this file to your Supabase project: supabase/functions/arcpay-webhook/index.ts
 * 2. Set WEBHOOK_SECRET environment variable in Supabase dashboard
 * 3. Deploy: supabase functions deploy arcpay-webhook
 * 4. Copy the function URL and add it as a webhook endpoint in ArcPay dashboard
 * 
 * This function automatically saves payment data to your Supabase database.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Get webhook secret from environment
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || "";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Verify webhook signature
 */
async function verifySignature(payload: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedSignature === signature.toLowerCase();
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get signature from headers
    const signature = req.headers.get("x-arc-signature") || "";
    const eventType = req.headers.get("x-arc-event-type") || "";

    // Read request body
    const body = await req.text();

    // Verify signature
    if (!await verifySignature(body, signature)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse event data
    const event = JSON.parse(body);

    // Handle different event types
    switch (event.type) {
      case "payment.intent.completed":
      case "payment.succeeded":
        // Save payment to database
        const { data: payment, error: paymentError } = await supabase
          .from("arcpay_payments")
          .insert({
            payment_id: event.data.id,
            amount: event.data.amount,
            currency: event.data.currency,
            status: event.data.status,
            tx_hash: event.data.txHash,
            payer_wallet: event.data.payerWallet,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (paymentError) {
          console.error("Error saving payment:", paymentError);
          return new Response(JSON.stringify({ error: "Database error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ received: true, payment }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      case "invoice.paid":
        // Save invoice to database
        const { data: invoice, error: invoiceError } = await supabase
          .from("arcpay_invoices")
          .insert({
            invoice_id: event.data.id,
            invoice_number: event.data.invoiceNumber,
            amount: event.data.amount,
            currency: event.data.currency,
            status: event.data.status,
            customer_email: event.data.customerEmail,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (invoiceError) {
          console.error("Error saving invoice:", invoiceError);
          return new Response(JSON.stringify({ error: "Database error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ received: true, invoice }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      case "payout.completed":
        // Save payout to database
        const { data: payout, error: payoutError } = await supabase
          .from("arcpay_payouts")
          .insert({
            payout_id: event.data.id,
            amount: event.data.amount,
            currency: event.data.currency,
            tx_hash: event.data.txHash,
            status: "completed",
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (payoutError) {
          console.error("Error saving payout:", payoutError);
          return new Response(JSON.stringify({ error: "Database error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ received: true, payout }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      default:
        // Unknown event type - just acknowledge
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

