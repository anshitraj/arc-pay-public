-- Add merchant status enum and column
-- Migration: add_merchant_status

-- Create merchant_status enum
DO $$ BEGIN
    CREATE TYPE merchant_status AS ENUM ('demo', 'pending_verification', 'verified');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add status column to merchants table (default to 'demo' for existing merchants)
ALTER TABLE merchants 
ADD COLUMN IF NOT EXISTS status merchant_status NOT NULL DEFAULT 'demo';

-- Set status based on existing badge ownership (optional, for migration)
-- Merchants with badges can be set to 'verified' if desired
-- This is optional and can be done manually or via admin panel

