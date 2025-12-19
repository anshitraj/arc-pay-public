-- Add default_gas_sponsorship column to merchant_profiles table
ALTER TABLE merchant_profiles
ADD COLUMN IF NOT EXISTS default_gas_sponsorship BOOLEAN NOT NULL DEFAULT false;

