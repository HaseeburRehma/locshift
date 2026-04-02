-- ─────────────────────────────────────────────────────────
-- CALENDAR EVENTS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  creator_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  event_type      TEXT NOT NULL DEFAULT 'event'
                  CHECK (event_type IN ('event', 'shift', 'birthday', 'meeting', 'sick_leave', 'holiday', 'other')),
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  is_all_day      BOOLEAN NOT NULL DEFAULT false,
  color           TEXT DEFAULT '#0064E0',  -- hex color for event pill
  location        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- EVENT MEMBERS (who is invited/assigned to the event)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_event_members (
  event_id  UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);

-- ─────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS calendar_events_org_start_idx ON calendar_events(organization_id, start_time);
CREATE INDEX IF NOT EXISTS calendar_events_creator_idx ON calendar_events(creator_id);
CREATE INDEX IF NOT EXISTS calendar_event_members_user_idx ON calendar_event_members(user_id);

-- ─────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_members ENABLE ROW LEVEL SECURITY;

-- Users can see all events in their organization
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'calendar_events_org_select') THEN
        CREATE POLICY "calendar_events_org_select"
          ON calendar_events FOR SELECT
          USING (organization_id = public.get_my_org_id());
    END IF;
END $$;

-- Admins and dispatchers can create events
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'calendar_events_insert') THEN
        CREATE POLICY "calendar_events_insert"
          ON calendar_events FOR INSERT
          WITH CHECK (
            creator_id = auth.uid()
            AND organization_id = public.get_my_org_id()
          );
    END IF;
END $$;

-- Admins and dispatchers can update events they created
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'calendar_events_update') THEN
        CREATE POLICY "calendar_events_update"
          ON calendar_events FOR UPDATE
          USING (creator_id = auth.uid())
          WITH CHECK (creator_id = auth.uid());
    END IF;
END $$;

-- Only creator can delete
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'calendar_events_delete') THEN
        CREATE POLICY "calendar_events_delete"
          ON calendar_events FOR DELETE
          USING (creator_id = auth.uid());
    END IF;
END $$;

-- Event members visible to org members
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'calendar_members_select') THEN
        CREATE POLICY "calendar_members_select"
          ON calendar_event_members FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM calendar_events
              WHERE id = calendar_event_members.event_id
              AND organization_id = public.get_my_org_id()
            )
          );
    END IF;
END $$;

-- Creator can add members
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'calendar_members_insert') THEN
        CREATE POLICY "calendar_members_insert"
          ON calendar_event_members FOR INSERT
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM calendar_events
              WHERE id = calendar_event_members.event_id
              AND creator_id = auth.uid()
            )
          );
    END IF;
END $$;

-- Creator can remove members
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'calendar_members_delete') THEN
        CREATE POLICY "calendar_members_delete"
          ON calendar_event_members FOR DELETE
          USING (
            EXISTS (
              SELECT 1 FROM calendar_events
              WHERE id = calendar_event_members.event_id
              AND creator_id = auth.uid()
            )
          );
    END IF;
END $$;
