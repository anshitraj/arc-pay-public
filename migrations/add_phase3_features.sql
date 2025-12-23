-- Migration: Add Phase 3 features
-- Adds: Subscriptions, Payouts, Fees & Splits, Integration support
-- All tables are ADDITIVE - no breaking changes

-- Add new webhook event types
DO $$ 
BEGIN
  -- Subscription events
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'subscription.created' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'webhook_event_type')
  ) THEN
    ALTER TYPE webhook_event_type ADD VALUE 'subscription.created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'subscription.invoice_generated' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'webhook_event_type')
  ) THEN
    ALTER TYPE webhook_event_type ADD VALUE 'subscription.invoice_generated';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'subscription.past_due' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'webhook_event_type')
  ) THEN
    ALTER TYPE webhook_event_type ADD VALUE 'subscription.past_due';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'subscription.canceled' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'webhook_event_type')
  ) THEN
    ALTER TYPE webhook_event_type ADD VALUE 'subscription.canceled';
  END IF;
  
  -- Payout events
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'payout.created' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'webhook_event_type')
  ) THEN
    ALTER TYPE webhook_event_type ADD VALUE 'payout.created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'payout.completed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'webhook_event_type')
  ) THEN
    ALTER TYPE webhook_event_type ADD VALUE 'payout.completed';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'payout.failed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'webhook_event_type')
  ) THEN
    ALTER TYPE webhook_event_type ADD VALUE 'payout.failed';
  END IF;
END $$;

-- Create subscription status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'canceled', 'past_due');
  END IF;
END $$;

-- Create subscription interval enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_interval') THEN
    CREATE TYPE subscription_interval AS ENUM ('monthly', 'yearly');
  END IF;
END $$;

-- Create payout status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
    CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');
  END IF;
END $$;

-- Create ledger entry type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_entry_type') THEN
    CREATE TYPE ledger_entry_type AS ENUM ('fee', 'split', 'payout', 'refund');
  END IF;
END $$;

-- Phase 3A: Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id VARCHAR NOT NULL REFERENCES merchants(id),
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  amount DECIMAL(18, 6) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  interval subscription_interval NOT NULL DEFAULT 'monthly',
  status subscription_status NOT NULL DEFAULT 'active',
  next_billing_at TIMESTAMP NOT NULL,
  grace_period_days INTEGER NOT NULL DEFAULT 7,
  canceled_at TIMESTAMP,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription_schedules (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id VARCHAR NOT NULL REFERENCES subscriptions(id),
  scheduled_at TIMESTAMP NOT NULL,
  executed_at TIMESTAMP,
  invoice_id VARCHAR REFERENCES invoices(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id VARCHAR NOT NULL REFERENCES subscriptions(id),
  invoice_id VARCHAR NOT NULL REFERENCES invoices(id),
  payment_id VARCHAR REFERENCES payments(id),
  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Phase 3B: Payouts
CREATE TABLE IF NOT EXISTS payouts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id VARCHAR NOT NULL REFERENCES merchants(id),
  amount DECIMAL(18, 6) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  destination_wallet TEXT NOT NULL,
  destination_chain_id INTEGER NOT NULL DEFAULT 5042002,
  status payout_status NOT NULL DEFAULT 'pending',
  tx_hash TEXT,
  failure_reason TEXT,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS payout_attempts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id VARCHAR NOT NULL REFERENCES payouts(id),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Phase 3C: Fees & Splits
CREATE TABLE IF NOT EXISTS fee_rules (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id VARCHAR REFERENCES merchants(id),
  fee_type TEXT NOT NULL,
  fee_basis_points INTEGER,
  fee_fixed_amount DECIMAL(18, 6),
  currency TEXT NOT NULL DEFAULT 'USDC',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS split_rules (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id VARCHAR NOT NULL REFERENCES merchants(id),
  recipient_wallet TEXT NOT NULL,
  split_basis_points INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id VARCHAR NOT NULL REFERENCES merchants(id),
  payment_id VARCHAR REFERENCES payments(id),
  entry_type ledger_entry_type NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  description TEXT,
  fee_rule_id VARCHAR REFERENCES fee_rules(id),
  split_rule_id VARCHAR REFERENCES split_rules(id),
  metadata TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_merchant_id ON subscriptions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_at ON subscriptions(next_billing_at);
CREATE INDEX IF NOT EXISTS idx_subscription_schedules_subscription_id ON subscription_schedules(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_schedules_status ON subscription_schedules(status);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_subscription_id ON subscription_invoices(subscription_id);

CREATE INDEX IF NOT EXISTS idx_payouts_merchant_id ON payouts(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payout_attempts_payout_id ON payout_attempts(payout_id);

CREATE INDEX IF NOT EXISTS idx_fee_rules_merchant_id ON fee_rules(merchant_id);
CREATE INDEX IF NOT EXISTS idx_fee_rules_active ON fee_rules(active);
CREATE INDEX IF NOT EXISTS idx_split_rules_merchant_id ON split_rules(merchant_id);
CREATE INDEX IF NOT EXISTS idx_split_rules_active ON split_rules(active);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_merchant_id ON ledger_entries(merchant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_payment_id ON ledger_entries(payment_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_entry_type ON ledger_entries(entry_type);

