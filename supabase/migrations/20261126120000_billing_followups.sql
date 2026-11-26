-- Billing spec follow-ups (Rhein Maas Rail, Nov 2026) — open points 1–4.
--
--   1. Gastfahrten: no surcharges (spec §1 "actually worked hours" + §5
--      "guest rides do NOT count as working hours"). App-side only.
--   2. Breaks at their real clock time (spec §1/§3 "to the minute, by the
--      actual date and time of each segment"): time_entries.break_periods.
--      The clock's break start/end is recorded here by the database, so every
--      app version (and the offline queue) is covered. Manual entries get the
--      optional field "Pause ab". Break times are part of a correction (an
--      employee cannot move a break after submitting).
--   3. All RIL100 operating points are searchable (spec §9 "all operating
--      points must be imported", "shows all matching operating points"):
--      closed/planned points are no longer archived; their RIL100 status is
--      shown and operating points rank first.
--   4. Code clash RMR: the client's own "RMR Rhein Maas Rail" stays, and
--      RIL100 "RMR Mannheim Rbf" is added as well, so a code search shows
--      both. Codes stay unique among own entries and among imported entries;
--      a NEW own entry may not reuse a RIL100 code.
--
-- Idempotent; safe to run again.

-- ---------------------------------------------------------------------------
-- 2. Break times
-- ---------------------------------------------------------------------------
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS break_periods JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$ BEGIN
  ALTER TABLE public.time_entries
    ADD CONSTRAINT time_entries_break_periods_array
    CHECK (jsonb_typeof(break_periods) = 'array' AND jsonb_array_length(break_periods) <= 50);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.time_entries.break_periods IS
  'Real break times [{"start": ISO, "end": ISO}]. Clock breaks are appended by trigger time_entries_breaks; surcharges skip these minutes.';

CREATE OR REPLACE FUNCTION public.time_entries_breaks()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_delta INTEGER;
  v_from  TIMESTAMPTZ;
  v_to    TIMESTAMPTZ;
  v_end   TIMESTAMPTZ;
  v_p     JSONB;
  v_uid   UUID := auth.uid();
BEGIN
  NEW.break_periods := COALESCE(NEW.break_periods, '[]'::jsonb);
  IF jsonb_typeof(NEW.break_periods) <> 'array' THEN
    RAISE EXCEPTION 'Ungültige Pausenzeit.' USING ERRCODE = '22023';
  END IF;

  -- Break times recorded by the clock are system data: an employee cannot
  -- rewrite them (only dispatch/admin can correct them, audited).
  IF TG_OP = 'UPDATE' AND v_uid IS NOT NULL
     AND OLD.clock_start_time IS NOT NULL
     AND NEW.break_periods IS DISTINCT FROM OLD.break_periods
     AND NOT public.is_admin_or_dispatcher_in(OLD.organization_id) THEN
    RAISE EXCEPTION 'Pausenzeiten der Stempeluhr können nur Disposition oder Admin ändern.' USING ERRCODE = '42501';
  END IF;

  -- Clock: a break ends (end-break button, or clock-out during a break).
  -- Its length is the growth of total_break_seconds, so a late sync from the
  -- offline queue still records the real end.
  IF TG_OP = 'UPDATE'
     AND OLD.current_break_start IS NOT NULL
     AND NEW.current_break_start IS NULL
     AND NEW.break_periods IS NOT DISTINCT FROM OLD.break_periods THEN
    v_delta := COALESCE(NEW.total_break_seconds, 0) - COALESCE(OLD.total_break_seconds, 0);
    IF v_delta > 0 AND jsonb_array_length(NEW.break_periods) < 50 THEN
      NEW.break_periods := NEW.break_periods || jsonb_build_array(jsonb_build_object(
        'start', to_jsonb(OLD.current_break_start),
        'end',   to_jsonb(OLD.current_break_start + make_interval(secs => v_delta))));
    END IF;
  END IF;

  -- Client-written break times must be real intervals inside the shift.
  IF TG_OP = 'INSERT' OR NEW.break_periods IS DISTINCT FROM OLD.break_periods THEN
    -- Same overnight fix as time_entries_normalize (end stored on the start day).
    v_end := NEW.end_time;
    IF v_end IS NOT NULL AND v_end < NEW.start_time THEN
      v_end := ((v_end AT TIME ZONE 'Europe/Berlin') + INTERVAL '1 day') AT TIME ZONE 'Europe/Berlin';
    END IF;
    FOR v_p IN SELECT * FROM jsonb_array_elements(NEW.break_periods) LOOP
      BEGIN
        v_from := (v_p ->> 'start')::timestamptz;
        v_to   := (v_p ->> 'end')::timestamptz;
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'Ungültige Pausenzeit.' USING ERRCODE = '22023';
      END;
      IF jsonb_typeof(v_p) <> 'object' OR v_from IS NULL OR v_to IS NULL OR v_to <= v_from
         OR v_from < date_trunc('minute', NEW.start_time)
         OR (v_end IS NOT NULL AND v_to > v_end + INTERVAL '1 minute') THEN
        RAISE EXCEPTION 'Die Pause muss innerhalb der Schicht liegen.' USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.time_entries_breaks() FROM PUBLIC, anon, authenticated;

-- Runs before time_entries_normalize (alphabetical), which then sees the
-- recorded break as part of the entry.
DROP TRIGGER IF EXISTS time_entries_breaks ON public.time_entries;
CREATE TRIGGER time_entries_breaks
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.time_entries_breaks();

-- Normalize: identical to 20261125120000, plus break_periods as a core field.
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
  v_partial NUMERIC;
  v_full NUMERIC;
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

  -- Billing spec section 6: the shift belongs to the German day (and month)
  -- it starts on — for every client, also old app versions.
  IF NEW.start_time IS NOT NULL THEN
    NEW.date := (NEW.start_time AT TIME ZONE 'Europe/Berlin')::DATE;
  END IF;

  -- Billing spec section 4: one Spesen value per shift, never additive.
  IF NEW.end_time IS NOT NULL AND (
       TG_OP = 'INSERT'
    OR NEW.net_hours       IS DISTINCT FROM OLD.net_hours
    OR NEW.overnight_stay  IS DISTINCT FROM OLD.overnight_stay
    OR NEW.meal_allowance  IS DISTINCT FROM OLD.meal_allowance
    OR OLD.end_time IS NULL
  ) THEN
    SELECT COALESCE(NULLIF(o.spesen_rate_partial, 0), 14), COALESCE(NULLIF(o.spesen_rate_full, 0), 28)
      INTO v_partial, v_full
      FROM public.organizations o WHERE o.id = NEW.organization_id;
    NEW.meal_allowance := CASE
      WHEN NEW.net_hours < 8 THEN 0
      WHEN COALESCE(NEW.overnight_stay, FALSE) THEN COALESCE(v_full, 28)
      ELSE COALESCE(v_partial, 14)
    END;
  ELSIF NEW.end_time IS NULL THEN
    NEW.meal_allowance := 0;
  END IF;

  -- The originally clocked times are system-managed and immutable, so the
  -- record stays traceable after the employee corrects start/end.
  IF TG_OP = 'INSERT' THEN
    NEW.clock_start_time := CASE WHEN NEW.end_time IS NULL THEN NEW.start_time END;
    NEW.clock_end_time   := NULL;
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
    -- meal_allowance is derived from hours + overnight (both already
    -- below), so a recalculated amount alone is not a correction.
    v_core_changed :=
         NEW.date                    IS DISTINCT FROM OLD.date
      OR NEW.start_time              IS DISTINCT FROM OLD.start_time
      OR NEW.end_time                IS DISTINCT FROM OLD.end_time
      OR NEW.break_minutes           IS DISTINCT FROM OLD.break_minutes
      OR NEW.break_periods           IS DISTINCT FROM OLD.break_periods
      OR NEW.customer_id             IS DISTINCT FROM OLD.customer_id
      OR NEW.notes                   IS DISTINCT FROM OLD.notes
      OR NEW.location                IS DISTINCT FROM OLD.location
      OR NEW.overnight_stay          IS DISTINCT FROM OLD.overnight_stay
      OR NEW.hotel_address           IS DISTINCT FROM OLD.hotel_address
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

-- Audit: break times are part of the history (same function as in
-- 20261016120000_client_feedback_oct2026.sql, plus 'break_periods').
CREATE OR REPLACE FUNCTION public.time_entries_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  tracked TEXT[] := ARRAY[
    'date','start_time','end_time','break_minutes','net_hours','employee_id',
    'customer_id','notes','location','overnight_stay','hotel_address',
    'meal_allowance','is_gastfahrt','is_planned','plan_id',
    'start_location_id','destination_location_id','submitted_at','is_verified',
    'break_periods'
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
$function$
;

-- ---------------------------------------------------------------------------
-- 4. Codes: unique among own entries and among imported entries
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.operational_locations
              WHERE source IS NULL AND short_code IS NOT NULL AND btrim(short_code) <> ''
              GROUP BY organization_id, upper(btrim(short_code)) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Doppelte eigene Betriebsstellen-Kürzel vorhanden – bitte zuerst bereinigen.';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_operational_locations_org_code_own
  ON public.operational_locations (organization_id, upper(btrim(short_code)))
  WHERE source IS NULL AND short_code IS NOT NULL AND btrim(short_code) <> '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_operational_locations_org_code_ril
  ON public.operational_locations (organization_id, upper(btrim(short_code)))
  WHERE source IS NOT NULL AND short_code IS NOT NULL AND btrim(short_code) <> '';
DROP INDEX IF EXISTS public.uq_operational_locations_org_code;

-- A new own code (or a changed one) must not be a code of another entry.
-- SECURITY INVOKER: the lookup only sees rows the caller may see (own
-- organisation), so it cannot reveal codes of other organisations.
CREATE OR REPLACE FUNCTION public.operational_locations_code_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.source IS NULL AND NEW.short_code IS NOT NULL AND btrim(NEW.short_code) <> ''
     AND (TG_OP = 'INSERT'
          OR upper(btrim(NEW.short_code)) IS DISTINCT FROM upper(btrim(COALESCE(OLD.short_code, '')))
          OR OLD.source IS NOT NULL)
     AND EXISTS (SELECT 1 FROM public.operational_locations l
                  WHERE l.organization_id = NEW.organization_id
                    AND l.id <> NEW.id
                    AND upper(btrim(l.short_code)) = upper(btrim(NEW.short_code))) THEN
    RAISE EXCEPTION 'duplicate key value violates unique constraint "uq_operational_locations_org_code_own"'
      USING ERRCODE = '23505', DETAIL = 'Das Kürzel ist bereits vergeben.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS operational_locations_code_guard ON public.operational_locations;
CREATE TRIGGER operational_locations_code_guard
  BEFORE INSERT OR UPDATE OF short_code, source ON public.operational_locations
  FOR EACH ROW EXECUTE FUNCTION public.operational_locations_code_guard();

-- ---------------------------------------------------------------------------
-- 3. + 4. RIL100 data: everything searchable, clashing codes added
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF to_regclass('public.ril100_betriebsstellen') IS NOT NULL THEN
    -- Codes whose own entry is a different place (RMR = Mannheim Rbf).
    INSERT INTO public.operational_locations
      (organization_id, name, short_code, type, is_active, ril100_type, ril100_status, plc_code, source)
    SELECT o.id, r.name, r.code,
           CASE
             WHEN r.name ~* '\m(bw|betriebswerk|werkstatt|instandhaltung)\M' OR r.typ ~* '^bw$' THEN 'workshop'
             WHEN r.name ~* '\m(gbf|rbf|abstellanlage|abst)\M' THEN 'yard'
             WHEN r.typ ~* '^(anst|awanst|ne-anst|ne-awanst)$' THEN 'yard'
             WHEN r.typ ~* '^(bf|hp|bft|ne-bf|ne-hp|ne-bft|vp-bf|vp-hp|hst|ne-hst)$' THEN 'station'
             ELSE 'other'
           END,
           TRUE, r.typ, NULLIF(r.status, ''), r.plc, 'RIL100 ' || to_char(r.stand, 'DD.MM.YYYY')
      FROM public.organizations o
     CROSS JOIN public.ril100_betriebsstellen r
     WHERE NOT EXISTS (SELECT 1 FROM public.operational_locations l
                        WHERE l.organization_id = o.id AND l.source IS NOT NULL
                          AND upper(btrim(l.short_code)) = upper(r.code))
       AND NOT EXISTS (SELECT 1 FROM public.operational_locations l
                        WHERE l.organization_id = o.id AND l.source IS NULL
                          AND upper(btrim(l.short_code)) = upper(r.code)
                          AND public.location_search_norm(l.name) = public.location_search_norm(r.name));
  END IF;
END $$;

-- Closed/planned RIL100 points were archived by the first import; nobody has
-- touched them since (updated_at = created_at), so they become searchable.
UPDATE public.operational_locations
   SET is_active = TRUE, updated_at = now()
 WHERE source LIKE 'RIL100 %'
   AND NOT is_active
   AND updated_at = created_at;

-- Search: operating points first, then planned/closed ones (status shown).
CREATE OR REPLACE FUNCTION public.search_operational_locations(
  p_query TEXT,
  p_limit INTEGER DEFAULT 30,
  p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS SETOF public.operational_locations
LANGUAGE sql
STABLE
SET search_path = public, extensions, pg_temp
AS $fn$
  WITH q AS (
    SELECT public.location_search_norm(p_query) AS n,
           public.location_code_norm(p_query)  AS c,
           replace(public.location_code_norm(p_query), ' ', '') AS cc,
           (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AS org
  ), words AS (
    SELECT array_remove(string_to_array((SELECT n FROM q), ' '), '') AS w
  )
  SELECT l.*
    FROM public.operational_locations l, q, words
   WHERE l.organization_id = q.org
     AND (p_include_inactive OR l.is_active)
     AND q.n <> ''
     AND (
          l.search_code = q.c
       OR replace(l.search_code, ' ', '') = q.cc
       OR starts_with(l.search_code, q.c)
       OR (l.search_name LIKE '%' || words.w[1] || '%'
           AND NOT EXISTS (SELECT 1 FROM unnest(words.w) x WHERE position(x IN l.search_name) = 0))
     )
   ORDER BY
     CASE
       WHEN l.search_code = q.c THEN 0
       WHEN replace(l.search_code, ' ', '') = q.cc THEN 1
       WHEN l.search_name = q.n THEN 2
       WHEN starts_with(l.search_code, q.c) AND length(q.cc) >= 2 THEN 3
       WHEN l.search_name LIKE q.n || '%' THEN 4
       WHEN l.search_name LIKE '% ' || q.n || '%' THEN 5
       WHEN starts_with(l.search_code, q.c) THEN 6
       ELSE 7
     END,
     l.is_active DESC,
     -- In operation (or no status) before planned / closed points.
     CASE WHEN COALESCE(l.ril100_status, 'Betrieb') = 'Betrieb' THEN 0 ELSE 1 END,
     -- The client's own Betriebsstellen first, then stations and stops.
     CASE WHEN l.source IS NULL THEN 0
          WHEN l.ril100_type IN ('Bf', 'NE-Bf') THEN 1
          WHEN l.ril100_type IN ('Hp', 'NE-Hp', 'Bft') THEN 2
          ELSE 3 END,
     length(l.name),
     l.name,
     l.id
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100)
$fn$;

REVOKE EXECUTE ON FUNCTION public.search_operational_locations(TEXT, INTEGER, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_operational_locations(TEXT, INTEGER, BOOLEAN) TO authenticated;

ANALYZE public.operational_locations;
