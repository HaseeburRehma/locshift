-- =============================================================================
--  20260429220000_chat_rls_creator_select.sql
--  LokShift — definitive fix for the persistent employee RLS error on
--  chat_conversations INSERT.
--
--  ROOT CAUSE (diagnosed from pg_policy output on prod):
--    The INSERT policy itself was correct: (created_by = auth.uid()).
--    The failure was the SELECT policy that Supabase evaluates against
--    the just-inserted row when the client uses `.insert(...).select()`
--    (which is the default for the JS SDK).
--
--    For a brand-new conversation the SELECT policy returned FALSE for an
--    employee:
--      • is_chat_member(id) → false (chat_members row not yet inserted)
--      • org+admin branch  → false (employee isn't admin/dispatcher)
--    → SELECT denied on RETURNING → whole INSERT reported as RLS failure
--      on chat_conversations.
--
--    Diagnostic also showed leftover policy `chat_conv_participants` from
--    an earlier migration, and the INSERT policy was still named
--    `chat_conv_insert_minimal` (from 20260429180000), proving the
--    nuclear-reset migration 20260429200000 was never applied.
--
--  WHAT THIS MIGRATION DOES:
--    1. Nukes EVERY policy on chat_conversations and chat_members by
--       iterating pg_policy (re-runnable, name-agnostic).
--    2. Re-creates the SECURITY DEFINER membership helper.
--    3. Rebuilds a clean policy set where:
--         - INSERT  → created_by = auth.uid()
--         - SELECT  → creator OR member OR org admin/dispatcher
--                     (the new "creator OR" clause is what fixes the
--                      INSERT-with-RETURNING case)
--         - UPDATE  → creator OR org admin
--         - DELETE  → creator OR org admin
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Nuke every policy on chat_conversations.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  pol_name text;
BEGIN
  FOR pol_name IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.chat_conversations'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_conversations', pol_name);
  END LOOP;
END $$;

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. (Re)create the SECURITY DEFINER membership helper. Self-contained.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 3. Clean policy set on chat_conversations.
-- ---------------------------------------------------------------------------

-- INSERT — creator must list themselves.
CREATE POLICY chat_conv_insert ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
  );

-- SELECT — creator (fixes RETURNING after INSERT) OR member OR org admin.
CREATE POLICY chat_conv_select ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_chat_member(id)
    OR (
      organization_id IS NOT NULL
      AND organization_id IN (
        SELECT p.organization_id FROM public.profiles p
        WHERE p.id = auth.uid()
          AND LOWER(p.role) IN ('admin','administrator','dispatcher')
      )
    )
  );

-- UPDATE — creator or admin.
CREATE POLICY chat_conv_update ON public.chat_conversations
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = chat_conversations.organization_id
        AND LOWER(p.role) IN ('admin','administrator','dispatcher')
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = chat_conversations.organization_id
        AND LOWER(p.role) IN ('admin','administrator','dispatcher')
    )
  );

-- DELETE — creator or admin.
CREATE POLICY chat_conv_delete ON public.chat_conversations
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = chat_conversations.organization_id
        AND LOWER(p.role) IN ('admin','administrator','dispatcher')
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Same nuke + rebuild for chat_members.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  pol_name text;
BEGIN
  FOR pol_name IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.chat_members'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_members', pol_name);
  END LOOP;
END $$;

ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

-- SELECT — visible to fellow members of the conversation.
CREATE POLICY chat_members_select ON public.chat_members
  FOR SELECT TO authenticated
  USING ( public.is_chat_member(conversation_id) );

-- INSERT — user can add themselves OR the creator can seed members of
-- their own brand-new conversation.
CREATE POLICY chat_members_insert ON public.chat_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_members.conversation_id
        AND c.created_by = auth.uid()
    )
  );

-- UPDATE — only your own member row (last_read_at, etc.).
CREATE POLICY chat_members_update ON public.chat_members
  FOR UPDATE TO authenticated
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE — yourself or the conversation creator.
CREATE POLICY chat_members_delete ON public.chat_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_members.conversation_id
        AND c.created_by = auth.uid()
    )
  );

COMMIT;

-- =============================================================================
-- POST-MIGRATION VERIFICATION (run as the failing employee)
-- =============================================================================
--
-- 1) Confirm chat_conversations now has exactly 4 policies, INSERT check
--    is `(created_by = auth.uid())`, SELECT using clause begins with
--    `(created_by = auth.uid()) OR …`:
--
--      SELECT polname,
--             CASE polcmd
--               WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
--               WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
--             END AS cmd,
--             pg_get_expr(polqual,      polrelid) AS using_clause,
--             pg_get_expr(polwithcheck, polrelid) AS check_clause
--      FROM pg_policy
--      WHERE polrelid = 'public.chat_conversations'::regclass
--      ORDER BY polcmd, polname;
--
-- 2) The actual end-to-end test the app does:
--
--      WITH new_conv AS (
--        INSERT INTO public.chat_conversations
--          (organization_id, is_group, created_by)
--        VALUES (
--          (SELECT organization_id FROM public.profiles WHERE id = auth.uid()),
--          false,
--          auth.uid()
--        )
--        RETURNING id
--      )
--      SELECT id FROM new_conv;
--
--    Expected: a UUID. If THIS works, the app's start-chat flow will work.
-- =============================================================================
