
-- 1. Organizations: configurable Spesen rates
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS spesen_rate_partial NUMERIC(10,2) DEFAULT 14.00,
  ADD COLUMN IF NOT EXISTS spesen_rate_full    NUMERIC(10,2) DEFAULT 28.00;

-- 2. Plans: overnight stay + hotel
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS overnight_stay BOOLEAN  DEFAULT false,
  ADD COLUMN IF NOT EXISTS hotel_address  TEXT;

-- 3. Time entries: overnight stay + hotel + computed meal allowance
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS overnight_stay BOOLEAN       DEFAULT false,
  ADD COLUMN IF NOT EXISTS hotel_address  TEXT,
  ADD COLUMN IF NOT EXISTS meal_allowance NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN time_entries.meal_allowance IS
  'Spesen (meal allowance) in EUR for this entry. Calculated client-side from org rates when the entry is saved — see lib/spesen.ts.';
