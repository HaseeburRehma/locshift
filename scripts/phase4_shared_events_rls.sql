

BEGIN;

-- ---------------------------------------------------------------------------
--  calendar_events — widen SELECT to include "invited as member"
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "calendar_events_select_org_or_member" ON public.calendar_events;

CREATE POLICY "calendar_events_select_org_or_member"
  ON public.calendar_events
  FOR SELECT
  USING (
    organization_id = public.get_my_org_id()
    AND (
      -- Admin / dispatcher see everything in the org
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'dispatcher')
      )
      -- Creator always sees their own events
      OR creator_id = auth.uid()
      -- Public event types visible to everyone in the org
      OR event_type IN ('birthday', 'holiday')
      -- Invited members see events they are attached to
      OR EXISTS (
        SELECT 1 FROM public.calendar_event_members m
        WHERE m.event_id = calendar_events.id
          AND m.user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
--  calendar_event_members — invitees can read their own membership rows
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "calendar_event_members_select_org" ON public.calendar_event_members;

CREATE POLICY "calendar_event_members_select_org"
  ON public.calendar_event_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = calendar_event_members.event_id
        AND e.organization_id = public.get_my_org_id()
    )
  );

-- Admin / dispatcher / creator can manage member rows
DROP POLICY IF EXISTS "calendar_event_members_write_admin" ON public.calendar_event_members;

CREATE POLICY "calendar_event_members_write_admin"
  ON public.calendar_event_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = calendar_event_members.event_id
        AND e.organization_id = public.get_my_org_id()
        AND (
          e.creator_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'dispatcher')
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = calendar_event_members.event_id
        AND e.organization_id = public.get_my_org_id()
        AND (
          e.creator_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'dispatcher')
          )
        )
    )
  );

COMMIT;
