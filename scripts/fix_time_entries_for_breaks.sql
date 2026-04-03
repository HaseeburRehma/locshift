-- Phase 1: Database Migration for Time Entries & Breaks
-- 1. Make end_time nullable for active shifts
-- 2. Add break tracking columns
-- 3. Update net_hours to be regular (not generated) for flexibility

ALTER TABLE time_entries 
  ALTER COLUMN end_time DROP NOT NULL;

-- Since net_hours is generated and relies on end_time, we drop it and recreate it as a normal column
ALTER TABLE time_entries
  DROP COLUMN net_hours;

ALTER TABLE time_entries
  ADD COLUMN net_hours NUMERIC(10,2) DEFAULT 0;

-- Break tracking columns
ALTER TABLE time_entries
  ADD COLUMN is_on_break BOOLEAN DEFAULT false,
  ADD COLUMN current_break_start TIMESTAMPTZ,
  ADD COLUMN total_break_seconds INTEGER DEFAULT 0;

-- Ensure RLS is updated if needed (usually not if just adding columns)
COMMENT ON COLUMN time_entries.is_on_break IS 'True if the employee is currently in a break session';
COMMENT ON COLUMN time_entries.current_break_start IS 'Timestamp when the current break began';
COMMENT ON COLUMN time_entries.total_break_seconds IS 'Accumulated break duration in seconds for this shift';
