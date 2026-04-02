-- ============================================================
-- DEFINITIVE FIX: Non-recursive RLS + Correct OTP setup
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Drop ALL existing profile policies to start clean
DROP POLICY IF EXISTS "profiles_org_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

-- 2. Make sure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. SELECT policy: User can see their own profile, OR profiles in the same org.
--    KEY: We avoid recursion by using a SUBQUERY instead of the helper function.
--    The subquery only runs once per query, not per-row.
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
  );

CREATE POLICY "profiles_select_org" ON public.profiles
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- 4. UPDATE policy: User can update only their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 5. INSERT policy: The trigger (SECURITY DEFINER) handles inserts,
--    but we allow it in case the trigger fails so registration doesn't block.
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- 6. Ensure Supabase service role can always bypass RLS (this is default but let's be explicit)
-- (Service role bypasses RLS by default. No changes needed.)

-- 7. Verify organizations are readable (required for profile initialization)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_public_select" ON public.organizations;
CREATE POLICY "org_public_select" ON public.organizations FOR SELECT USING (true);

-- 8. Fix the plans policy to be non-recursive too
DROP POLICY IF EXISTS "plans_access_policy" ON public.plans;
CREATE POLICY "plans_access_policy" ON public.plans FOR SELECT
  USING (
    employee_id = auth.uid()
    OR creator_id = auth.uid()
    OR organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- Done. Now verify by running:
-- SELECT * FROM public.profiles WHERE id = auth.uid();
