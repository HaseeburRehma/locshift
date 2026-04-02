-- ──────────────────────────────────────────────────────────
-- DEFINITIVE PLANS RLS FIX
-- Allows 'admin', 'administrator', and 'dispatcher' to manage plans.
-- ──────────────────────────────────────────────────────────

-- 1. Drop old policies
DROP POLICY IF EXISTS "plans_insert_policy" ON public.plans;
DROP POLICY IF EXISTS "plans_update_policy" ON public.plans;
DROP POLICY IF EXISTS "plans_select_policy" ON public.plans;

-- 2. Create modern, case-insensitive policies
-- INSERT: Admins and Dispatchers
CREATE POLICY "plans_insert_policy" ON public.plans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND LOWER(role) IN ('admin', 'administrator', 'dispatcher')
    )
  );

-- SELECT: Admins/Dispatchers see all, Employees see their own
CREATE POLICY "plans_select_policy" ON public.plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (
        LOWER(role) IN ('admin', 'administrator', 'dispatcher')
        OR id = plans.employee_id
      )
    )
  );

-- UPDATE: Admins and Dispatchers manage status/logistics
CREATE POLICY "plans_update_policy" ON public.plans
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND LOWER(role) IN ('admin', 'administrator', 'dispatcher')
    )
  );

-- 3. Ensure Employees can confirm/reject their own plans
CREATE POLICY "plans_employee_status_update" ON public.plans
  FOR UPDATE USING (
    employee_id = auth.uid()
  )
  WITH CHECK (
    employee_id = auth.uid()
  );
