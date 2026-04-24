

ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS is_planned BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_time_entries_planned
  ON time_entries (organization_id, employee_id, is_planned, date);

COMMENT ON COLUMN time_entries.is_planned IS
  'TRUE = future/anticipated entry not yet worked. Flip to FALSE after the shift happens to convert to an actual record.';
