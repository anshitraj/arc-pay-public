-- Supabase SQL Schema for ArcPay Integration
-- 
-- SETUP INSTRUCTIONS:
-- 1. Copy this SQL to your Supabase SQL Editor
-- 2. Run the SQL to create the tables
-- 3. Set up the Edge Function (see supabase-edge-function.ts)
-- 4. Configure webhook in ArcPay dashboard
--
-- This schema stores payment, invoice, and payout data from ArcPay webhooks.

-- Payments table
CREATE TABLE IF NOT EXISTS arcpay_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  status TEXT NOT NULL,
  tx_hash TEXT,
  payer_wallet TEXT,
  merchant_wallet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS arcpay_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id TEXT UNIQUE NOT NULL,
  invoice_number TEXT NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  status TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payouts table
CREATE TABLE IF NOT EXISTS arcpay_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  tx_hash TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_arcpay_payments_payment_id ON arcpay_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_arcpay_payments_status ON arcpay_payments(status);
CREATE INDEX IF NOT EXISTS idx_arcpay_payments_created_at ON arcpay_payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_arcpay_invoices_invoice_id ON arcpay_invoices(invoice_id);
CREATE INDEX IF NOT EXISTS idx_arcpay_invoices_status ON arcpay_invoices(status);
CREATE INDEX IF NOT EXISTS idx_arcpay_invoices_customer_email ON arcpay_invoices(customer_email);

CREATE INDEX IF NOT EXISTS idx_arcpay_payouts_payout_id ON arcpay_payouts(payout_id);
CREATE INDEX IF NOT EXISTS idx_arcpay_payouts_status ON arcpay_payouts(status);

