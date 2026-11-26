-- ===========================================================================
-- LokShift Dev Spec – Billing Rules (Rhein Maas Rail, Nov 2026)
--
--   1. profiles.federal_state      Bundesland per employee (public holidays)
--   2. employee_pay_rates          regular + Gastfahrt hourly wage, dated
--   3. time_entries_normalize      Spesen rule in the DB (< 8 h 0 €,
--                                  ≥ 8 h 14 €, ≥ 8 h + overnight 28 €) and
--                                  date = German start day (month rule)
--   4. Backfill                    Spesen of entries not yet approved
--   5. Betriebsstellen search      normalised columns, trigram indexes,
--                                  search_operational_locations() RPC
--   6. Absences                    vacation / sick leave only as full days
--
-- Idempotent: safe to run again. The RIL100 data import is a separate
-- migration (20261125130000_ril100_betriebsstellen_data.sql).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Bundesland per employee
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS federal_state TEXT;
UPDATE public.profiles SET federal_state = 'NW' WHERE federal_state IS NULL;
ALTER TABLE public.profiles ALTER COLUMN federal_state SET DEFAULT 'NW';
ALTER TABLE public.profiles ALTER COLUMN federal_state SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_federal_state_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_federal_state_check CHECK (federal_state IN
      ('BW','BY','BE','BB','HB','HH','HE','MV','NI','NW','RP','SL','SN','ST','SH','TH'));
  END IF;
END $$;
COMMENT ON COLUMN public.profiles.federal_state IS
  'Bundesland (ISO 3166-2:DE without prefix) — decides which public holidays get the holiday surcharge.';

-- Only admins change it (it decides pay); support/SQL unrestricted.
CREATE OR REPLACE FUNCTION public.profiles_federal_state_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND TG_OP = 'UPDATE'
     AND NEW.federal_state IS DISTINCT FROM OLD.federal_state
     AND NOT public.is_admin_in(OLD.organization_id) THEN
    RAISE EXCEPTION 'Das Bundesland dürfen nur Admins ändern.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.profiles_federal_state_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_federal_state_guard ON public.profiles;
CREATE TRIGGER profiles_federal_state_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_federal_state_guard();

-- ---------------------------------------------------------------------------
-- 2. Hourly wages (regular + Gastfahrt), valid from a date
--    Pay data is confidential: admins of the org and the employee read it,
--    only admins write it. Profiles stay readable for the whole org, so the
--    wage lives in its own table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_pay_rates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  valid_from        DATE NOT NULL,
  hourly_wage       NUMERIC(10,2) CHECK (hourly_wage IS NULL OR (hourly_wage > 0 AND hourly_wage <= 1000)),
  guest_hourly_wage NUMERIC(10,2) CHECK (guest_hourly_wage IS NULL OR (guest_hourly_wage > 0 AND guest_hourly_wage <= 1000)),
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employee_pay_rates_one_per_day UNIQUE (employee_id, valid_from),
  CONSTRAINT employee_pay_rates_has_value CHECK (hourly_wage IS NOT NULL OR guest_hourly_wage IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_employee_pay_rates_org_emp ON public.employee_pay_rates (organization_id, employee_id, valid_from);

COMMENT ON TABLE public.employee_pay_rates IS
  'Regular gross hourly wage (surcharge basis) and Gastfahrt hourly wage per employee; a rate applies from valid_from until the next one. A shift uses the rate of its start day.';

-- The employee must belong to the row's organisation; bookkeeping columns.
CREATE OR REPLACE FUNCTION public.employee_pay_rates_prepare()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.employee_id AND p.organization_id = NEW.organization_id) THEN
    RAISE EXCEPTION 'Mitarbeiter gehört nicht zu dieser Organisation.' USING ERRCODE = '42501';
  END IF;
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(auth.uid(), NEW.created_by);
  ELSE
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.employee_pay_rates_prepare() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS employee_pay_rates_prepare ON public.employee_pay_rates;
CREATE TRIGGER employee_pay_rates_prepare
  BEFORE INSERT OR UPDATE ON public.employee_pay_rates
  FOR EACH ROW EXECUTE FUNCTION public.employee_pay_rates_prepare();

ALTER TABLE public.employee_pay_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employee_pay_rates_select ON public.employee_pay_rates;
CREATE POLICY employee_pay_rates_select ON public.employee_pay_rates
  FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR public.is_admin_in(organization_id));
DROP POLICY IF EXISTS employee_pay_rates_write ON public.employee_pay_rates;
CREATE POLICY employee_pay_rates_write ON public.employee_pay_rates
  FOR ALL TO authenticated
  USING (public.is_admin_in(organization_id))
  WITH CHECK (public.is_admin_in(organization_id));
REVOKE ALL ON public.employee_pay_rates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_pay_rates TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. time_entries_normalize — same function as in 20261119120000_qa_fixes.sql
--    with two additions (marked "Billing spec"):
--      a) date = German calendar day of start_time (a shift belongs to the
--         month it STARTED in, section 6)
--      b) meal_allowance follows the Spesen rule (section 4); recalculated
--         only when hours, overnight or the amount itself change, so an
--         untouched, already approved entry keeps its stored value.
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

-- ---------------------------------------------------------------------------
-- 4. Backfill — Spesen of entries that are NOT approved yet. Approved
--    (possibly already paid) months keep their stored amounts; the report
--    after this migration lists how many differ. Normalize/audit triggers
--    are paused so this maintenance neither marks entries as corrected nor
--    shows up in every entry's Verlauf.
-- ---------------------------------------------------------------------------
ALTER TABLE public.time_entries DISABLE TRIGGER time_entries_normalize;
ALTER TABLE public.time_entries DISABLE TRIGGER time_entries_audit;

UPDATE public.time_entries te
   SET meal_allowance = x.rule
  FROM (
    SELECT t.id,
           CASE WHEN t.net_hours < 8 THEN 0
                WHEN COALESCE(t.overnight_stay, FALSE) THEN COALESCE(NULLIF(o.spesen_rate_full, 0), 28)
                ELSE COALESCE(NULLIF(o.spesen_rate_partial, 0), 14) END AS rule
      FROM public.time_entries t
      JOIN public.organizations o ON o.id = t.organization_id
     WHERE t.end_time IS NOT NULL
       AND NOT COALESCE(t.is_verified, FALSE)
  ) x
 WHERE te.id = x.id
   AND te.meal_allowance IS DISTINCT FROM x.rule;

-- Month rule for rows whose stored date is not the German start day
-- (only possible from old clients; normally none).
UPDATE public.time_entries
   SET date = (start_time AT TIME ZONE 'Europe/Berlin')::DATE
 WHERE start_time IS NOT NULL
   AND date IS DISTINCT FROM (start_time AT TIME ZONE 'Europe/Berlin')::DATE;

ALTER TABLE public.time_entries ENABLE TRIGGER time_entries_audit;
ALTER TABLE public.time_entries ENABLE TRIGGER time_entries_normalize;

-- ---------------------------------------------------------------------------
-- 5. Betriebsstellen: server-side type-ahead search over ~24 000 RIL100
--    operating points (name ↔ code, both directions), so no client has to
--    download the whole list.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Same normalisation as normalize() in lib/operational-locations/parse.ts:
-- lower case, ä→ae ö→oe ü→ue ß→ss, accents removed, other characters → space.
CREATE OR REPLACE FUNCTION public.location_search_norm(p TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT btrim(regexp_replace(
    translate(
      replace(replace(replace(replace(lower(COALESCE(p, '')), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
      'àáâãåāăąèéêëēėęěìíîïīįòóôõøōőùúûūůűųýÿçćčđďğłľńňñřśšşťțźżž',
      'aaaaaaaaeeeeeeeeiiiiiioooooooouuuuuuuyycccddgllnnnrsssttzzz'
    ),
    '[^a-z0-9]+', ' ', 'g'))
$$;

-- Code as written by RIL100, whitespace runs collapsed ("AA  G" → "AA G").
CREATE OR REPLACE FUNCTION public.location_code_norm(p TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT upper(regexp_replace(btrim(COALESCE(p, '')), '\s+', ' ', 'g'))
$$;

ALTER TABLE public.operational_locations ADD COLUMN IF NOT EXISTS ril100_type TEXT;
ALTER TABLE public.operational_locations ADD COLUMN IF NOT EXISTS ril100_status TEXT;
ALTER TABLE public.operational_locations ADD COLUMN IF NOT EXISTS plc_code TEXT;
ALTER TABLE public.operational_locations ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.operational_locations ADD COLUMN IF NOT EXISTS search_name TEXT
  GENERATED ALWAYS AS (public.location_search_norm(name)) STORED;
ALTER TABLE public.operational_locations ADD COLUMN IF NOT EXISTS search_code TEXT
  GENERATED ALWAYS AS (public.location_code_norm(short_code)) STORED;

COMMENT ON COLUMN public.operational_locations.ril100_type IS 'RIL100 Typ-Kurz (Bf, Hp, Bft, Abzw, …).';
COMMENT ON COLUMN public.operational_locations.ril100_status IS 'RIL100 Betriebszustand at import (Betrieb, stillg., a.B., Planung, Studie, empty).';
COMMENT ON COLUMN public.operational_locations.source IS 'Origin, e.g. "RIL100 30.10.2026" for imported rows; NULL = created in the app.';

-- pg_trgm may live in "extensions" (Supabase default) or "public".
DO $$
DECLARE v_schema TEXT;
BEGIN
  SELECT n.nspname INTO v_schema FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pg_trgm';
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_oploc_search_name_trgm ON public.operational_locations USING gin (search_name %I.gin_trgm_ops)', v_schema);
END $$;
CREATE INDEX IF NOT EXISTS idx_oploc_org_search_code ON public.operational_locations (organization_id, search_code text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_oploc_org_code_compact ON public.operational_locations (organization_id, (replace(search_code, ' ', '')));
CREATE INDEX IF NOT EXISTS idx_oploc_org_name ON public.operational_locations (organization_id, name);

-- Type-ahead: code (exact, compact, prefix) and name (exact, prefix, word,
-- every word contained). Runs with the caller's rights (RLS applies).
CREATE OR REPLACE FUNCTION public.search_operational_locations(
  p_query TEXT,
  p_limit INTEGER DEFAULT 30,
  p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS SETOF public.operational_locations
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
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
     -- The client's own Betriebsstellen first, then stations and stops.
     CASE WHEN l.source IS NULL THEN 0
          WHEN l.ril100_type IN ('Bf', 'NE-Bf') THEN 1
          WHEN l.ril100_type IN ('Hp', 'NE-Hp', 'Bft') THEN 2
          ELSE 3 END,
     length(l.name),
     l.name,
     l.id
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100)
$$;
REVOKE EXECUTE ON FUNCTION public.search_operational_locations(TEXT, INTEGER, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_operational_locations(TEXT, INTEGER, BOOLEAN) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Absences: vacation and sick leave only as full days (section 8).
--    Calendar requests of these types are stored as all-day events.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calendar_events_full_day_absence()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.event_type IN ('holiday', 'sick_leave') THEN
    NEW.is_all_day := TRUE;
    -- Whole German days: from 00:00 of the first day to 00:00 after the last.
    NEW.start_time := ((NEW.start_time AT TIME ZONE 'Europe/Berlin')::DATE)::TIMESTAMP AT TIME ZONE 'Europe/Berlin';
    NEW.end_time := ((((GREATEST(NEW.end_time - INTERVAL '1 minute', NEW.start_time)) AT TIME ZONE 'Europe/Berlin')::DATE + 1)::TIMESTAMP) AT TIME ZONE 'Europe/Berlin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calendar_events_full_day_absence ON public.calendar_events;
CREATE TRIGGER calendar_events_full_day_absence
  BEFORE INSERT OR UPDATE OF event_type, start_time, end_time, is_all_day ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.calendar_events_full_day_absence();
