-- =============================================================================
-- LokShift — Kundenfeedback 16.10.2026 (19 Punkte)
--
--   1  Arbeitszeit korrekt berechnen  → net_hours wird ausschließlich hier
--      berechnet, Nachtschichten mit Ende vor Beginn werden auf den Folgetag
--      gelegt, Freigabe mit 0 Stunden ist gesperrt.
--   2  Abschlussansicht              → submitted_at / clock_*_time
--   3  Änderungen nur mit Freigabe   → Sperre nach Absenden, Korrekturanträge,
--                                      Änderungsprotokoll
--   4  Stellvertretende Erfassung    → entered_by
--   6  Sonderzahlungen               → title / billing_month / distribution
--   7  Wochenplanung                 → plans.shift_name, unbesetzte Schichten
--   8  Umverteilung + Push           → push_tokens
--  11  Personalakte                  → qualifications erweitert, Storage-Bucket,
--                                      Erinnerungsprotokoll
--  12  Betriebsstellen               → eindeutige Kürzel je Organisation
--
--  Härtung (20.10.2026): Rollen-/Organisationsschutz für profiles,
--  vertrauliche Dateien, manipulationssichere Korrekturanträge, eine offene
--  Schicht je Mitarbeiter, Kompatibilität mit der alten App-Version (ohne
--  Header x-lokshift-client), Push-Token-Registrierung, Indizes.
--
-- Idempotent — kann mehrfach ausgeführt werden.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_in(target_org UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND organization_id = target_org
      AND LOWER(role) IN ('admin', 'administrator')
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. TIME_ENTRIES — new columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS verified_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entered_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS clock_start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clock_end_time   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS corrected_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS change_reason    TEXT;

CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date ON public.time_entries (employee_id, date);
CREATE INDEX IF NOT EXISTS idx_time_entries_org_date      ON public.time_entries (organization_id, date);

-- ---------------------------------------------------------------------------
-- 1a. Normalisation + rules (BEFORE INSERT/UPDATE)
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
    NEW.net_hours := ROUND(GREATEST(0,
      EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600.0
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
  END IF;

  -- A submitted entry changed afterwards is a recognisable correction.
  IF TG_OP = 'UPDATE' AND OLD.submitted_at IS NOT NULL AND v_core_changed THEN
    NEW.corrected_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS time_entries_normalize ON public.time_entries;
CREATE TRIGGER time_entries_normalize
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.time_entries_normalize();

-- ---------------------------------------------------------------------------
-- 1b. Change log (AFTER INSERT/UPDATE/DELETE)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.time_entry_audit (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id        UUID NOT NULL,
  -- Plain UUIDs on purpose: when a user or organisation is deleted, the
  -- cascade deletes their entries and this trigger logs those deletions —
  -- foreign keys to the rows being deleted would make that fail.
  organization_id UUID NOT NULL,
  employee_id     UUID,
  action          TEXT NOT NULL,
  changed_by      UUID,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  old_values      JSONB,
  new_values      JSONB,
  reason          TEXT
);

ALTER TABLE public.time_entry_audit DROP CONSTRAINT IF EXISTS time_entry_audit_organization_id_fkey;
ALTER TABLE public.time_entry_audit DROP CONSTRAINT IF EXISTS time_entry_audit_employee_id_fkey;
ALTER TABLE public.time_entry_audit DROP CONSTRAINT IF EXISTS time_entry_audit_changed_by_fkey;

CREATE INDEX IF NOT EXISTS idx_time_entry_audit_entry ON public.time_entry_audit (entry_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_time_entry_audit_org   ON public.time_entry_audit (organization_id, changed_at DESC);

ALTER TABLE public.time_entry_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS time_entry_audit_select ON public.time_entry_audit;
CREATE POLICY time_entry_audit_select ON public.time_entry_audit
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND (employee_id = auth.uid() OR public.is_admin_or_dispatcher_in(organization_id))
  );

CREATE OR REPLACE FUNCTION public.time_entries_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  tracked TEXT[] := ARRAY[
    'date','start_time','end_time','break_minutes','net_hours','employee_id',
    'customer_id','notes','location','overnight_stay','hotel_address',
    'meal_allowance','is_gastfahrt','is_planned','plan_id',
    'start_location_id','destination_location_id','submitted_at','is_verified'
  ];
  o JSONB;
  n JSONB;
  old_diff JSONB := '{}'::JSONB;
  new_diff JSONB := '{}'::JSONB;
  k TEXT;
  v_action TEXT;
  v_reason TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    n := to_jsonb(NEW);
    FOREACH k IN ARRAY tracked LOOP
      new_diff := new_diff || jsonb_build_object(k, n -> k);
    END LOOP;
    INSERT INTO public.time_entry_audit
      (entry_id, organization_id, employee_id, action, changed_by, new_values, reason)
    VALUES
      (NEW.id, NEW.organization_id, NEW.employee_id,
       CASE WHEN NEW.end_time IS NULL THEN 'clocked_in' ELSE 'created' END,
       auth.uid(), new_diff, NEW.change_reason);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    o := to_jsonb(OLD);
    FOREACH k IN ARRAY tracked LOOP
      old_diff := old_diff || jsonb_build_object(k, o -> k);
    END LOOP;
    INSERT INTO public.time_entry_audit
      (entry_id, organization_id, employee_id, action, changed_by, old_values)
    VALUES
      (OLD.id, OLD.organization_id, OLD.employee_id, 'deleted', auth.uid(), old_diff);
    RETURN OLD;
  END IF;

  o := to_jsonb(OLD);
  n := to_jsonb(NEW);
  FOREACH k IN ARRAY tracked LOOP
    IF (o -> k) IS DISTINCT FROM (n -> k) THEN
      old_diff := old_diff || jsonb_build_object(k, o -> k);
      new_diff := new_diff || jsonb_build_object(k, n -> k);
    END IF;
  END LOOP;

  IF new_diff = '{}'::JSONB THEN
    RETURN NEW;
  END IF;

  v_reason := NEW.change_reason;

  v_action := CASE
    WHEN v_reason LIKE 'Korrektur %'                                  THEN 'correction_applied'
    WHEN OLD.end_time IS NULL AND NEW.end_time IS NOT NULL            THEN 'clocked_out'
    WHEN NOT COALESCE(OLD.is_verified, FALSE) AND NEW.is_verified     THEN 'approved'
    WHEN COALESCE(OLD.is_verified, FALSE) AND NOT NEW.is_verified     THEN 'unapproved'
    WHEN OLD.submitted_at IS NULL AND NEW.submitted_at IS NOT NULL    THEN 'submitted'
    ELSE 'updated'
  END;

  INSERT INTO public.time_entry_audit
    (entry_id, organization_id, employee_id, action, changed_by, old_values, new_values, reason)
  VALUES
    (NEW.id, NEW.organization_id, NEW.employee_id, v_action, auth.uid(), old_diff, new_diff, v_reason);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS time_entries_audit ON public.time_entries;
CREATE TRIGGER time_entries_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.time_entries_audit();

-- ---------------------------------------------------------------------------
-- 1c. Backfill + repair existing rows
--     (runs through the trigger above → net_hours recalculated)
-- ---------------------------------------------------------------------------
UPDATE public.time_entries
SET end_time = ((end_time AT TIME ZONE 'Europe/Berlin') + INTERVAL '1 day') AT TIME ZONE 'Europe/Berlin',
    change_reason = 'Systemkorrektur: Nachtschicht auf Folgetag gelegt'
WHERE end_time IS NOT NULL
  AND end_time < start_time
  AND ((end_time AT TIME ZONE 'Europe/Berlin') + INTERVAL '1 day') AT TIME ZONE 'Europe/Berlin' > start_time;

UPDATE public.time_entries
SET change_reason = 'Systemkorrektur: Stunden neu berechnet'
WHERE end_time IS NOT NULL
  AND net_hours IS DISTINCT FROM ROUND(GREATEST(0,
        EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0
        - COALESCE(break_minutes, 0) / 60.0)::NUMERIC, 2);

UPDATE public.time_entries
SET entered_by = employee_id
WHERE entered_by IS NULL;

-- Historical completed entries count as already submitted.
UPDATE public.time_entries
SET submitted_at = COALESCE(updated_at, created_at),
    submitted_by = employee_id
WHERE submitted_at IS NULL
  AND end_time IS NOT NULL
  AND COALESCE(is_planned, FALSE) = FALSE;

UPDATE public.time_entries
SET verified_at = COALESCE(updated_at, created_at)
WHERE is_verified AND verified_at IS NULL;

-- ---------------------------------------------------------------------------
-- 1d. Correction requests (Punkt 3)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.time_entry_corrections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_id        UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason          TEXT NOT NULL CHECK (length(btrim(reason)) >= 3),
  original        JSONB NOT NULL,
  proposed        JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_time_entry_corrections_pending
  ON public.time_entry_corrections (entry_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_time_entry_corrections_org_status
  ON public.time_entry_corrections (organization_id, status, requested_at DESC);

ALTER TABLE public.time_entry_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tec_select ON public.time_entry_corrections;
CREATE POLICY tec_select ON public.time_entry_corrections
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND (employee_id = auth.uid() OR public.is_admin_or_dispatcher_in(organization_id))
  );

DROP POLICY IF EXISTS tec_insert ON public.time_entry_corrections;
CREATE POLICY tec_insert ON public.time_entry_corrections
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND requested_by = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.time_entries te
      WHERE te.id = entry_id
        AND te.employee_id = time_entry_corrections.employee_id
        AND te.organization_id = time_entry_corrections.organization_id
        AND (te.employee_id = auth.uid() OR public.is_admin_or_dispatcher_in(te.organization_id))
    )
  );

-- No UPDATE policy: a pending request can't be edited after a manager
-- has seen it. Withdrawing and deciding go through the functions below.
DROP POLICY IF EXISTS tec_cancel_own ON public.time_entry_corrections;

-- The "original" snapshot is taken from the entry by the server, never
-- trusted from the client.
CREATE OR REPLACE FUNCTION public.time_entry_corrections_prepare()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  te public.time_entries;
BEGIN
  SELECT * INTO te FROM public.time_entries WHERE id = NEW.entry_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Zeiteintrag nicht gefunden.' USING ERRCODE = 'P0002';
  END IF;
  NEW.employee_id     := te.employee_id;
  NEW.organization_id := te.organization_id;
  NEW.original := jsonb_build_object(
    'date', te.date, 'start_time', te.start_time, 'end_time', te.end_time,
    'break_minutes', te.break_minutes, 'notes', te.notes,
    'overnight_stay', te.overnight_stay, 'meal_allowance', te.meal_allowance
  );
  NEW.status      := 'pending';
  NEW.requested_at := now();
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  NEW.review_note := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS time_entry_corrections_prepare ON public.time_entry_corrections;
CREATE TRIGGER time_entry_corrections_prepare
  BEFORE INSERT ON public.time_entry_corrections
  FOR EACH ROW EXECUTE FUNCTION public.time_entry_corrections_prepare();

CREATE OR REPLACE FUNCTION public.cancel_time_entry_correction(p_correction_id UUID)
RETURNS public.time_entry_corrections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c public.time_entry_corrections;
BEGIN
  UPDATE public.time_entry_corrections
  SET status = 'cancelled'
  WHERE id = p_correction_id AND requested_by = auth.uid() AND status = 'pending'
  RETURNING * INTO c;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dieser Antrag kann nicht mehr zurückgezogen werden.' USING ERRCODE = '22023';
  END IF;
  RETURN c;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_time_entry_correction(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_time_entry_correction(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_time_entry_correction(
  p_correction_id UUID,
  p_approve BOOLEAN,
  p_note TEXT DEFAULT NULL
)
RETURNS public.time_entry_corrections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c public.time_entry_corrections;
  p JSONB;
BEGIN
  SELECT * INTO c FROM public.time_entry_corrections WHERE id = p_correction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Korrekturantrag nicht gefunden.' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.is_admin_or_dispatcher_in(c.organization_id) THEN
    RAISE EXCEPTION 'Nur Disposition oder Admin dürfen Korrekturen bearbeiten.' USING ERRCODE = '42501';
  END IF;
  IF c.status <> 'pending' THEN
    RAISE EXCEPTION 'Dieser Korrekturantrag wurde bereits bearbeitet.' USING ERRCODE = '22023';
  END IF;
  -- The entry must still belong to the same employee and organisation.
  PERFORM 1 FROM public.time_entries
  WHERE id = c.entry_id AND employee_id = c.employee_id AND organization_id = c.organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Der Zeiteintrag passt nicht mehr zu diesem Antrag.' USING ERRCODE = '22023';
  END IF;

  IF p_approve THEN
    p := c.proposed;
    UPDATE public.time_entries te SET
      date                    = COALESCE((p->>'date')::DATE, te.date),
      start_time              = COALESCE((p->>'start_time')::TIMESTAMPTZ, te.start_time),
      end_time                = COALESCE((p->>'end_time')::TIMESTAMPTZ, te.end_time),
      break_minutes           = COALESCE((p->>'break_minutes')::INTEGER, te.break_minutes),
      notes                   = CASE WHEN p ? 'notes' THEN p->>'notes' ELSE te.notes END,
      customer_id             = CASE WHEN p ? 'customer_id' THEN NULLIF(p->>'customer_id', '')::UUID ELSE te.customer_id END,
      start_location_id       = CASE WHEN p ? 'start_location_id' THEN NULLIF(p->>'start_location_id', '')::UUID ELSE te.start_location_id END,
      destination_location_id = CASE WHEN p ? 'destination_location_id' THEN NULLIF(p->>'destination_location_id', '')::UUID ELSE te.destination_location_id END,
      overnight_stay          = CASE WHEN p ? 'overnight_stay' THEN (p->>'overnight_stay')::BOOLEAN ELSE te.overnight_stay END,
      is_gastfahrt            = CASE WHEN p ? 'is_gastfahrt' THEN (p->>'is_gastfahrt')::BOOLEAN ELSE te.is_gastfahrt END,
      meal_allowance          = CASE WHEN p ? 'meal_allowance' THEN (p->>'meal_allowance')::NUMERIC ELSE te.meal_allowance END,
      is_verified             = TRUE,
      verified_by             = auth.uid(),
      change_reason           = 'Korrektur ' || c.id::TEXT || ': ' || c.reason
    WHERE te.id = c.entry_id;
  END IF;

  UPDATE public.time_entry_corrections
  SET status      = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = NULLIF(btrim(COALESCE(p_note, '')), '')
  WHERE id = p_correction_id
  RETURNING * INTO c;

  RETURN c;
END;
$$;

REVOKE ALL ON FUNCTION public.review_time_entry_correction(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_time_entry_correction(UUID, BOOLEAN, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. PLANS — shift name, unassigned shifts, employee may only change status
-- ---------------------------------------------------------------------------
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS shift_name TEXT;
ALTER TABLE public.plans ALTER COLUMN employee_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plans_org_start ON public.plans (organization_id, start_time);

CREATE OR REPLACE FUNCTION public.plans_guard_employee_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin_or_dispatcher_in(OLD.organization_id) THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'status' - 'rejection_reason' - 'updated_at')
     IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'rejection_reason' - 'updated_at') THEN
    RAISE EXCEPTION 'Mitarbeiter dürfen bei Schichten nur Bestätigung oder Ablehnung setzen.' USING ERRCODE = '42501';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('confirmed', 'rejected') THEN
    RAISE EXCEPTION 'Ungültiger Schichtstatus.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plans_guard_employee_update ON public.plans;
CREATE TRIGGER plans_guard_employee_update
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.plans_guard_employee_update();

-- ---------------------------------------------------------------------------
-- 3. HOLIDAY_BONUSES → Sonderzahlungen (Punkt 6)
-- ---------------------------------------------------------------------------
ALTER TABLE public.holiday_bonuses
  ADD COLUMN IF NOT EXISTS title         TEXT,
  ADD COLUMN IF NOT EXISTS billing_month DATE,
  ADD COLUMN IF NOT EXISTS distribution  TEXT NOT NULL DEFAULT 'once',
  ADD COLUMN IF NOT EXISTS created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.holiday_bonuses
SET title = CASE bonus_type::TEXT
              WHEN 'holiday_pay' THEN 'Urlaubsgeld'
              WHEN 'christmas'   THEN 'Weihnachtsgeld'
              WHEN 'vacation'    THEN 'Urlaubsabgeltung'
              WHEN 'performance' THEN 'Leistungsprämie'
              ELSE 'Sonderzahlung'
            END
WHERE title IS NULL OR btrim(title) = '';

UPDATE public.holiday_bonuses
SET billing_month = date_trunc('month', COALESCE(period_start, created_at::DATE))::DATE
WHERE billing_month IS NULL;

UPDATE public.holiday_bonuses
SET billing_month = date_trunc('month', billing_month)::DATE
WHERE billing_month IS NOT NULL AND EXTRACT(DAY FROM billing_month) <> 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'holiday_bonuses_distribution_check') THEN
    ALTER TABLE public.holiday_bonuses
      ADD CONSTRAINT holiday_bonuses_distribution_check
      CHECK (distribution IN ('once', 'monthly', 'prorata'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'holiday_bonuses_period_check') THEN
    ALTER TABLE public.holiday_bonuses
      ADD CONSTRAINT holiday_bonuses_period_check
      CHECK (
        (distribution = 'once' AND billing_month IS NOT NULL)
        OR (distribution <> 'once' AND period_start IS NOT NULL AND period_end IS NOT NULL AND period_end >= period_start)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_holiday_bonuses_employee_month
  ON public.holiday_bonuses (employee_id, billing_month);

-- ---------------------------------------------------------------------------
-- 4. QUALIFICATIONS → Personalakte / Nachweise & Fristen (Punkt 11)
-- ---------------------------------------------------------------------------
ALTER TABLE public.qualifications
  ADD COLUMN IF NOT EXISTS doc_type        TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS file_path       TEXT,
  ADD COLUMN IF NOT EXISTS file_name       TEXT,
  ADD COLUMN IF NOT EXISTS remark          TEXT,
  ADD COLUMN IF NOT EXISTS reminder_days   INTEGER[] NOT NULL DEFAULT '{28,14,0}',
  ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_required     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replaced_by     UUID REFERENCES public.qualifications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qualifications_expiry
  ON public.qualifications (organization_id, expires_at) WHERE archived_at IS NULL;

-- Personnel files are maintained by admin/dispatch. Employees read their own
-- non-confidential records; confidential ones are admin-only.
DROP POLICY IF EXISTS qual_select       ON public.qualifications;
DROP POLICY IF EXISTS qual_self_insert  ON public.qualifications;
DROP POLICY IF EXISTS qual_self_update  ON public.qualifications;
DROP POLICY IF EXISTS qual_self_delete  ON public.qualifications;
DROP POLICY IF EXISTS qual_manage       ON public.qualifications;

CREATE POLICY qual_select ON public.qualifications
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND (
      public.is_admin_in(organization_id)
      OR (NOT is_confidential AND (user_id = auth.uid() OR public.is_admin_or_dispatcher_in(organization_id)))
    )
  );

CREATE POLICY qual_manage ON public.qualifications
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
    AND (NOT is_confidential OR public.is_admin_in(organization_id))
  )
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
    AND (NOT is_confidential OR public.is_admin_in(organization_id))
  );

CREATE TABLE IF NOT EXISTS public.qualification_reminders (
  qualification_id UUID NOT NULL REFERENCES public.qualifications(id) ON DELETE CASCADE,
  expires_at       DATE NOT NULL,
  reminder_day     INTEGER NOT NULL,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (qualification_id, expires_at, reminder_day)
);
ALTER TABLE public.qualification_reminders ENABLE ROW LEVEL SECURITY;

-- Private bucket: personnel-files/<org_id>/<employee_id>/<file>
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'personnel-files', 'personnel-files', FALSE, 20971520,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
  SET public = FALSE,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Confidential files live under <org>/<employee>/confidential/… and/or are
-- marked on their record. The record check runs as SECURITY DEFINER —
-- inside a policy subquery the caller's own RLS would hide confidential
-- rows and make the check always pass.
CREATE OR REPLACE FUNCTION public.personnel_file_is_confidential(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  -- COALESCE: for paths without a third folder the comparison is NULL,
  -- which would make NOT(...) NULL and hide every file.
  SELECT COALESCE((storage.foldername(p_name))[3] = 'confidential', FALSE)
      OR EXISTS (SELECT 1 FROM public.qualifications q WHERE q.file_path = p_name AND q.is_confidential);
$$;
REVOKE ALL ON FUNCTION public.personnel_file_is_confidential(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.personnel_file_is_confidential(TEXT) TO authenticated;

DROP POLICY IF EXISTS personnel_files_select ON storage.objects;
DROP POLICY IF EXISTS personnel_files_insert ON storage.objects;
DROP POLICY IF EXISTS personnel_files_update ON storage.objects;
DROP POLICY IF EXISTS personnel_files_delete ON storage.objects;

CREATE POLICY personnel_files_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'personnel-files'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::TEXT
    AND (
      public.is_admin_in(public.get_my_org_id())
      OR (
        NOT public.personnel_file_is_confidential(name)
        AND (
          public.is_admin_or_dispatcher_in(public.get_my_org_id())
          OR (storage.foldername(name))[2] = auth.uid()::TEXT
        )
      )
    )
  );

CREATE POLICY personnel_files_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'personnel-files'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::TEXT
    AND public.is_admin_or_dispatcher_in(public.get_my_org_id())
    AND ((storage.foldername(name))[3] IS DISTINCT FROM 'confidential' OR public.is_admin_in(public.get_my_org_id()))
  );

CREATE POLICY personnel_files_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'personnel-files'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::TEXT
    AND public.is_admin_or_dispatcher_in(public.get_my_org_id())
    AND (NOT public.personnel_file_is_confidential(name) OR public.is_admin_in(public.get_my_org_id()))
  );

CREATE POLICY personnel_files_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'personnel-files'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::TEXT
    AND public.is_admin_or_dispatcher_in(public.get_my_org_id())
    AND (NOT public.personnel_file_is_confidential(name) OR public.is_admin_in(public.get_my_org_id()))
  );

-- ---------------------------------------------------------------------------
-- 5. OPERATIONAL_LOCATIONS — one location per code and organisation
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.operational_locations
    WHERE short_code IS NOT NULL AND btrim(short_code) <> ''
    GROUP BY organization_id, upper(btrim(short_code)) HAVING count(*) > 1
  ) THEN
    RAISE NOTICE 'Doppelte Betriebsstellen-Kürzel vorhanden – eindeutiger Index übersprungen. Bitte Dubletten bereinigen und Migration erneut ausführen.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_operational_locations_org_code
      ON public.operational_locations (organization_id, upper(btrim(short_code)))
      WHERE short_code IS NOT NULL AND btrim(short_code) <> '';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. PUSH TOKENS — private per user (never exposed through profiles)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_tokens (
  token           TEXT PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  platform        TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens (user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS push_tokens_own ON public.push_tokens;
CREATE POLICY push_tokens_own ON public.push_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- A device token belongs to whoever is signed in on that device now. A
-- plain upsert would be blocked by RLS when the previous user didn't sign
-- out, and pushes for them would keep arriving on this phone.
CREATE OR REPLACE FUNCTION public.register_push_token(p_token TEXT, p_platform TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_token IS NULL OR length(p_token) < 10 THEN
    RAISE EXCEPTION 'Ungültiger Push-Token.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.push_tokens (token, user_id, organization_id, platform, updated_at)
  VALUES (p_token, auth.uid(), public.get_my_org_id(), p_platform, now())
  ON CONFLICT (token) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        organization_id = EXCLUDED.organization_id,
        platform = EXCLUDED.platform,
        updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.register_push_token(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_push_token(TEXT, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. PROFILES — role, organisation and activation only via admins
--    (security: previously any user could promote themselves to admin or
--    join another organisation by updating/inserting their own row).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Service role / SQL / signup trigger (no signed-in user): unrestricted.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Self-created fallback rows never carry privileges; an admin assigns
    -- organisation and role afterwards.
    NEW.organization_id := NULL;
    NEW.role := 'employee';
    RETURN NEW;
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Die Organisation eines Kontos kann nur vom Support geändert werden.' USING ERRCODE = '42501';
  END IF;
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active)
     AND NOT public.is_admin_in(OLD.organization_id) THEN
    RAISE EXCEPTION 'Rolle und Aktivierung dürfen nur Admins ändern.' USING ERRCODE = '42501';
  END IF;
  IF NEW.id = auth.uid() AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Die eigene Rolle kann nicht geändert werden.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard ON public.profiles;
CREATE TRIGGER profiles_guard
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard();

-- ---------------------------------------------------------------------------
-- 8. One running shift per employee (two devices / retry after a timeout)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.time_entries
    WHERE end_time IS NULL AND is_planned IS NOT TRUE
    GROUP BY employee_id HAVING count(*) > 1
  ) THEN
    RAISE NOTICE 'Mitarbeiter mit mehreren laufenden Schichten – eindeutiger Index übersprungen. Bitte überzählige laufende Schichten beenden und Migration erneut ausführen.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_time_entries_one_open
      ON public.time_entries (employee_id) WHERE end_time IS NULL AND is_planned IS NOT TRUE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 9. Previous app version: Sonderzahlung without billing month
-- ---------------------------------------------------------------------------
ALTER TABLE public.holiday_bonuses
  ALTER COLUMN billing_month SET DEFAULT date_trunc('month', now())::DATE;

-- ---------------------------------------------------------------------------
-- 10. Indexes for the hot queries (lists, badges, approvals, reports)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_time_entries_org_unverified ON public.time_entries (organization_id, date) WHERE is_verified = FALSE AND is_planned IS NOT TRUE;
CREATE INDEX IF NOT EXISTS idx_time_entries_emp_drafts     ON public.time_entries (employee_id, end_time DESC) WHERE submitted_at IS NULL AND end_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plans_employee_start        ON public.plans (employee_id, start_time);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread   ON public.notifications (user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_tec_entry                   ON public.time_entry_corrections (entry_id);
CREATE INDEX IF NOT EXISTS idx_tec_employee                ON public.time_entry_corrections (employee_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_org                ON public.profiles (organization_id);
CREATE INDEX IF NOT EXISTS idx_qualifications_file_path    ON public.qualifications (file_path) WHERE file_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_start   ON public.calendar_events (organization_id, start_time);
CREATE INDEX IF NOT EXISTS idx_per_diems_org_status_date   ON public.per_diems (organization_id, status, date);

-- ---------------------------------------------------------------------------
-- 11. Realtime for correction requests (screens update live)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'time_entry_corrections'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entry_corrections;
  END IF;
END $$;

COMMIT;
