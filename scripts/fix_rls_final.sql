-- ================================================================
-- ABSOLUTE FINAL FIX — Zero Recursion, Zero Ambiguity
-- PASTE THIS ENTIRE SCRIPT into Supabase SQL Editor and RUN IT.
-- ================================================================

-- STEP 1: Nuke every single policy on profiles to start fresh
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- STEP 2: Make sure RLS is ON
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- STEP 3: The ONLY safe SELECT policy — no subqueries, no functions, no recursion.
-- Users can ONLY see their own profile row.
CREATE POLICY "own_profile_select" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- STEP 4: Users can update ONLY their own profile row.
CREATE POLICY "own_profile_update" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- STEP 5: Allow insert so the trigger can create profiles.
-- (The trigger runs as SECURITY DEFINER but this is a safety net.)
CREATE POLICY "own_profile_insert" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- STEP 6: Fix organizations table (must be readable during signup)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_public_select" ON public.organizations;
CREATE POLICY "org_public_select" ON public.organizations
  FOR SELECT USING (true);

-- STEP 7: Verify it worked — this should return YOUR profile row, not a 500 error:
-- SELECT id, email, full_name FROM public.profiles WHERE id = auth.uid();
-- ================================================================
