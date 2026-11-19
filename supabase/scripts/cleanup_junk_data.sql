-- =============================================================================
-- LokShift: remove old, unused rows. Run in the Supabase SQL editor.
-- Counts on 2026-11-19 are in the comments. Nothing here signs anyone out.
-- =============================================================================
BEGIN;

-- 1. Revoked login tokens older than a day (53 of 67). Active tokens stay.
DELETE FROM auth.refresh_tokens
 WHERE revoked AND updated_at < now() - interval '1 day';

-- 2. Auth audit log older than 30 days (2,152 of 2,343).
DELETE FROM auth.audit_log_entries
 WHERE created_at < now() - interval '30 days';

-- 3. Unfinished login/reset flows older than a day (27 of 32).
DELETE FROM auth.flow_state
 WHERE created_at < now() - interval '1 day';

-- 4. OPTIONAL – read notifications older than 90 days (36 of 88).
--    Users no longer see these in their history. Remove the "--" to include.
-- DELETE FROM public.notifications
--  WHERE is_read AND created_at < now() - interval '90 days';

COMMIT;

-- Check (should show 0 / 0 / 0):
SELECT
  (SELECT count(*) FROM auth.refresh_tokens   WHERE revoked AND updated_at < now() - interval '1 day') AS old_revoked_tokens,
  (SELECT count(*) FROM auth.audit_log_entries WHERE created_at < now() - interval '30 days')          AS old_audit_rows,
  (SELECT count(*) FROM auth.flow_state        WHERE created_at < now() - interval '1 day')            AS old_flows;
