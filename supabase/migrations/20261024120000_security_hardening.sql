-- =============================================================================
-- LokShift — Security hardening (24.10.2026)
--
--   1  chat-attachments   Nobody could list/download through the storage API
--                         outside their conversations (previously anyone,
--                         even unauthenticated, could list every org's files).
--                         Public object URLs keep working for existing
--                         messages and installed app versions.
--   2  per_diems          Employees can no longer file a claim as already
--                         approved or change status/amount bookkeeping.
--   3  notifications      Direct inserts mirror /api/notifications/dispatch:
--                         employees reach themselves, managers, and people
--                         they share a chat with; links must be app-relative.
--   4  profiles           Employees can't change HR fields of their own
--                         record (target hours, working-time model, rates).
--   5  signup trigger     Role and organisation are never taken from the
--                         signup metadata (self-chosen → instant admin).
--   6  absences           Only admin/dispatch decide vacation / sick leave
--                         (calendar_events.request_status, absences.status).
--   7  chat               No self-joining other conversations, no
--                         conversations or members across organisations.
--
-- Needs the mobile repo's 20260607120000_absence_approval_workflow.sql
-- (calendar_events.request_status); section 6 skips it when absent.
--
-- Idempotent — can be run several times.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. CHAT ATTACHMENTS — paths are attachments/<conversation_id>/<file>
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_attachment_conversation(p_name TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN (storage.foldername(p_name))[1] = 'attachments'
     AND (storage.foldername(p_name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN ((storage.foldername(p_name))[2])::UUID
  END;
$$;

DROP POLICY IF EXISTS "chat_attachments_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS chat_attachments_select_member ON storage.objects;
DROP POLICY IF EXISTS chat_attachments_insert_member ON storage.objects;

CREATE POLICY chat_attachments_select_member
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND public.chat_attachment_conversation(name) IS NOT NULL
    AND public.is_chat_member(public.chat_attachment_conversation(name))
  );

CREATE POLICY chat_attachments_insert_member
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND public.chat_attachment_conversation(name) IS NOT NULL
    AND public.is_chat_member(public.chat_attachment_conversation(name))
  );

-- ---------------------------------------------------------------------------
-- 2. PER_DIEMS — employees only submit; approval is a manager action
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.per_diems_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin_or_dispatcher_in(NEW.organization_id) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'submitted';
    IF NEW.amount IS NULL OR NEW.amount < 0 OR NEW.amount > 10000 THEN
      RAISE EXCEPTION 'Ungültiger Spesenbetrag.' USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS per_diems_guard ON public.per_diems;
CREATE TRIGGER per_diems_guard
  BEFORE INSERT OR UPDATE ON public.per_diems
  FOR EACH ROW EXECUTE FUNCTION public.per_diems_guard();

-- ---------------------------------------------------------------------------
-- 3. NOTIFICATIONS — same rules as the dispatch route
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_notify(p_recipient UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles r
    WHERE r.id = p_recipient
      AND r.organization_id = public.get_my_org_id()
      AND (
        r.id = auth.uid()
        OR public.is_admin_or_dispatcher_in(r.organization_id)
        OR LOWER(COALESCE(r.role, '')) IN ('admin', 'administrator', 'dispatcher', 'disponent')
        OR EXISTS (
          SELECT 1 FROM public.chat_members a
          JOIN public.chat_members b ON b.conversation_id = a.conversation_id
          WHERE a.user_id = auth.uid() AND b.user_id = r.id
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.can_notify(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_notify(UUID) TO authenticated;

DROP POLICY IF EXISTS "notifications_insert_same_org" ON public.notifications;
CREATE POLICY "notifications_insert_same_org"
  ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.can_notify(user_id));

-- App-relative links only ("/dashboard/…"); NOT VALID keeps old rows.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'link')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_link_relative') THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_link_relative
      CHECK (link IS NULL OR link ~ '^/[^/\\]') NOT VALID;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. PROFILES — HR fields only via admin/dispatch
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  hr_fields TEXT[] := ARRAY[
    'target_hours', 'working_time_model_id', 'hourly_rate', 'email',
    'employee_number', 'personnel_number', 'vacation_days', 'annual_leave_days',
    'contract_type', 'hire_date', 'entry_date', 'salary', 'wage'
  ];
  f TEXT;
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
  IF NOT public.is_admin_or_dispatcher_in(OLD.organization_id) THEN
    FOREACH f IN ARRAY hr_fields LOOP
      IF (to_jsonb(NEW) -> f) IS DISTINCT FROM (to_jsonb(OLD) -> f) THEN
        RAISE EXCEPTION 'Dieses Feld darf nur die Disposition oder ein Admin ändern.' USING ERRCODE = '42501';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard ON public.profiles;
CREATE TRIGGER profiles_guard
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard();

-- ---------------------------------------------------------------------------
-- 5. SIGNUP — role and organisation never come from signup metadata
--    (user_metadata is chosen by whoever signs up; previously
--    {"role":"admin","organization_id":"<any org>"} created an admin there).
--    Self-registered accounts are employees of the default organisation as
--    before; admins create everyone else via /api/users/create.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_lokshift_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  default_org_id UUID;
BEGIN
  SELECT id INTO default_org_id FROM public.organizations ORDER BY created_at, id LIMIT 1;
  BEGIN
    INSERT INTO public.profiles (id, full_name, email, organization_id, role)
    VALUES (
      NEW.id,
      left(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 200),
      NEW.email,
      default_org_id,
      'employee'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Never block the auth user; the app creates the profile as fallback.
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_lokshift_user();

-- ---------------------------------------------------------------------------
-- 6. ABSENCES — approval is a manager decision
--    Vacation / sick leave live in calendar_events (event_type holiday /
--    sick_leave, request_status) and the legacy absences table. Employees
--    could set request_status / status to 'approved' on their own rows, which
--    lowers their target hours in every report.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calendar_events_absence_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin_or_dispatcher_in(COALESCE(NEW.organization_id, OLD.organization_id)) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Decisions are never filed by the requester.
    NEW.decided_by := NULL;
    NEW.decision_reason := NULL;
    IF NEW.event_type = 'holiday' THEN
      NEW.request_status := 'pending';
      NEW.decided_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE by the creator.
  IF (OLD.event_type IN ('holiday', 'sick_leave') OR NEW.event_type IN ('holiday', 'sick_leave'))
     AND NEW.event_type IS DISTINCT FROM OLD.event_type THEN
    RAISE EXCEPTION 'Die Art einer Abwesenheit kann nicht geändert werden.' USING ERRCODE = '42501';
  END IF;
  IF NEW.request_status IS DISTINCT FROM OLD.request_status
     OR NEW.decided_by IS DISTINCT FROM OLD.decided_by
     OR NEW.decided_at IS DISTINCT FROM OLD.decided_at
     OR NEW.decision_reason IS DISTINCT FROM OLD.decision_reason THEN
    RAISE EXCEPTION 'Über Abwesenheiten entscheiden Disposition oder Admin.' USING ERRCODE = '42501';
  END IF;
  -- Changing the dates of a decided vacation request makes it a new request.
  IF NEW.event_type = 'holiday'
     AND (NEW.start_time IS DISTINCT FROM OLD.start_time OR NEW.end_time IS DISTINCT FROM OLD.end_time)
     AND OLD.request_status IS DISTINCT FROM 'pending' THEN
    NEW.request_status := 'pending';
    NEW.decided_by := NULL;
    NEW.decided_at := NULL;
    NEW.decision_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'request_status') THEN
    DROP TRIGGER IF EXISTS calendar_events_zz_absence_guard ON public.calendar_events;
    -- Name sorts after calendar_events_set_absence_status, so the default
    -- status is set first and this guard has the last word.
    CREATE TRIGGER calendar_events_zz_absence_guard
      BEFORE INSERT OR UPDATE ON public.calendar_events
      FOR EACH ROW EXECUTE FUNCTION public.calendar_events_absence_guard();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.absences_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin_or_dispatcher_in(COALESCE(NEW.organization_id, OLD.organization_id)) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.approver_id := NULL;
    NEW.approved_at := NULL;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.approver_id IS DISTINCT FROM OLD.approver_id
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Über Abwesenheiten entscheiden Disposition oder Admin.' USING ERRCODE = '42501';
  END IF;
  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'Entschiedene Abwesenheiten können nicht mehr geändert werden.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.absences') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS absences_guard ON public.absences;
    CREATE TRIGGER absences_guard
      BEFORE INSERT OR UPDATE ON public.absences
      FOR EACH ROW EXECUTE FUNCTION public.absences_guard();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. CHAT — no self-joining, no conversations in other organisations
--    chat_members_insert allowed `user_id = auth.uid()` for ANY conversation,
--    so knowing a conversation id was enough to join it and read it.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS chat_conv_insert ON public.chat_conversations;
CREATE POLICY chat_conv_insert ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND organization_id = public.get_my_org_id()
  );

DROP POLICY IF EXISTS chat_members_insert ON public.chat_members;
CREATE POLICY chat_members_insert ON public.chat_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      JOIN public.profiles member ON member.id = chat_members.user_id
      WHERE c.id = chat_members.conversation_id
        AND member.organization_id = c.organization_id
        AND (c.created_by = auth.uid() OR public.is_admin_or_dispatcher_in(c.organization_id))
    )
  );

-- ---------------------------------------------------------------------------
-- 8. FUNCTION PRIVILEGES — SECURITY DEFINER functions were callable by
--    anyone (also without login) via /rest/v1/rpc/… (Supabase advisor 0028).
--    Policy helpers + RPCs: signed-in users only. Trigger functions: nobody
--    calls them directly (triggers fire regardless of EXECUTE).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn RECORD;
  helpers TEXT[] := ARRAY[
    'get_my_org_id', 'is_admin_or_dispatcher_in', 'is_admin_in', 'is_chat_member',
    'calendar_event_org', 'is_calendar_event_member', 'can_write_calendar_event',
    'personnel_file_is_confidential', 'can_notify', 'chat_attachment_conversation',
    'register_push_token', 'cancel_time_entry_correction', 'review_time_entry_correction'
  ];
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig, p.proname, p.prorettype = 'trigger'::regtype AS is_trigger
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn.sig);
    IF fn.is_trigger THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn.sig);
    ELSIF fn.proname = ANY (helpers) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.sig);
    END IF;
  END LOOP;
END $$;
-- chat_attachment_conversation is not SECURITY DEFINER but used in storage policies.
GRANT EXECUTE ON FUNCTION public.chat_attachment_conversation(TEXT) TO authenticated;

ALTER FUNCTION public.update_conversation_timestamp() SET search_path = public, pg_temp;
DO $$
BEGIN
  IF to_regprocedure('public.set_absence_default_status()') IS NOT NULL THEN
    ALTER FUNCTION public.set_absence_default_status() SET search_path = public, pg_temp;
  END IF;
END $$;

COMMIT;

-- Rollback: re-run 20261016120000_client_feedback_oct2026.sql section 7
-- (profiles_guard), 20260424160000_chat_attachments_bucket.sql (storage
-- policies), 20260424120000_security_baseline.sql section 8 (notifications
-- insert policy); DROP TRIGGER per_diems_guard ON public.per_diems;
-- ALTER TABLE public.notifications DROP CONSTRAINT notifications_link_relative;
-- Sections 5–7: re-run scripts/fix_trigger.sql (signup trigger),
-- DROP TRIGGER calendar_events_zz_absence_guard ON public.calendar_events;
-- DROP TRIGGER absences_guard ON public.absences; re-run
-- 20260429220000_chat_rls_creator_select.sql (chat insert policies).
