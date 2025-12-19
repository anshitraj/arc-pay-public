-- Migration: Add name column to api_keys table
-- Date: 2024
-- Description: Adds an optional name field to API keys for better organization

ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Note: This migration is automatically applied when running `npm run db:push`
-- The schema change is defined in shared/schema.ts







