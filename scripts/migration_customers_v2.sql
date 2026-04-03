-- Migration: Update Customers Table for Operations Console v2
-- 1. Add missing specific contact info and notes
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Backfill existing contact_info if possible
-- (Optionally parse if it was structured, but standard practice is just simple expansion)

COMMENT ON COLUMN customers.email IS 'Primary contact email for the customer account';
COMMENT ON COLUMN customers.phone IS 'Primary contact phone for the customer account';
COMMENT ON COLUMN customers.notes IS 'Internal operational notes (non-public)';
