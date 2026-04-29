-- =============================================================================
--  20260429140000_chat_rls_no_recursion.sql
--  LokShift — fix infinite recursion in chat policies introduced by the
--  previous migration (20260429120000_chat_rls_fix.sql).
--
--  PROBLEM
--    "infinite recursion detected in policy for relation chat_members"
--
--    The previous fix replaced the helper-function policies with inline
--    subqueries to make them self-contained. That worked for SELECT on
--    chat_conversations, but for chat_members SELECT we wrote:
--      USING ( EXISTS (SELECT 1 FROM chat_members me WHERE ...) )
--    Selecting chat_members from inside a chat_members policy → recursion.
--
--  FIX
--    Reuse / re-create the SECURITY DEFINER helper public.is_chat_member()
--    so the RLS policy delegates the membership check to a function that
--    runs with elevated rights and does NOT re-trigger RLS. Same trick
--    we used for the calendar tables (see 20260424140000).
-- =============================================================================

BEGIN;

-- ── 1. SECURITY DEFINER helper — bypasses RLS internally ───────────────────
CREATE OR REPLACE FUNCTION public.is_chat_member(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE conversation_id = p_conversation_id
      AND user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_chat_member(UUID) IS
  'Returns TRUE when auth.uid() is a member of the given conversation. '
  'Runs as SECURITY DEFINER so it can read chat_members without re-entering '
  'the chat_members RLS policy (which would cause infinite recursion).';

-- ── 2. chat_members SELECT — switch from inline subquery to helper ─────────
DROP POLICY IF EXISTS chat_members_select ON public.chat_members;

CREATE POLICY chat_members_select ON public.chat_members
  FOR SELECT TO authenticated
  USING (
    -- Use the SECURITY DEFINER helper to break the self-reference cycle.
    public.is_chat_member(conversation_id)
    -- OR same-org admin/dispatcher (visible across the org)
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = chat_members.conversation_id
        AND c.organization_id = p.organization_id
        AND LOWER(p.role) IN ('admin','administrator','dispatcher')
    )
  );

-- ── 3. chat_conversations SELECT — same treatment ──────────────────────────
-- Original used `EXISTS (SELECT 1 FROM chat_members m ...)` which, with our
-- new chat_members SELECT policy, would still go through chat_members RLS.
-- Switch to the helper for consistency and zero ambiguity.
DROP POLICY IF EXISTS chat_conv_select ON public.chat_conversations;

CREATE POLICY chat_conv_select ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (
    public.is_chat_member(id)
    OR organization_id IN (
      SELECT p.organization_id FROM public.profiles p
      WHERE p.id = auth.uid()
        AND LOWER(p.role) IN ('admin','administrator','dispatcher')
    )
  );

-- ── 4. chat_messages — also benefits from the helper to avoid future
--    recursion (it currently does its own subquery against chat_members).
-- ── (Deliberately untouched here; the existing baseline policy uses the
--     same helper. If the user has issues with messages later we'll patch.)

COMMIT;

-- =============================================================================
-- Rollback (best-effort)
-- =============================================================================
-- BEGIN;
--   DROP POLICY IF EXISTS chat_members_select ON public.chat_members;
--   DROP POLICY IF EXISTS chat_conv_select ON public.chat_conversations;
--   -- (the previous migration recreates the inline-subquery versions;
--   --  re-run 20260429120000 to restore them)
-- COMMIT;
