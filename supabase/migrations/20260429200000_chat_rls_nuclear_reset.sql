-- =============================================================================
--  20260429200000_chat_rls_nuclear_reset.sql
--  LokShift — definitive fix for the persistent chat_conversations INSERT
--  failure when a non-admin user tries to start a chat.
--
--  Why this exists:
--    Three previous migrations (20260424120000, 20260429120000,
--    20260429180000) tried progressively looser INSERT policies on
--    chat_conversations and the user is *still* hitting:
--      "new row violates row-level security policy for
--       table chat_conversations"
--    when an employee account tries to start a new chat.
--
--    That means *some* policy survived all the prior DROP IF EXISTS calls
--    (probably under a name we didn't anticipate) and is still being
--    evaluated. This migration drops EVERY policy on the table by
--    iterating through pg_policy, regardless of name, and recreates
--    a clean minimal set from scratch.
--
--  After running this:
--    chat_conversations has exactly four policies:
--      INSERT  → any authenticated user can create a row IF they list
--                themselves as creator
--      SELECT  → user is a member (via SECURITY DEFINER helper) OR
--                org admin/dispatcher
--      UPDATE  → creator OR admin
--      DELETE  → creator OR admin
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Nuke every policy on chat_conversations, regardless of its name.
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

-- Make sure RLS is enabled (it should be, but assert it).
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Re-create the SECURITY DEFINER membership helper. Already exists from
--    20260429140000 but we re-create with OR REPLACE so this migration is
--    self-contained and re-runnable in any order.
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
-- 3. Build the clean minimal policy set.
-- ---------------------------------------------------------------------------

-- INSERT — minimal: any authenticated user can create a conversation as
-- long as they list THEMSELVES as `created_by`. No org check (so an
-- employee whose profile.organization_id is NULL still works), no helper
-- function, just `auth.uid()`.
CREATE POLICY chat_conv_insert ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
  );

-- SELECT — visible to participants (via SECURITY DEFINER helper to dodge
-- recursion) and to same-org admins/dispatchers.
CREATE POLICY chat_conv_select ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (
    public.is_chat_member(id)
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
-- 4. Same nuke-and-rebuild for chat_members (so the previous member
--    policies don't trip the `chat_members_insert` chicken-and-egg either).
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

-- SELECT — members can see other members of their conversations
CREATE POLICY chat_members_select ON public.chat_members
  FOR SELECT TO authenticated
  USING ( public.is_chat_member(conversation_id) );

-- INSERT — user can add themselves OR creator can seed members of their
-- own brand-new conversation.
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

-- UPDATE — only your own member row.
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
-- POST-MIGRATION DIAGNOSTIC — paste each block as the EMPLOYEE user that's
-- failing. They should ALL succeed after this migration.
-- =============================================================================
--
-- 1) Confirm exactly what policies are now on chat_conversations:
--
--      SELECT polname,
--             CASE polcmd
--               WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
--               WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE polcmd::text
--             END AS cmd,
--             pg_get_expr(polwithcheck, polrelid) AS check_clause
--      FROM pg_policy WHERE polrelid = 'public.chat_conversations'::regclass
--      ORDER BY polcmd, polname;
--
--    Expected: exactly 4 rows — chat_conv_select / insert / update / delete.
--    The INSERT row's check_clause must be `(created_by = auth.uid())`,
--    nothing more.
--
-- 2) Confirm the employee's session has a valid auth.uid():
--
--      SELECT auth.uid();
--
-- 3) Confirm the employee's profile row exists:
--
--      SELECT id, organization_id, role FROM public.profiles
--      WHERE id = auth.uid();
--
--    org may be NULL — that's fine, the new INSERT policy doesn't check it.
--
-- 4) Try the actual insert manually:
--
--      INSERT INTO public.chat_conversations (organization_id, is_group, created_by)
--      VALUES (
--        (SELECT organization_id FROM public.profiles WHERE id = auth.uid()),
--        false,
--        auth.uid()
--      ) RETURNING id;
--
--    Expected: a UUID. If THIS still fails with the same error, send the
--    output of (1) so we can see what other policies are sneaking in.
-- =============================================================================
