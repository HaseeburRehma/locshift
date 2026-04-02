-- ──────────────────────────────────────────────────────────
-- CHAT RLS RECURSION FIX (LokShift Security Patch)
-- Breaking infinite recursion in chat_members select policy
-- ──────────────────────────────────────────────────────────

-- 1. Create a SECURITY DEFINER function to check membership
-- This bypasses RLS for the internal check, preventing recursion.
CREATE OR REPLACE FUNCTION public.is_chat_member(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members 
    WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Update chat_conversations: Participants only
DROP POLICY IF EXISTS "chat_conv_participants" ON public.chat_conversations;
CREATE POLICY "chat_conv_participants" ON public.chat_conversations FOR SELECT
  USING (
    public.is_chat_member(id)
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher') 
      AND organization_id = chat_conversations.organization_id
    )
  );

-- 3. Update chat_members: Members of the same conversation
DROP POLICY IF EXISTS "chat_members_participants" ON public.chat_members;
CREATE POLICY "chat_members_participants" ON public.chat_members FOR SELECT
  USING (
    public.is_chat_member(conversation_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher') 
    )
  );

-- 4. Update chat_messages: Participants only
DROP POLICY IF EXISTS "chat_messages_participants" ON public.chat_messages;
CREATE POLICY "chat_messages_participants" ON public.chat_messages FOR ALL
  USING (
    public.is_chat_member(conversation_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher') 
    )
  );
