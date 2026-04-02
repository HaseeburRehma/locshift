-- ──────────────────────────────────────────────────────────
-- CHAT MESSAGES SCHEMA CORRECTION
-- Adding missing columns to support deletion and attachments.
-- ──────────────────────────────────────────────────────────

-- 1. Add 'is_deleted' column
ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 2. Add attachment metadata columns
ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- 3. Ensure RLS for messages includes the new check
-- Assuming policy already exists but let's be explicit
DROP POLICY IF EXISTS "chat_messages_participants" ON public.chat_messages;
CREATE POLICY "chat_messages_participants" ON public.chat_messages
  FOR ALL
  USING (
    public.is_chat_member(conversation_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );

-- 4. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
