-- Add notifications_enabled column to profiles for persistent user settings
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;
