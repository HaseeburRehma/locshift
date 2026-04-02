-- ──────────────────────────────────────────────────────────
-- LOKSHIFT SCHEMA UPDATE (Onboarding & Profiles)
-- ──────────────────────────────────────────────────────────

-- Add onboarding_completed flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add index on email for faster lookups during registration
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
