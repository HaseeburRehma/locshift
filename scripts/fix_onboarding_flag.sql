-- ═══════════════════════════════════════════════════════════════
-- FIX: onboarding_completed stuck for existing users
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Make sure the column exists (safe to re-run)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- 2. Mark ALL admins and dispatchers as onboarding-complete
--    (they never need the employee walkthrough)
UPDATE public.profiles
SET onboarding_completed = true
WHERE role IN ('admin', 'administrator', 'dispatcher', 'disponent')
  AND (onboarding_completed IS NULL OR onboarding_completed = false);

-- 3. Mark ALL employees created more than 1 day ago as complete
--    (they are existing users, not new sign-ups)
UPDATE public.profiles
SET onboarding_completed = true
WHERE role = 'employee'
  AND (onboarding_completed IS NULL OR onboarding_completed = false)
  AND created_at < NOW() - INTERVAL '1 day';

-- 4. (OPTIONAL) Mark ALL users as complete regardless of age
--    Uncomment this if you want to completely skip onboarding for everyone:
-- UPDATE public.profiles SET onboarding_completed = true
-- WHERE onboarding_completed IS NULL OR onboarding_completed = false;

-- Verify results
SELECT role, onboarding_completed, COUNT(*) 
FROM public.profiles 
GROUP BY role, onboarding_completed 
ORDER BY role, onboarding_completed;
