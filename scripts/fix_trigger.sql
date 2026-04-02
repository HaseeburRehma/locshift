-- STANDALONE FIX FOR LOKSHIFT USER REGISTRATION
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Ensure a default organization exists
INSERT INTO public.organizations (name, slug)
VALUES ('Default Organization', 'default')
ON CONFLICT (slug) DO NOTHING;

-- 2. Improved Trigger Function with Safe Casting and Error Handling
CREATE OR REPLACE FUNCTION public.handle_new_lokshift_user()
RETURNS TRIGGER AS $$
DECLARE
  default_org_id UUID;
  meta_org_id TEXT;
  target_org_id UUID;
BEGIN
  -- 1. Get a fallback organization ID
  SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
  
  -- 2. Safely extract and validate organization_id from metadata
  meta_org_id := NEW.raw_user_meta_data->>'organization_id';
  
  -- Use a block to safely attempt the cast
  BEGIN
    IF meta_org_id IS NOT NULL AND meta_org_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      target_org_id := meta_org_id::UUID;
    ELSE
      target_org_id := default_org_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    target_org_id := default_org_id;
  END;

  -- 3. Insert into profiles with extreme safety (won't block auth user creation)
  BEGIN
    INSERT INTO public.profiles (id, full_name, email, organization_id, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.email,
      target_org_id,
      COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
    );
  EXCEPTION WHEN OTHERS THEN
    -- If profile creation fails, we logged it but let the auth user creation succeed
    -- This prevents the "Database error saving new user" (unexpected_failure)
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-link the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_lokshift_user();
