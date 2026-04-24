

BEGIN;

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS reminder_minutes_before INTEGER
    CHECK (reminder_minutes_before IS NULL OR reminder_minutes_before >= 0);

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Partial index: the cron worker only scans events that still need to fire
CREATE INDEX IF NOT EXISTS idx_calendar_events_reminder_due
  ON public.calendar_events (start_time)
  WHERE reminder_minutes_before IS NOT NULL
    AND reminder_sent_at IS NULL;

COMMENT ON COLUMN public.calendar_events.reminder_minutes_before IS
  'Minutes before start_time when a reminder should be dispatched. NULL = no reminder.';
COMMENT ON COLUMN public.calendar_events.reminder_sent_at IS
  'Timestamp at which the reminder was emitted — prevents the cron worker from re-firing.';

COMMIT;
