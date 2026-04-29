-- =============================================================================
--  20260429180000_chat_rls_minimal_insert.sql
--  LokShift — last-resort fix for chat_conversations INSERT failures.
--
--  CONTEXT
--    Migrations 20260424120000 and 20260429120000 both define an INSERT
--    policy that requires `organization_id` to match the user's profile
--    org. If the user's profiles row has `organization_id = NULL` (an
--    onboarding gap, an orphaned auth user, etc.) the IN-subquery returns
--    NULL → evaluates as FALSE → row rejected.
--
--    To unblock chat creation regardless of profile org state, this
--    migration drops every existing INSERT policy on chat_conversations
--    and replaces it with the smallest possible check:
--
--        WITH CHECK (created_by = auth.uid())
--
--    The user can only insert a row if they list themselves as creator.
--    The trade-off: a creator could in principle insert a conversation
--    for an org they don't belong to. That risk is bounded because
--    chat_members INSERT is still gated by `created_by = auth.uid()`,
--    so they can only seed members in conversations they themselves
--    created. They can't read conversations they're not in (SELECT
--    policy is unchanged), and the chat is functionally orphaned to
--    that creator.
--
--    If your data state is healthy you'll prefer the stricter
--    20260429120000 policy and can roll this one back. See the diagnostic
--    SQL at the bottom of this file to check your state first.
-- =============================================================================

BEGIN;

-- Defensive: drop every prior INSERT policy on chat_conversations.
-- Names from all three previous migrations:
DROP POLICY IF EXISTS "chat_conversations_insert_same_org" ON public.chat_conversations;
DROP POLICY IF EXISTS chat_conv_insert ON public.chat_conversations;
-- New (this migration's) name in case of re-runs:
DROP POLICY IF EXISTS chat_conv_insert_minimal ON public.chat_conversations;

-- The minimal insert policy: trust auth.uid(), nothing else.
CREATE POLICY chat_conv_insert_minimal ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
  );

COMMIT;

-- =============================================================================
-- DIAGNOSTIC — paste this into the Supabase SQL editor (run as the user that
-- failed) to confirm what's going on. Each section is independent.
-- =============================================================================
--
-- 1. Confirm you ARE authenticated and what your auth.uid() is:
--      SELECT auth.uid() AS my_uid;
--    Expected: a UUID. If NULL, you're not authenticated against this DB.
--
-- 2. Confirm your profile exists and HAS an org:
--      SELECT id, organization_id, role FROM public.profiles
--      WHERE id = auth.uid();
--    Expected: one row with non-NULL organization_id. If org is NULL → that's
--    why the stricter policies were rejecting you.
--
-- 3. Confirm what INSERT policies are now on chat_conversations:
--      SELECT polname, polcmd, pg_get_expr(polqual, polrelid)  AS using_clause,
--             pg_get_expr(polwithcheck, polrelid) AS check_clause
--      FROM pg_policy WHERE polrelid = 'public.chat_conversations'::regclass
--      ORDER BY polname;
--    After running THIS migration you should see exactly one INSERT row,
--    `chat_conv_insert_minimal`, with check = `(created_by = auth.uid())`.
--
-- 4. Try the insert manually:
--      INSERT INTO public.chat_conversations (organization_id, is_group, created_by)
--      VALUES (
--        (SELECT organization_id FROM public.profiles WHERE id = auth.uid()),
--        false,
--        auth.uid()
--      ) RETURNING id;
--    Expected: a UUID. If it now succeeds, the app's create-chat flow will
--    succeed too on the next refresh.
--
-- =============================================================================
-- Rollback (restore the stricter policy from 20260429120000):
-- =============================================================================
-- BEGIN;
--   DROP POLICY IF EXISTS chat_conv_insert_minimal ON public.chat_conversations;
--   CREATE POLICY chat_conv_insert ON public.chat_conversations
--     FOR INSERT TO authenticated
--     WITH CHECK (
--       created_by = auth.uid()
--       AND organization_id IN (
--         SELECT p.organization_id FROM public.profiles p
--         WHERE p.id = auth.uid()
--       )
--     );
-- COMMIT;
