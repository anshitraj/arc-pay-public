-- Migration: Add country column to merchant_profiles table
-- Date: 2024
-- Description: Adds country field to merchant profiles for business activation

ALTER TABLE merchant_profiles 
ADD COLUMN IF NOT EXISTS country TEXT;

-- Note: This migration should be run if the column doesn't exist
-- The schema change is defined in shared/schema.ts
-- After running this, you can also run `npm run db:push` to ensure schema sync

