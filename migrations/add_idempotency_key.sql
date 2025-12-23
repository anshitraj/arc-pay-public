-- Migration: Add idempotency_key column to payments table
-- This column was part of Phase 1/Phase 2 but may not have been applied

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);

