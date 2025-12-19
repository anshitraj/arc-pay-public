-- Migration: Add settlement currency and payment asset fields to payments table
-- Date: 2024
-- Description: Adds settlementCurrency, paymentAsset, paymentChainId, conversionPath, and estimatedFees fields
--              to support multi-asset payments with transparent conversion flows

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS settlement_currency TEXT NOT NULL DEFAULT 'USDC';

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_asset TEXT;

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_chain_id INTEGER;

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS conversion_path TEXT;

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS estimated_fees DECIMAL(18, 6);

-- Note: This migration should be run if the columns don't exist
-- The schema change is defined in shared/schema.ts
-- After running this, you can also run `npm run db:push` to ensure schema sync

