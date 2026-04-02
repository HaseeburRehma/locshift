-- ──────────────────────────────────────────────────────────
-- LOKSHIFT SECURITY PATCH (Area 12/Global)
-- Enabling RLS and Organization Isolation across all tables
-- ──────────────────────────────────────────────────────────

-- 1. Helper Function (Ensure it exists and is SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Enable RLS on all remaining tables
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS per_diems ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS holiday_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS calendar_event_members ENABLE ROW LEVEL SECURITY;

-- 3. Customers: Org-wide access for Org members
DROP POLICY IF EXISTS "customers_org_access" ON customers;
CREATE POLICY "customers_org_access" ON customers FOR ALL
  USING (organization_id = public.get_my_org_id());

-- 4. Per Diems: Employees see own, Admins see all in Org
DROP POLICY IF EXISTS "per_diems_access" ON per_diems;
CREATE POLICY "per_diems_access" ON per_diems FOR SELECT
  USING (
    employee_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher') 
      AND organization_id = per_diems.organization_id
    )
  );

DROP POLICY IF EXISTS "per_diems_insert" ON per_diems;
CREATE POLICY "per_diems_insert" ON per_diems FOR INSERT
  WITH CHECK (employee_id = auth.uid());

-- 5. Holiday Bonuses: Employees see own, Admins see all in Org
DROP POLICY IF EXISTS "holiday_bonuses_access" ON holiday_bonuses;
CREATE POLICY "holiday_bonuses_access" ON holiday_bonuses FOR SELECT
  USING (
    employee_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher') 
      AND organization_id = holiday_bonuses.organization_id
    )
  );

-- 6. Notifications: Own notifications only
DROP POLICY IF EXISTS "notifications_owner_access" ON notifications;
CREATE POLICY "notifications_owner_access" ON notifications FOR ALL
  USING (user_id = auth.uid());

-- 7. Chat Conversations: Participants only
DROP POLICY IF EXISTS "chat_conv_participants" ON chat_conversations;
CREATE POLICY "chat_conv_participants" ON chat_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE conversation_id = chat_conversations.id AND user_id = auth.uid()
    )
  );

-- 8. Chat Members: Participants in context
DROP POLICY IF EXISTS "chat_members_participants" ON chat_members;
CREATE POLICY "chat_members_participants" ON chat_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_members cm 
      WHERE cm.conversation_id = chat_members.conversation_id AND cm.user_id = auth.uid()
    )
  );

-- 9. Chat Messages: Participants only
DROP POLICY IF EXISTS "chat_messages_participants" ON chat_messages;
CREATE POLICY "chat_messages_participants" ON chat_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid()
    )
  );

-- 10. Calendar Events: Org-wide access for Org members
DROP POLICY IF EXISTS "calendar_events_org_access" ON calendar_events;
CREATE POLICY "calendar_events_org_access" ON calendar_events FOR ALL
  USING (organization_id = public.get_my_org_id());

-- 11. Calendar Event Members: Linked context
DROP POLICY IF EXISTS "calendar_members_context" ON calendar_event_members;
CREATE POLICY "calendar_members_context" ON calendar_event_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events 
      WHERE id = calendar_event_members.event_id AND organization_id = public.get_my_org_id()
    )
  );
