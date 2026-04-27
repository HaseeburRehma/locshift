-- =============================================================================
--  20260424140000_calendar_rls_no_recursion.sql
--
--  Fix:  "infinite recursion detected in policy for relation calendar_events"
--
--  Cause: the baseline security migration introduced two policies that query
--         each other:
--           - calendar_events_select_org_member_or_invited
--               EXISTS (SELECT FROM calendar_event_members ...)   ← triggers
--                                                                   RLS on
--                                                                   members
--           - calendar_event_members_select_same_org
--               EXISTS (SELECT FROM calendar_events ...)          ← triggers
--                                                                   RLS on
--                                                                   events
--         Postgres detects the loop and aborts.
--
--  Fix:   Wrap both cross-table lookups in SECURITY DEFINER helper functions.
--         SECURITY DEFINER bypasses RLS for the internal SELECT, so the chain
--         bottoms out and the policy can evaluate. The helpers are STABLE +
--         search_path-pinned for safety.
--
--  This is purely a policy change — no schema, no data is touched.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Helper functions — bypass RLS to break the recursive policy chain.
-- ---------------------------------------------------------------------------

-- Returns the organization_id of a calendar event (bypasses RLS).
CREATE OR REPLACE FUNCTION public.calendar_event_org(p_event_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT organization_id
  FROM public.calendar_events
  WHERE id = p_event_id;
$$;

-- Returns TRUE if the current user is invited to the given calendar event
-- (bypasses RLS so the calendar_events SELECT policy can call it without
-- triggering calendar_event_members RLS).
CREATE OR REPLACE FUNCTION public.is_calendar_event_member(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_event_members
    WHERE event_id = p_event_id
      AND user_id = auth.uid()
  );
$$;

-- Returns TRUE if the current user may write membership rows for the given
-- event (creator of the event OR admin/dispatcher in the event's org).
CREATE OR REPLACE FUNCTION public.can_write_calendar_event(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
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
-- 2. Replace the recursive policies on calendar_events.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "calendar_events_select_org_member_or_invited" ON public.calendar_events;

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

-- ---------------------------------------------------------------------------
-- 3. Replace the recursive policies on calendar_event_members.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "calendar_event_members_select_same_org"          ON public.calendar_event_members;
DROP POLICY IF EXISTS "calendar_event_members_write_creator_or_admin"   ON public.calendar_event_members;

-- Anyone in the same org as the event can read membership rows.
CREATE POLICY "calendar_event_members_select_same_org"
  ON public.calendar_event_members
  FOR SELECT TO authenticated
  USING (
    public.calendar_event_org(event_id) = public.get_my_org_id()
  );

-- Only the event creator or an admin/dispatcher in the same org can write.
CREATE POLICY "calendar_event_members_write_creator_or_admin"
  ON public.calendar_event_members
  FOR ALL TO authenticated
  USING (public.can_write_calendar_event(event_id))
  WITH CHECK (public.can_write_calendar_event(event_id));

COMMIT;

-- =============================================================================
--  ROLLBACK
--    Re-applying 20260424120000_security_baseline.sql restores the prior
--    (recursive) policies. Use only if this fix needs to be reverted.
-- =============================================================================
