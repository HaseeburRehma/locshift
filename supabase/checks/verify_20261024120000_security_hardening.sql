-- =============================================================================
-- Read-only check that 20261024120000_security_hardening.sql is in place.
-- Run in the Supabase SQL editor. Changes nothing; every row should say PASS.
-- =============================================================================
WITH checks(check_name, ok) AS (
  VALUES
  ('1 chat attachments: old public SELECT policy removed',
   NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
               AND policyname = 'chat_attachments_select_authenticated')),
  ('1 chat attachments: member-only SELECT policy present',
   EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
           AND policyname = 'chat_attachments_select_member')),
  ('1 chat attachments: member-only INSERT policy present',
   EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
           AND policyname = 'chat_attachments_insert_member')),
  ('2 per_diems guard trigger',
   EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'per_diems_guard' AND NOT tgisinternal)),
  ('3 notifications insert uses can_notify()',
   EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications'
           AND policyname = 'notifications_insert_same_org' AND with_check ILIKE '%can_notify%')),
  ('3 notifications link must be app-relative',
   EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_link_relative')),
  ('4 profiles_guard protects HR fields',
   EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'profiles_guard' AND prosrc ILIKE '%target_hours%')),
  ('5 signup trigger ignores role/org from metadata',
   EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_lokshift_user'
           AND prosrc NOT ILIKE '%raw_user_meta_data->>''role''%'
           AND prosrc NOT ILIKE '%raw_user_meta_data->>''organization_id''%')),
  ('5 signup trigger attached to auth.users',
   EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND NOT tgisinternal)),
  ('6 calendar absence guard trigger',
   EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'calendar_events_zz_absence_guard' AND NOT tgisinternal)),
  ('6 absences guard trigger (if table exists)',
   to_regclass('public.absences') IS NULL
   OR EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'absences_guard' AND NOT tgisinternal)),
  ('7 chat: no self-join (insert policy checks creator/manager)',
   EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_members' AND policyname = 'chat_members_insert'
           AND with_check NOT ILIKE '%user_id = auth.uid()) OR%' AND with_check ILIKE '%created_by%')),
  ('7 chat: conversations only in own organisation',
   EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_conversations' AND policyname = 'chat_conv_insert'
           AND with_check ILIKE '%get_my_org_id%')),
  ('8 no SECURITY DEFINER function callable without login',
   NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
               WHERE n.nspname = 'public' AND p.prosecdef AND has_function_privilege('anon', p.oid, 'EXECUTE'))),
  ('8 trigger functions not callable via RPC',
   NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
               WHERE n.nspname = 'public' AND p.prosecdef AND p.prorettype = 'trigger'::regtype
                 AND has_function_privilege('authenticated', p.oid, 'EXECUTE'))),
  ('8 policy helpers still callable by signed-in users',
   has_function_privilege('authenticated', 'public.get_my_org_id()', 'EXECUTE')
   AND has_function_privilege('authenticated', 'public.is_admin_or_dispatcher_in(uuid)', 'EXECUTE')
   AND has_function_privilege('authenticated', 'public.is_chat_member(uuid)', 'EXECUTE')
   AND has_function_privilege('authenticated', 'public.register_push_token(text, text)', 'EXECUTE')
   AND has_function_privilege('authenticated', 'public.review_time_entry_correction(uuid, boolean, text)', 'EXECUTE')),
  ('prerequisite: calendar_events.request_status exists (mobile absence migration)',
   EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
           AND table_name = 'calendar_events' AND column_name = 'request_status'))
)
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, check_name
FROM checks
ORDER BY ok, check_name;
