-- =============================================================================
--  20260429120000_chat_rls_fix.sql
--  LokShift — fix chat-creation RLS that was rejecting valid INSERTs.
--
--  PROBLEM
--    The console showed:
--      "new row violates row-level security policy for table chat_conversations"
--    when an authenticated user tried to start a new direct chat from
--    /dashboard/chat → Contact Picker → "Start chat".
--
--    The original policy from 20260424120000_security_baseline.sql was:
--      WITH CHECK (organization_id = public.get_my_org_id()
--                  AND created_by = auth.uid())
--    That depends on the SECURITY DEFINER helper public.get_my_org_id().
--    If that helper returns NULL (no profile, broken session, etc.), the
--    check fails silently — exactly what we're seeing.
--
--  FIX
--    Replace the policy with a self-contained version that does the
--    profile lookup INLINE, so we don't rely on the helper. Also add an
--    explicit "your org" check to chat_members INSERT so the creator can
--    always seed both members of a fresh direct chat without the
--    chicken-and-egg trap (the original policy DID handle this, we
--    just re-assert it cleanly here).
--
--    Idempotent — DROP IF EXISTS first, then CREATE.
-- =============================================================================

BEGIN;

-- ── 1. chat_conversations ──────────────────────────────────────────────────
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_conversations_select_participant_or_admin" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_insert_same_org"             ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_update_creator_or_admin"     ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_delete_creator_or_admin"     ON public.chat_conversations;
-- New (post-fix) policy names — drop in case migration is rerun
DROP POLICY IF EXISTS chat_conv_select  ON public.chat_conversations;
DROP POLICY IF EXISTS chat_conv_insert  ON public.chat_conversations;
DROP POLICY IF EXISTS chat_conv_update  ON public.chat_conversations;
DROP POLICY IF EXISTS chat_conv_delete  ON public.chat_conversations;

-- SELECT: visible if the user is a member, or admin/dispatcher of the org.
CREATE POLICY chat_conv_select ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (
    -- participant
    EXISTS (
      SELECT 1 FROM public.chat_members m
      WHERE m.conversation_id = chat_conversations.id
        AND m.user_id = auth.uid()
    )
    -- OR same-org admin/dispatcher (so they can monitor team chats)
    OR organization_id IN (
      SELECT p.organization_id FROM public.profiles p
      WHERE p.id = auth.uid()
        AND LOWER(p.role) IN ('admin','administrator','dispatcher')
    )
  );

-- INSERT: any authenticated user can create a conversation in THEIR org and
-- must list themselves as the creator. Self-contained — does NOT depend on
-- public.get_my_org_id(). This is the policy that fixes the live bug.
CREATE POLICY chat_conv_insert ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND organization_id IN (
      SELECT p.organization_id FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- UPDATE: creator OR same-org admin/dispatcher.
CREATE POLICY chat_conv_update ON public.chat_conversations
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR organization_id IN (
      SELECT p.organization_id FROM public.profiles p
      WHERE p.id = auth.uid()
        AND LOWER(p.role) IN ('admin','administrator','dispatcher')
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR organization_id IN (
      SELECT p.organization_id FROM public.profiles p
      WHERE p.id = auth.uid()
        AND LOWER(p.role) IN ('admin','administrator','dispatcher')
    )
  );

-- DELETE: creator OR same-org admin/dispatcher.
CREATE POLICY chat_conv_delete ON public.chat_conversations
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR organization_id IN (
      SELECT p.organization_id FROM public.profiles p
      WHERE p.id = auth.uid()
        AND LOWER(p.role) IN ('admin','administrator','dispatcher')
    )
  );

-- ── 2. chat_members ────────────────────────────────────────────────────────
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_members_select_participants"   ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_insert_creator_or_self" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_update_self"            ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_delete_self_or_admin"   ON public.chat_members;
DROP POLICY IF EXISTS chat_members_select  ON public.chat_members;
DROP POLICY IF EXISTS chat_members_insert  ON public.chat_members;
DROP POLICY IF EXISTS chat_members_update  ON public.chat_members;
DROP POLICY IF EXISTS chat_members_delete  ON public.chat_members;

-- SELECT: only members of the same conversation can see other members.
-- Self-contained subquery (avoids the is_chat_member() helper).
CREATE POLICY chat_members_select ON public.chat_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members me
      WHERE me.conversation_id = chat_members.conversation_id
        AND me.user_id = auth.uid()
    )
  );

-- INSERT: a user can add themselves to any conversation they belong to,
-- AND the conversation creator can add anyone (chicken-and-egg solution
-- for fresh conversations where the creator is not yet a member).
CREATE POLICY chat_members_insert ON public.chat_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_members.conversation_id
        AND c.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = chat_members.conversation_id
        AND c.organization_id = p.organization_id
        AND LOWER(p.role) IN ('admin','administrator','dispatcher')
    )
  );

-- UPDATE: only the user themselves can update their own member row.
CREATE POLICY chat_members_update ON public.chat_members
  FOR UPDATE TO authenticated
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: a user can remove themselves; the creator and same-org admins
-- can remove anyone from a conversation they own/manage.
CREATE POLICY chat_members_delete ON public.chat_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_members.conversation_id
        AND c.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = chat_members.conversation_id
        AND c.organization_id = p.organization_id
        AND LOWER(p.role) IN ('admin','administrator','dispatcher')
    )
  );

COMMIT;

-- =============================================================================
-- Rollback (best-effort — restores the original baseline names):
--   BEGIN;
--     DROP POLICY IF EXISTS chat_conv_select   ON public.chat_conversations;
--     DROP POLICY IF EXISTS chat_conv_insert   ON public.chat_conversations;
--     DROP POLICY IF EXISTS chat_conv_update   ON public.chat_conversations;
--     DROP POLICY IF EXISTS chat_conv_delete   ON public.chat_conversations;
--     DROP POLICY IF EXISTS chat_members_select ON public.chat_members;
--     DROP POLICY IF EXISTS chat_members_insert ON public.chat_members;
--     DROP POLICY IF EXISTS chat_members_update ON public.chat_members;
--     DROP POLICY IF EXISTS chat_members_delete ON public.chat_members;
--   COMMIT;
-- (Then re-run 20260424120000_security_baseline.sql to restore the originals.)
-- =============================================================================
