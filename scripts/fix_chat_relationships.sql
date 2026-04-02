-- ──────────────────────────────────────────────────────────
-- CHAT RELATIONSHIPS FIX (LokShift Security Patch)
-- Adding explicit foreign key constraints to the profiles table
-- to allow PostgREST to auto-join profiles.
-- ──────────────────────────────────────────────────────────

-- 1. Ensure chat_members(user_id) references public.profiles(id)
ALTER TABLE public.chat_members
  DROP CONSTRAINT IF EXISTS chat_members_user_id_fkey,
  ADD CONSTRAINT chat_members_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- 2. Ensure chat_messages(sender_id) references public.profiles(id)
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey,
  ADD CONSTRAINT chat_messages_sender_id_fkey
    FOREIGN KEY (sender_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL; -- Or CASCADE depending on preference

-- 3. Notify the schema cache (Reload PostgREST)
-- Supabase handles this automatically on DDL changes, 
-- but you can manually reload in the dashboard if needed.
