-- =============================================================================
-- Creates a LokShift project-manager login with the role "Verwalter" (admin).
-- Run once in the Supabase SQL editor. Before running, replace:
--   v_email     – the login e-mail
--   v_password  – a temporary password (the user must change it on first login)
--   v_org_name  – the organisation the account belongs to (exact name)
-- =============================================================================
DO $$
DECLARE
  v_email     TEXT := 'jhaseeb718@gmail.com';
  v_password  TEXT := 'CHANGE-ME-temporary-password';
  v_full_name TEXT := 'Projektmanager';
  v_org_name  TEXT := 'Default Organization';
  v_org_id    UUID;
  v_user_id   UUID := gen_random_uuid();
BEGIN
  SELECT id INTO v_org_id FROM public.organizations WHERE name = v_org_name;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organisation "%" not found. Names: %', v_org_name,
      (SELECT string_agg(name, ', ') FROM public.organizations);
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(v_email)) THEN
    RAISE EXCEPTION 'A login with % already exists', v_email;
  END IF;

  -- Login (e-mail already confirmed, so no confirmation mail is needed).
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    lower(v_email), extensions.crypt(v_password, extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', v_full_name),
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_user_id::text, 'email',
    jsonb_build_object('sub', v_user_id::text, 'email', lower(v_email), 'email_verified', true),
    now(), now(), now()
  );

  -- The signup trigger created the profile as employee; make it a Verwalter.
  UPDATE public.profiles
     SET role = 'admin',
         organization_id = v_org_id,
         full_name = v_full_name,
         is_active = TRUE,
         onboarding_completed = TRUE,
         must_change_password = TRUE
   WHERE id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile was not created by the signup trigger';
  END IF;

  RAISE NOTICE 'Created Verwalter % (%) in %', v_email, v_user_id, v_org_name;
END $$;

-- Check:
-- SELECT p.email, p.role, p.is_active, p.must_change_password, o.name
--   FROM public.profiles p JOIN public.organizations o ON o.id = p.organization_id
--  WHERE p.email = 'jhaseeb718@gmail.com';
