-- =============================================================================
--  20260424150000_calendar_self_contained.sql
--
--  Self-contained calendar RLS: this migration creates EVERY helper function
--  and EVERY policy the calendar pages depend on, idempotently. It does not
--  rely on the security_baseline migration having been fully applied.
--
--  Why this exists:
--    Postgres allows CREATE POLICY to reference functions that don't exist —
--    the function lookup is deferred until the policy is actually evaluated.
--    So the previous migrations may have created policies that reference
--    `is_admin_or_dispatcher_in()` but that function was never installed,
--    causing "function does not exist" at runtime — which surfaces in the
--    app as the empty-{} error from useCreateEvent / useCalendarEvents.
--
--  This migration:
--    1. Creates / refreshes the four helpers: get_my_org_id,
--       is_admin_or_dispatcher_in, calendar_event_org,
--       is_calendar_event_member, can_write_calendar_event.
--    2. Drops every existing policy on calendar_events and
--       calendar_event_members.
--    3. Re-creates the canonical policy set using the helpers (no recursion).
--    4. Verifies the helpers are callable with a SELECT at the end.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. HELPER FUNCTIONS — all SECURITY DEFINER + STABLE + pinned search_path
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_dispatcher_in(target_org UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND organization_id = target_org
      AND LOWER(role) IN ('admin', 'administrator', 'dispatcher')
  );
$$;

CREATE OR REPLACE FUNCTION public.calendar_event_org(p_event_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT organization_id
  FROM public.calendar_events
  WHERE id = p_event_id;
$$;

CREATE OR REPLACE FUNCTION public.is_calendar_event_member(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_event_members
    WHERE event_id = p_event_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_calendar_event(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = p_event_id
      AND e.organization_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
      AND (
        e.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND LOWER(p.role) IN ('admin', 'administrator', 'dispatcher')
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. CALENDAR_EVENTS — drop everything, install canonical policies.
-- ---------------------------------------------------------------------------
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'calendar_events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.calendar_events', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "calendar_events_select_org_member_or_invited"
  ON public.calendar_events
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND (
      public.is_admin_or_dispatcher_in(organization_id)
      OR creator_id = auth.uid()
      OR event_type IN ('birthday', 'holiday')
      OR public.is_calendar_event_member(id)
    )
  );

CREATE POLICY "calendar_events_insert_same_org"
  ON public.calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND creator_id = auth.uid()
  );

CREATE POLICY "calendar_events_update_creator_or_admin"
  ON public.calendar_events
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND (creator_id = auth.uid() OR public.is_admin_or_dispatcher_in(organization_id))
  )
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "calendar_events_delete_creator_or_admin"
  ON public.calendar_events
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND (creator_id = auth.uid() OR public.is_admin_or_dispatcher_in(organization_id))
  );

CREATE INDEX IF NOT EXISTS idx_calendar_events_org_id ON public.calendar_events (organization_id);

-- ---------------------------------------------------------------------------
-- 2. CALENDAR_EVENT_MEMBERS — drop everything, install canonical policies
--    that use the SECURITY DEFINER helpers so we never recurse back into
--    calendar_events RLS.
-- ---------------------------------------------------------------------------
ALTER TABLE public.calendar_event_members ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'calendar_event_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.calendar_event_members', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "calendar_event_members_select_same_org"
  ON public.calendar_event_members
  FOR SELECT TO authenticated
  USING (
    public.calendar_event_org(event_id) = public.get_my_org_id()
  );

CREATE POLICY "calendar_event_members_write_creator_or_admin"
  ON public.calendar_event_members
  FOR ALL TO authenticated
  USING (public.can_write_calendar_event(event_id))
  WITH CHECK (public.can_write_calendar_event(event_id));

CREATE INDEX IF NOT EXISTS idx_calendar_event_members_user
  ON public.calendar_event_members (user_id);

-- ---------------------------------------------------------------------------
-- 3. SANITY CHECK — fails fast if any helper still isn't callable.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM public.get_my_org_id();
  PERFORM public.is_admin_or_dispatcher_in('00000000-0000-0000-0000-000000000000'::uuid);
  PERFORM public.calendar_event_org('00000000-0000-0000-0000-000000000000'::uuid);
  PERFORM public.is_calendar_event_member('00000000-0000-0000-0000-000000000000'::uuid);
  PERFORM public.can_write_calendar_event('00000000-0000-0000-0000-000000000000'::uuid);
END $$;

COMMIT;

-- =============================================================================
--  ROLLBACK (commented)
--  BEGIN;
--    ALTER TABLE public.calendar_events        DISABLE ROW LEVEL SECURITY;
--    ALTER TABLE public.calendar_event_members DISABLE ROW LEVEL SECURITY;
--  COMMIT;
-- =============================================================================
