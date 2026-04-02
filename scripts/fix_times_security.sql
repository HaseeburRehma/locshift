-- ──────────────────────────────────────────────────────────
-- DEFINITIVE TIMES RLS FIX
-- Allows 'admin', 'administrator', and 'dispatcher' to manage time entries.
-- ──────────────────────────────────────────────────────────

-- 1. Drop old policies
DROP POLICY IF EXISTS "times_insert_policy" ON public.time_entries;
DROP POLICY IF EXISTS "times_update_policy" ON public.time_entries;
DROP POLICY IF EXISTS "times_select_policy" ON public.time_entries;

-- 2. Create modern, case-insensitive policies
-- INSERT: Admins, Dispatchers, and Employees (for themselves)
CREATE POLICY "times_insert_policy" ON public.time_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (
        LOWER(role) IN ('admin', 'administrator', 'dispatcher')
        OR id = time_entries.employee_id
      )
    )
  );

-- SELECT: Admins/Dispatchers see all, Employees see their own
CREATE POLICY "times_select_policy" ON public.time_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (
        LOWER(role) IN ('admin', 'administrator', 'dispatcher')
        OR id = time_entries.employee_id
      )
    )
  );

-- UPDATE: Admins and Dispatchers manage status/logistics
CREATE POLICY "times_update_policy" ON public.time_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND LOWER(role) IN ('admin', 'administrator', 'dispatcher')
    )
  );
