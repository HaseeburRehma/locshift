-- STANDALONE FIX FOR LOKSHIFT RECURSION ERROR (500)
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Helper function to break RLS recursion
-- This function runs with "SECURITY DEFINER" to bypass RLS for the org check
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Repair Profiles Policies
DROP POLICY IF EXISTS "profiles_org_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;

-- Fixed SELECT: Uses the helper function to avoid infinite recursion
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT
  USING (organization_id = public.get_my_org_id() OR id = auth.uid());

-- Fixed UPDATE: Allows users to update their own profile details
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Ensure Organizations are readable (needed for the join)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_public_select" ON public.organizations;
CREATE POLICY "org_public_select" ON public.organizations FOR SELECT
  USING (true);

-- 4. Ensure Plans are readable by the right people
DROP POLICY IF EXISTS "plans_employee_access" ON public.plans;
CREATE POLICY "plans_access_policy" ON public.plans FOR SELECT
  USING (
    employee_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'dispatcher') 
      AND organization_id = public.plans.organization_id
    )
  );
