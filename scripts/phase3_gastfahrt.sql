

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS is_gastfahrt BOOLEAN DEFAULT false;

ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS is_gastfahrt BOOLEAN DEFAULT false;

COMMENT ON COLUMN plans.is_gastfahrt IS
  'TRUE = employee travels as passenger on this leg (not driver). Informational for reporting / payroll distinction only.';
COMMENT ON COLUMN time_entries.is_gastfahrt IS
  'Mirrors plans.is_gastfahrt for realized time. Used by exports and lists.';
