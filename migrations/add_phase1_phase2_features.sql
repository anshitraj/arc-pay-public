-- Migration: Add Phase 1 and Phase 2 features
-- Adds: idempotency keys, API logs, payment audit logs, settlement routes, FX quotes
-- Adds: payment.intent.* webhook event types

-- Add idempotency key to payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create index on idempotency key for fast lookups
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(merchant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Add new webhook event types
DO $$ 
BEGIN
  -- Add payment.intent.* event types if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'payment.intent.created' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'webhook_event_type')
  ) THEN
    ALTER TYPE webhook_event_type ADD VALUE 'payment.intent.created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'payment.intent.pending' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'webhook_event_type')
  ) THEN
    ALTER TYPE webhook_event_type ADD VALUE 'payment.intent.pending';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'payment.intent.completed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'webhook_event_type')
  ) THEN
    ALTER TYPE webhook_event_type ADD VALUE 'payment.intent.completed';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'payment.intent.failed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'webhook_event_type')
  ) THEN
    ALTER TYPE webhook_event_type ADD VALUE 'payment.intent.failed';
  END IF;
END $$;

-- Create API request logs table
CREATE TABLE IF NOT EXISTS api_request_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  merchant_id VARCHAR REFERENCES merchants(id),
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  latency INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  error_trace TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index on request_id for correlation tracking
CREATE INDEX IF NOT EXISTS idx_api_request_logs_request_id ON api_request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_merchant_id ON api_request_logs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON api_request_logs(created_at DESC);

-- Create payment audit logs table
CREATE TABLE IF NOT EXISTS payment_audit_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id VARCHAR NOT NULL REFERENCES payments(id),
  merchant_id VARCHAR NOT NULL REFERENCES merchants(id),
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes on payment audit logs
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_payment_id ON payment_audit_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_merchant_id ON payment_audit_logs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_created_at ON payment_audit_logs(created_at DESC);

-- Create settlement route type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'settlement_route_type') THEN
    CREATE TYPE settlement_route_type AS ENUM ('same_chain', 'cctp');
  END IF;
END $$;

-- Create settlement route status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'settlement_route_status') THEN
    CREATE TYPE settlement_route_status AS ENUM ('pending', 'processing', 'completed', 'failed');
  END IF;
END $$;

-- Create settlement routes table
CREATE TABLE IF NOT EXISTS settlement_routes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id VARCHAR NOT NULL REFERENCES payments(id),
  merchant_id VARCHAR NOT NULL REFERENCES merchants(id),
  route_type settlement_route_type NOT NULL,
  source_chain_id INTEGER,
  destination_chain_id INTEGER NOT NULL,
  source_currency TEXT NOT NULL,
  destination_currency TEXT NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  status settlement_route_status NOT NULL DEFAULT 'pending',
  cctp_burn_tx_hash TEXT,
  cctp_mint_tx_hash TEXT,
  cctp_attestation TEXT,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes on settlement routes
CREATE INDEX IF NOT EXISTS idx_settlement_routes_payment_id ON settlement_routes(payment_id);
CREATE INDEX IF NOT EXISTS idx_settlement_routes_merchant_id ON settlement_routes(merchant_id);
CREATE INDEX IF NOT EXISTS idx_settlement_routes_status ON settlement_routes(status);

-- Create FX quote status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fx_quote_status') THEN
    CREATE TYPE fx_quote_status AS ENUM ('active', 'expired', 'used');
  END IF;
END $$;

-- Create FX quotes table
CREATE TABLE IF NOT EXISTS fx_quotes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id VARCHAR REFERENCES payments(id),
  merchant_id VARCHAR REFERENCES merchants(id),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(18, 8) NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  converted_amount DECIMAL(18, 6) NOT NULL,
  status fx_quote_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP NOT NULL,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes on FX quotes
CREATE INDEX IF NOT EXISTS idx_fx_quotes_payment_id ON fx_quotes(payment_id);
CREATE INDEX IF NOT EXISTS idx_fx_quotes_merchant_id ON fx_quotes(merchant_id);
CREATE INDEX IF NOT EXISTS idx_fx_quotes_status ON fx_quotes(status);
CREATE INDEX IF NOT EXISTS idx_fx_quotes_expires_at ON fx_quotes(expires_at);

