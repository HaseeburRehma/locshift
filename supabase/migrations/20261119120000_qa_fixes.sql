-- =============================================================================
-- QA 19.11.2026 fixes (LokShift – Fix List & Acceptance Criteria)
-- Idempotent: safe to run more than once.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. P0-2 · Middleware without database queries
--    The middleware already calls auth.getUser() (needed for the session
--    refresh). Role, onboarding and forced password change now travel in
--    the user's app_metadata, which only the server can write, so the
--    middleware needs no profiles lookup on every page view.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_profile_flags_to_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE auth.users
     SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
           'lokshift', jsonb_build_object(
             'role', NEW.role,
             'onboarding_completed', COALESCE(NEW.onboarding_completed, FALSE),
             'must_change_password', COALESCE(NEW.must_change_password, FALSE)
           ))
   WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_profile_flags_to_auth() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_sync_flags_to_auth ON public.profiles;
CREATE TRIGGER profiles_sync_flags_to_auth
  AFTER INSERT OR UPDATE OF role, onboarding_completed, must_change_password ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_flags_to_auth();

-- Backfill every existing account.
UPDATE auth.users u
   SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
         'lokshift', jsonb_build_object(
           'role', p.role,
           'onboarding_completed', COALESCE(p.onboarding_completed, FALSE),
           'must_change_password', COALESCE(p.must_change_password, FALSE)
         ))
  FROM public.profiles p
 WHERE p.id = u.id;

-- ---------------------------------------------------------------------------
-- 2. P2-6 · One rounding rule + P1-3 · approver always named
--    Same function as in 20261016120000_client_feedback_oct2026.sql with
--    two changes: net_hours counts whole minutes, and every approval
--    (direct, bulk, via correction) stores who approved it and when.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.time_entries_normalize()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_is_manager BOOLEAN := FALSE;
  v_core_changed BOOLEAN := FALSE;
  v_headers TEXT := NULLIF(current_setting('request.headers', true), '');
  -- Current apps send "x-lokshift-client: 2". Requests from a signed-in user
  -- without it come from the previous app version (no submit step).
  v_legacy BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NOT NULL THEN
    v_legacy := COALESCE(v_headers::JSON ->> 'x-lokshift-client', '') = '';
  END IF;

  -- Safety net for clients that stored an overnight end on the start date
  -- (one calendar day in Europe/Berlin, so the DST night stays correct).
  IF NEW.end_time IS NOT NULL AND NEW.end_time < NEW.start_time THEN
    NEW.end_time := ((NEW.end_time AT TIME ZONE 'Europe/Berlin') + INTERVAL '1 day') AT TIME ZONE 'Europe/Berlin';
  END IF;
  IF NEW.end_time IS NOT NULL AND NEW.end_time < NEW.start_time THEN
    RAISE EXCEPTION 'Das Schichtende liegt vor dem Schichtbeginn.' USING ERRCODE = '22023';
  END IF;

  NEW.break_minutes := COALESCE(NEW.break_minutes, 0);
  IF NEW.break_minutes < 0 THEN
    RAISE EXCEPTION 'Die Pause darf nicht negativ sein.' USING ERRCODE = '22023';
  END IF;

  -- Single source of truth for worked hours.
  IF NEW.end_time IS NULL THEN
    NEW.net_hours := 0;
  ELSE
    -- Whole minutes, like every screen, PDF and Excel export (QA P2-6):
    -- seconds of a clocked time never turn 0 minutes into 0,01 h.
    NEW.net_hours := ROUND(GREATEST(0,
      EXTRACT(EPOCH FROM (date_trunc('minute', NEW.end_time) - date_trunc('minute', NEW.start_time))) / 3600.0
      - NEW.break_minutes / 60.0
    )::NUMERIC, 2);
  END IF;

  -- The originally clocked times are system-managed and immutable, so the
  -- record stays traceable after the employee corrects start/end.
  IF TG_OP = 'INSERT' THEN
    NEW.clock_start_time := CASE WHEN NEW.end_time IS NULL THEN NEW.start_time END;
    NEW.clock_end_time   := NULL;
    -- Clock-in: the shift belongs to the local (Berlin) day it starts on.
    IF NEW.end_time IS NULL AND NEW.start_time IS NOT NULL THEN
      NEW.date := (NEW.start_time AT TIME ZONE 'Europe/Berlin')::DATE;
    END IF;
  ELSE
    NEW.clock_start_time := OLD.clock_start_time;
    NEW.clock_end_time   := COALESCE(
      OLD.clock_end_time,
      CASE WHEN OLD.end_time IS NULL AND NEW.end_time IS NOT NULL AND OLD.clock_start_time IS NOT NULL
           THEN NEW.end_time END
    );
    -- change_reason only describes the current statement.
    IF NEW.change_reason IS NOT DISTINCT FROM OLD.change_reason THEN
      NEW.change_reason := NULL;
    END IF;
  END IF;

  IF v_uid IS NOT NULL THEN
    v_is_manager := public.is_admin_or_dispatcher_in(NEW.organization_id);
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.entered_by := COALESCE(v_uid, NEW.entered_by, NEW.employee_id);
  ELSE
    v_core_changed :=
         NEW.date                    IS DISTINCT FROM OLD.date
      OR NEW.start_time              IS DISTINCT FROM OLD.start_time
      OR NEW.end_time                IS DISTINCT FROM OLD.end_time
      OR NEW.break_minutes           IS DISTINCT FROM OLD.break_minutes
      OR NEW.customer_id             IS DISTINCT FROM OLD.customer_id
      OR NEW.notes                   IS DISTINCT FROM OLD.notes
      OR NEW.location                IS DISTINCT FROM OLD.location
      OR NEW.overnight_stay          IS DISTINCT FROM OLD.overnight_stay
      OR NEW.hotel_address           IS DISTINCT FROM OLD.hotel_address
      OR NEW.meal_allowance          IS DISTINCT FROM OLD.meal_allowance
      OR NEW.is_gastfahrt            IS DISTINCT FROM OLD.is_gastfahrt
      OR NEW.is_planned              IS DISTINCT FROM OLD.is_planned
      OR NEW.plan_id                 IS DISTINCT FROM OLD.plan_id
      OR NEW.start_location_id       IS DISTINCT FROM OLD.start_location_id
      OR NEW.destination_location_id IS DISTINCT FROM OLD.destination_location_id;
  END IF;

  -- Employees: no self-approval, no reassignment, locked after submit.
  IF v_uid IS NOT NULL AND NOT v_is_manager THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.is_verified THEN
        RAISE EXCEPTION 'Nur Disposition oder Admin dürfen Zeiten freigeben.' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF NEW.is_verified     IS DISTINCT FROM OLD.is_verified
      OR NEW.verified_by     IS DISTINCT FROM OLD.verified_by
      OR NEW.employee_id     IS DISTINCT FROM OLD.employee_id
      OR NEW.entered_by      IS DISTINCT FROM OLD.entered_by
      OR NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
        RAISE EXCEPTION 'Diese Änderung ist nur für Disposition oder Admin erlaubt.' USING ERRCODE = '42501';
      END IF;
      IF OLD.submitted_at IS NOT NULL
         AND (v_core_changed OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at) THEN
        RAISE EXCEPTION 'Abgesendete Zeiten können nur über einen Korrekturantrag geändert werden.' USING ERRCODE = '42501';
      END IF;
      -- Bookkeeping columns are system-managed for employees.
      NEW.submitted_by := CASE WHEN OLD.submitted_at IS NULL THEN NULL ELSE OLD.submitted_by END;
      NEW.corrected_at := OLD.corrected_at;
      NEW.verified_at  := OLD.verified_at;
    END IF;
  END IF;

  -- Previous app version: it has no submit step, so a clock-out by the
  -- employee submits the shift (otherwise it would never reach approval).
  IF TG_OP = 'UPDATE' AND v_legacy
     AND OLD.end_time IS NULL AND NEW.end_time IS NOT NULL
     AND NEW.submitted_at IS NULL AND NEW.net_hours > 0
     AND v_uid = NEW.employee_id THEN
    NEW.submitted_at := now();
  END IF;

  -- Submit bookkeeping.
  IF NEW.submitted_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.submitted_at IS NULL) THEN
    NEW.submitted_by := COALESCE(NEW.submitted_by, v_uid, NEW.employee_id);
    IF NEW.end_time IS NULL THEN
      RAISE EXCEPTION 'Eine laufende Schicht kann nicht abgesendet werden.' USING ERRCODE = '22023';
    END IF;
    -- Client submissions only (the historical backfill runs without a user).
    IF v_uid IS NOT NULL AND NEW.net_hours <= 0 AND NOT COALESCE(NEW.is_verified, FALSE) THEN
      RAISE EXCEPTION 'Eine Schicht mit 0 Stunden kann nicht abgesendet werden. Bitte Beginn, Ende und Pause prüfen.' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Approval bookkeeping. Zero-hour or open shifts can never be approved.
  IF NEW.is_verified AND (TG_OP = 'INSERT' OR NOT COALESCE(OLD.is_verified, FALSE))
     AND (NEW.end_time IS NULL OR NEW.net_hours <= 0) AND v_legacy AND TG_OP = 'UPDATE' THEN
    -- Previous app version approves in batches: skip invalid rows instead of
    -- failing the whole batch.
    NEW.is_verified := COALESCE(OLD.is_verified, FALSE);
  END IF;
  IF NEW.is_verified AND (TG_OP = 'INSERT' OR NOT COALESCE(OLD.is_verified, FALSE)) THEN
    IF NEW.end_time IS NULL OR NEW.net_hours <= 0 THEN
      RAISE EXCEPTION 'Einträge ohne gültige Arbeitszeit (0 Stunden oder ohne Schichtende) können nicht freigegeben werden.' USING ERRCODE = '22023';
    END IF;
    NEW.verified_at  := now();
    NEW.verified_by  := COALESCE(NEW.verified_by, v_uid);
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());
    NEW.submitted_by := COALESCE(NEW.submitted_by, v_uid, NEW.employee_id);
  ELSIF NOT COALESCE(NEW.is_verified, FALSE) THEN
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
  ELSIF TG_OP = 'UPDATE' AND COALESCE(NEW.change_reason, '') LIKE 'Korrektur %' THEN
    -- Approving a correction of an already approved entry is a new
    -- approval: name and time of that decision (QA P1-3).
    NEW.verified_at := now();
    NEW.verified_by := COALESCE(v_uid, NEW.verified_by);
  END IF;
  -- An approved entry always names its approver.
  IF NEW.is_verified AND NEW.verified_by IS NULL THEN
    NEW.verified_by := CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(v_uid, OLD.verified_by) ELSE v_uid END;
  END IF;

  -- A submitted entry changed afterwards is a recognisable correction.
  IF TG_OP = 'UPDATE' AND OLD.submitted_at IS NOT NULL AND v_core_changed THEN
    NEW.corrected_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- Recalculate stored hours with the minute rule and fill missing approvers
-- from the correction reviewer. The audit trigger is paused so this
-- maintenance does not show up in every entry's Verlauf.
ALTER TABLE public.time_entries DISABLE TRIGGER time_entries_audit;

UPDATE public.time_entries
   SET net_hours = net_hours
 WHERE end_time IS NOT NULL
   AND net_hours IS DISTINCT FROM ROUND(GREATEST(0,
         EXTRACT(EPOCH FROM (date_trunc('minute', end_time) - date_trunc('minute', start_time))) / 3600.0
         - COALESCE(break_minutes, 0) / 60.0)::NUMERIC, 2);

UPDATE public.time_entries te
   SET verified_by = c.reviewed_by
  FROM (
    SELECT DISTINCT ON (entry_id) entry_id, reviewed_by
      FROM public.time_entry_corrections
     WHERE status = 'approved' AND reviewed_by IS NOT NULL
     ORDER BY entry_id, reviewed_at DESC
  ) c
 WHERE te.id = c.entry_id AND te.is_verified AND te.verified_by IS NULL;

ALTER TABLE public.time_entries ENABLE TRIGGER time_entries_audit;

-- ---------------------------------------------------------------------------
-- 3. Data cleanup · internal test/support accounts
--    is_internal = TRUE hides an account from the client's views (employee
--    lists, Wochenplanung, reports, Fristen, dashboard). Internal staff still
--    see everyone. Only SQL / support can set it — never the app.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_profiles_org_internal ON public.profiles (organization_id) WHERE is_internal = FALSE;

CREATE OR REPLACE FUNCTION public.profiles_internal_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_internal := FALSE;
    ELSIF NEW.is_internal IS DISTINCT FROM OLD.is_internal THEN
      RAISE EXCEPTION 'Diese Einstellung kann nur vom Support geändert werden.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.profiles_internal_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_internal_guard ON public.profiles;
CREATE TRIGGER profiles_internal_guard
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_internal_guard();

-- ---------------------------------------------------------------------------
-- 4. P0-2 · Indexes for the main queries
-- ---------------------------------------------------------------------------
-- Plans of an employee whose end has passed (missing shifts, Freigaben).
CREATE INDEX IF NOT EXISTS idx_plans_org_end ON public.plans (organization_id, end_time);
-- Entries linked to a plan (missing-shift check).
CREATE INDEX IF NOT EXISTS idx_time_entries_plan ON public.time_entries (plan_id) WHERE plan_id IS NOT NULL;
-- Time entries of an employee by start (overlap checks, running shift).
CREATE INDEX IF NOT EXISTS idx_time_entries_emp_start ON public.time_entries (employee_id, start_time DESC);
-- Correction requests by status (Freigaben, badges).
CREATE INDEX IF NOT EXISTS idx_tec_org_status ON public.time_entry_corrections (organization_id, status);
