-- =============================================================================
--  20260424130000_betriebsstellen_phone.sql
--  CR #1 follow-up — phone_number per Betriebsstelle.
--
--  The Rheinmaasrail brief says "If possible, also allow a phone number per
--  location." This migration adds the column. Idempotent + reversible.
-- =============================================================================

BEGIN;

ALTER TABLE public.operational_locations
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

COMMENT ON COLUMN public.operational_locations.phone_number IS
  'Optional contact number for the Betriebsstelle (CR #1 follow-up).';

COMMIT;

-- Rollback:
--   ALTER TABLE public.operational_locations DROP COLUMN IF EXISTS phone_number;
