-- =============================================================================
--  20260424120000_security_baseline.sql
--  LokShift — comprehensive RLS hardening across all tenant-scoped tables.
--
--  This migration is the single source of truth for row-level security and
--  supersedes every prior ad-hoc fix file in scripts/ (lokshift_security_patch,
--  fix_recursion, fix_rls_definitive, fix_rls_final, fix_chat_recursion,
--  fix_plans_security, fix_times_security, fix_notifications_final, etc.).
--
--  WHAT IT DOES
--    1. Re-asserts ENABLE ROW LEVEL SECURITY on every tenant-scoped table.
--    2. Defensively wipes every existing policy on those tables (so the prior
--       half-applied patches can't conflict), then recreates a clean per-
--       operation set: SELECT / INSERT / UPDATE / DELETE.
--    3. Hardens the SECURITY DEFINER helper functions:
--         - SET search_path = public, pg_temp   (prevents schema-shadowing)
--         - STABLE                              (lets the planner cache results)
--    4. Adds a new helper public.is_admin_or_dispatcher_in(org_uuid) so every
--       policy reads the same way and an admin in Org A can never act on
--       data in Org B.
--    5. Adds the missing indexes on organization_id columns used in RLS.
--    6. Hardens the storage 'avatars' bucket — uploads must live under the
--       uploader's own UID folder.
--
--  WHAT IT DOES NOT DO
--    - It NEVER drops tables, columns, foreign keys, triggers, or any function
--      other than the temporary helper used during this migration.
--    - It does not change the application contract: every query the app
--      currently issues for a legitimate user continues to work.
--
--  REVERSIBILITY
--    See the commented-out ROLLBACK section at the bottom. Restoration is
--    best-effort because the prior policy set was inconsistent across files.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. HELPER FUNCTIONS
-- ---------------------------------------------------------------------------

-- Returns the current authenticated user's organisation id.
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Returns TRUE when the current user is an admin or dispatcher in target_org.
-- Centralises the role check used by every "admin can write" policy below.
CREATE OR REPLACE FUNCTION public.is_admin_or_dispatcher_in(target_org UUID)
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
      AND LOWER(role) IN ('admin', 'administrator', 'dispatcher')
  );
$$;

-- Existing chat-membership check — re-asserted with hardened attributes.
CREATE OR REPLACE FUNCTION public.is_chat_member(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
  );
$$;

-- Migration-local helper: drop ALL policies on a table by name (defensive
-- reset because earlier patches left half-applied policy fragments behind).
CREATE OR REPLACE FUNCTION public._reset_policies(target_table regclass)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
  pol RECORD;
  sname TEXT;
  tname TEXT;
BEGIN
  sname := split_part(target_table::text, '.', 1);
  tname := split_part(target_table::text, '.', 2);
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = sname AND tablename = tname
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol.policyname, target_table);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 1. ORGANIZATIONS — own-org read for authenticated users; anon may read
--    during signup (slug + name lookup before the profile exists).
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
SELECT public._reset_policies('public.organizations');

CREATE POLICY "organizations_select_own_org"
  ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.get_my_org_id());

-- Public lookup is needed for the registration flow (the user picks an
-- org by slug before they have a profile row). Limited to SELECT only.
CREATE POLICY "organizations_select_anon"
  ON public.organizations
  FOR SELECT TO anon
  USING (true);

-- INSERT/UPDATE/DELETE intentionally not exposed → service role only.

-- ---------------------------------------------------------------------------
-- 2. PROFILES — own + same-org SELECT; own UPDATE; admin same-org UPDATE
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
SELECT public._reset_policies('public.profiles');

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Same-org read so the admin Mitarbeiterliste, employee pickers, joins
-- (employee:profiles!employee_id(...)) all keep working.
CREATE POLICY "profiles_select_same_org"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND organization_id = public.get_my_org_id()
  );

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_admin_same_org"
  ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_dispatcher_in(organization_id))
  WITH CHECK (public.is_admin_or_dispatcher_in(organization_id));

-- INSERT: the SECURITY DEFINER signup trigger handles the normal case;
-- this policy is a safety-net so signup never blocks if the trigger fails.
CREATE POLICY "profiles_insert_self"
  ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- DELETE intentionally not exposed → service role only (use admin endpoint).

-- ---------------------------------------------------------------------------
-- 3. PLANS — same-org always; employees see own + own-status updates;
--    admins/dispatchers full CRUD inside their own org.
-- ---------------------------------------------------------------------------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
SELECT public._reset_policies('public.plans');

CREATE POLICY "plans_select_same_org"
  ON public.plans
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND (
      employee_id = auth.uid()
      OR creator_id = auth.uid()
      OR public.is_admin_or_dispatcher_in(organization_id)
    )
  );

CREATE POLICY "plans_insert_admin_same_org"
  ON public.plans
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
  );

CREATE POLICY "plans_update_admin_same_org"
  ON public.plans
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
  )
  WITH CHECK (organization_id = public.get_my_org_id());

-- Employees may UPDATE their own plan — needed for the confirm/reject flow.
CREATE POLICY "plans_update_own_status"
  ON public.plans
  FOR UPDATE TO authenticated
  USING (
    employee_id = auth.uid()
    AND organization_id = public.get_my_org_id()
  )
  WITH CHECK (
    employee_id = auth.uid()
    AND organization_id = public.get_my_org_id()
  );

CREATE POLICY "plans_delete_admin_same_org"
  ON public.plans
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
  );

CREATE INDEX IF NOT EXISTS idx_plans_org_id      ON public.plans (organization_id);
CREATE INDEX IF NOT EXISTS idx_plans_employee_id ON public.plans (employee_id);
CREATE INDEX IF NOT EXISTS idx_plans_creator_id  ON public.plans (creator_id);

-- ---------------------------------------------------------------------------
-- 4. TIME_ENTRIES — employee creates/edits own; admin same-org full CRUD.
-- ---------------------------------------------------------------------------
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
SELECT public._reset_policies('public.time_entries');

CREATE POLICY "time_entries_select_same_org"
  ON public.time_entries
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND (
      employee_id = auth.uid()
      OR public.is_admin_or_dispatcher_in(organization_id)
    )
  );

CREATE POLICY "time_entries_insert_self_or_admin"
  ON public.time_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND (
      employee_id = auth.uid()
      OR public.is_admin_or_dispatcher_in(organization_id)
    )
  );

CREATE POLICY "time_entries_update_self_or_admin"
  ON public.time_entries
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND (
      employee_id = auth.uid()
      OR public.is_admin_or_dispatcher_in(organization_id)
    )
  )
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND (
      employee_id = auth.uid()
      OR public.is_admin_or_dispatcher_in(organization_id)
    )
  );

CREATE POLICY "time_entries_delete_admin_same_org"
  ON public.time_entries
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
  );

CREATE INDEX IF NOT EXISTS idx_time_entries_org_id      ON public.time_entries (organization_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON public.time_entries (employee_id);

-- ---------------------------------------------------------------------------
-- 5. CUSTOMERS — same-org read for everyone; only admin/dispatcher writes.
-- ---------------------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
SELECT public._reset_policies('public.customers');

CREATE POLICY "customers_select_same_org"
  ON public.customers
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "customers_insert_admin_same_org"
  ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
  );

CREATE POLICY "customers_update_admin_same_org"
  ON public.customers
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
  )
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "customers_delete_admin_same_org"
  ON public.customers
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
  );

CREATE INDEX IF NOT EXISTS idx_customers_org_id ON public.customers (organization_id);

-- ---------------------------------------------------------------------------
-- 6. PER_DIEMS — own SELECT/INSERT; admin/dispatcher in org full CRUD.
-- ---------------------------------------------------------------------------
ALTER TABLE public.per_diems ENABLE ROW LEVEL SECURITY;
SELECT public._reset_policies('public.per_diems');

CREATE POLICY "per_diems_select_own_or_admin"
  ON public.per_diems
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND (
      employee_id = auth.uid()
      OR public.is_admin_or_dispatcher_in(organization_id)
    )
  );

CREATE POLICY "per_diems_insert_self_or_admin"
  ON public.per_diems
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND (
      employee_id = auth.uid()
      OR public.is_admin_or_dispatcher_in(organization_id)
    )
  );

CREATE POLICY "per_diems_update_admin_same_org"
  ON public.per_diems
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
  )
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "per_diems_delete_admin_same_org"
  ON public.per_diems
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
  );

CREATE INDEX IF NOT EXISTS idx_per_diems_org_id      ON public.per_diems (organization_id);
CREATE INDEX IF NOT EXISTS idx_per_diems_employee_id ON public.per_diems (employee_id);

-- ---------------------------------------------------------------------------
-- 7. HOLIDAY_BONUSES — employee SELECT own; admin/dispatcher in org full CRUD.
-- ---------------------------------------------------------------------------
ALTER TABLE public.holiday_bonuses ENABLE ROW LEVEL SECURITY;
SELECT public._reset_policies('public.holiday_bonuses');

CREATE POLICY "holiday_bonuses_select_own_or_admin"
  ON public.holiday_bonuses
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND (
      employee_id = auth.uid()
      OR public.is_admin_or_dispatcher_in(organization_id)
    )
  );

CREATE POLICY "holiday_bonuses_insert_admin_same_org"
  ON public.holiday_bonuses
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
  );

CREATE POLICY "holiday_bonuses_update_admin_same_org"
  ON public.holiday_bonuses
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
  )
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "holiday_bonuses_delete_admin_same_org"
  ON public.holiday_bonuses
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
  );

CREATE INDEX IF NOT EXISTS idx_holiday_bonuses_org_id      ON public.holiday_bonuses (organization_id);
CREATE INDEX IF NOT EXISTS idx_holiday_bonuses_employee_id ON public.holiday_bonuses (employee_id);

-- ---------------------------------------------------------------------------
-- 8. NOTIFICATIONS — own SELECT/UPDATE/DELETE; INSERT scoped to same org so
--    cross-tenant spam / phishing is impossible.
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
SELECT public._reset_policies('public.notifications');

CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Recipient must be in the SAME org as the inserter. Closes the previous
-- "any authenticated user can spam any other user" loophole.
CREATE POLICY "notifications_insert_same_org"
  ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles recipient
      WHERE recipient.id = notifications.user_id
        AND recipient.organization_id = public.get_my_org_id()
    )
  );

CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_own"
  ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- (idx_notifications_user_id already exists from init_notifications.sql)

-- ---------------------------------------------------------------------------
-- 9. CHAT_CONVERSATIONS — participants only; admin same-org override.
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
SELECT public._reset_policies('public.chat_conversations');

CREATE POLICY "chat_conversations_select_participant_or_admin"
  ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND (
      public.is_chat_member(id)
      OR public.is_admin_or_dispatcher_in(organization_id)
    )
  );

CREATE POLICY "chat_conversations_insert_same_org"
  ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND created_by = auth.uid()
  );

CREATE POLICY "chat_conversations_update_creator_or_admin"
  ON public.chat_conversations
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND (created_by = auth.uid() OR public.is_admin_or_dispatcher_in(organization_id))
  )
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "chat_conversations_delete_creator_or_admin"
  ON public.chat_conversations
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND (created_by = auth.uid() OR public.is_admin_or_dispatcher_in(organization_id))
  );

CREATE INDEX IF NOT EXISTS idx_chat_conversations_org ON public.chat_conversations (organization_id);

-- ---------------------------------------------------------------------------
-- 10. CHAT_MEMBERS — participants only; conversation creator/admin write.
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
SELECT public._reset_policies('public.chat_members');

CREATE POLICY "chat_members_select_participants"
  ON public.chat_members
  FOR SELECT TO authenticated
  USING (public.is_chat_member(conversation_id));

CREATE POLICY "chat_members_insert_creator_or_self"
  ON public.chat_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_members.conversation_id
        AND (c.created_by = auth.uid() OR public.is_admin_or_dispatcher_in(c.organization_id))
    )
  );

CREATE POLICY "chat_members_update_self"
  ON public.chat_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_members_delete_self_or_admin"
  ON public.chat_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_members.conversation_id
        AND (c.created_by = auth.uid() OR public.is_admin_or_dispatcher_in(c.organization_id))
    )
  );

CREATE INDEX IF NOT EXISTS idx_chat_members_user ON public.chat_members (user_id);

-- ---------------------------------------------------------------------------
-- 11. CHAT_MESSAGES — participants only; sender owns their own messages.
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
SELECT public._reset_policies('public.chat_messages');

CREATE POLICY "chat_messages_select_participant"
  ON public.chat_messages
  FOR SELECT TO authenticated
  USING (public.is_chat_member(conversation_id));

CREATE POLICY "chat_messages_insert_participant"
  ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_chat_member(conversation_id)
  );

CREATE POLICY "chat_messages_update_own"
  ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "chat_messages_delete_own_or_admin"
  ON public.chat_messages
  FOR DELETE TO authenticated
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND public.is_admin_or_dispatcher_in(c.organization_id)
    )
  );

CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON public.chat_messages (conversation_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 12. CALENDAR_EVENTS — restated here for completeness (matches phase4).
-- ---------------------------------------------------------------------------
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
SELECT public._reset_policies('public.calendar_events');

CREATE POLICY "calendar_events_select_org_member_or_invited"
  ON public.calendar_events
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND (
      public.is_admin_or_dispatcher_in(organization_id)
      OR creator_id = auth.uid()
      OR event_type IN ('birthday', 'holiday')
      OR EXISTS (
        SELECT 1 FROM public.calendar_event_members m
        WHERE m.event_id = calendar_events.id
          AND m.user_id = auth.uid()
      )
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
-- 13. CALENDAR_EVENT_MEMBERS — invitee read; creator/admin write.
-- ---------------------------------------------------------------------------
ALTER TABLE public.calendar_event_members ENABLE ROW LEVEL SECURITY;
SELECT public._reset_policies('public.calendar_event_members');

CREATE POLICY "calendar_event_members_select_same_org"
  ON public.calendar_event_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = calendar_event_members.event_id
        AND e.organization_id = public.get_my_org_id()
    )
  );

CREATE POLICY "calendar_event_members_write_creator_or_admin"
  ON public.calendar_event_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = calendar_event_members.event_id
        AND e.organization_id = public.get_my_org_id()
        AND (e.creator_id = auth.uid() OR public.is_admin_or_dispatcher_in(e.organization_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = calendar_event_members.event_id
        AND e.organization_id = public.get_my_org_id()
        AND (e.creator_id = auth.uid() OR public.is_admin_or_dispatcher_in(e.organization_id))
    )
  );

CREATE INDEX IF NOT EXISTS idx_calendar_event_members_user ON public.calendar_event_members (user_id);

-- ---------------------------------------------------------------------------
-- 14. OPERATIONAL_LOCATIONS — restated for completeness.
-- ---------------------------------------------------------------------------
ALTER TABLE public.operational_locations ENABLE ROW LEVEL SECURITY;
SELECT public._reset_policies('public.operational_locations');

CREATE POLICY "operational_locations_select_same_org"
  ON public.operational_locations
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "operational_locations_write_admin_same_org"
  ON public.operational_locations
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
  )
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
  );

-- ---------------------------------------------------------------------------
-- 15. SHIFT_TEMPLATES — restated for completeness.
-- ---------------------------------------------------------------------------
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;
SELECT public._reset_policies('public.shift_templates');

CREATE POLICY "shift_templates_select_same_org"
  ON public.shift_templates
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "shift_templates_write_admin_same_org"
  ON public.shift_templates
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
  )
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.is_admin_or_dispatcher_in(organization_id)
  );

-- ---------------------------------------------------------------------------
-- 16. WORKING_TIME_MODELS — restated for completeness.
--
--     Guarded with to_regclass() because this table is defined in
--     scripts/migration_work_models.sql but that script was never applied to
--     all environments. Skipping silently is safer than failing the whole
--     migration. If you later run migration_work_models.sql, re-run THIS
--     migration to install the policies.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.working_time_models') IS NULL THEN
    RAISE NOTICE 'Skipping working_time_models — table not present in this database.';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.working_time_models ENABLE ROW LEVEL SECURITY';
  PERFORM public._reset_policies('public.working_time_models');

  EXECUTE $POL$
    CREATE POLICY "working_time_models_select_same_org"
      ON public.working_time_models
      FOR SELECT TO authenticated
      USING (organization_id = public.get_my_org_id())
  $POL$;

  EXECUTE $POL$
    CREATE POLICY "working_time_models_write_admin_same_org"
      ON public.working_time_models
      FOR ALL TO authenticated
      USING (
        organization_id = public.get_my_org_id()
        AND public.is_admin_or_dispatcher_in(organization_id)
      )
      WITH CHECK (
        organization_id = public.get_my_org_id()
        AND public.is_admin_or_dispatcher_in(organization_id)
      )
  $POL$;

  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_working_time_models_org ON public.working_time_models (organization_id)';
END $$;

-- ---------------------------------------------------------------------------
-- 17. STORAGE — avatars bucket scoped to uploader's UID folder.
--     Convention: clients upload to `<auth.uid()>/<filename>` inside the
--     'avatars' bucket. Public reads remain so <Image src> works without auth.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar."          ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar."    ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar."    ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_select"                 ON storage.objects;
DROP POLICY IF EXISTS "avatars_uid_scoped_insert"             ON storage.objects;
DROP POLICY IF EXISTS "avatars_uid_scoped_update"             ON storage.objects;
DROP POLICY IF EXISTS "avatars_uid_scoped_delete"             ON storage.objects;

CREATE POLICY "avatars_public_select"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_uid_scoped_insert"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_uid_scoped_update"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_uid_scoped_delete"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- 18. CLEANUP — drop the migration-local helper.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public._reset_policies(regclass);

COMMIT;

-- =============================================================================
--  ROLLBACK (commented out on purpose)
--
--  The previous policy state was an inconsistent mix of half-applied scripts,
--  so a perfect restoration is not possible. The safest revert is to disable
--  RLS on the touched tables temporarily (leaving the data visible to any
--  authenticated client), then re-apply this migration once the issue is
--  understood.
--
--  BEGIN;
--  ALTER TABLE public.organizations          DISABLE ROW LEVEL SECURITY;
--  ALTER TABLE public.profiles               DISABLE ROW LEVEL SECURITY;
--  ALTER TABLE public.plans                  DISABLE ROW LEVEL SECURITY;
--  ALTER TABLE public.time_entries           DISABLE ROW LEVEL SECURITY;
--  ALTER TABLE public.customers              DISABLE ROW LEVEL SECURITY;
--  ALTER TABLE public.per_diems              DISABLE ROW LEVEL SECURITY;
--  ALTER TABLE public.holiday_bonuses        DISABLE ROW LEVEL SECURITY;
--  ALTER TABLE public.notifications          DISABLE ROW LEVEL SECURITY;
--  ALTER TABLE public.chat_conversations     DISABLE ROW LEVEL SECURITY;
--  ALTER TABLE public.chat_members           DISABLE ROW LEVEL SECURITY;
--  ALTER TABLE public.chat_messages          DISABLE ROW LEVEL SECURITY;
--  ALTER TABLE public.calendar_events        DISABLE ROW LEVEL SECURITY;
--  ALTER TABLE public.calendar_event_members DISABLE ROW LEVEL SECURITY;
--  ALTER TABLE public.operational_locations  DISABLE ROW LEVEL SECURITY;
--  ALTER TABLE public.shift_templates        DISABLE ROW LEVEL SECURITY;
--  ALTER TABLE public.working_time_models    DISABLE ROW LEVEL SECURITY;
--  COMMIT;
-- =============================================================================
