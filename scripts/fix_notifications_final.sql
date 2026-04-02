-- ──────────────────────────────────────────────────────────
-- LOKSHIFT NOTIFICATION DEFINITIVE FIX
-- Standardizing schema and fixing RLS to allow Admin notifications
-- ──────────────────────────────────────────────────────────

-- 1. Ensure the table exists with modern column names (Sync with lib/notifications/service.ts)
DO $$
BEGIN
    -- Rename 'type' to 'module_type' if it exists and module_type doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'module_type') THEN
        ALTER TABLE notifications RENAME COLUMN "type" TO "module_type";
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'module_type') THEN
        ALTER TABLE notifications ADD COLUMN module_type TEXT DEFAULT 'system';
    END IF;

    -- Rename 'link' to 'module_id' if it exists and module_id doesn't (safe only if link was UUID)
    -- Otherwise just add module_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'module_id') THEN
        ALTER TABLE notifications ADD COLUMN module_id UUID;
    END IF;
END $$;

-- 2. Ensure RLS is Enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. DROP old restrictive policies
DROP POLICY IF EXISTS "notifications_owner_access" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- 4. CREATE definitive modular policies
-- 4.1 SELECT: Users see only their own
CREATE POLICY "notifications_select_policy"
ON notifications FOR SELECT
USING (user_id = auth.uid());

-- 4.2 INSERT: Any authenticated user can insert (enables Admins to notify Employees)
CREATE POLICY "notifications_insert_policy"
ON notifications FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 4.3 UPDATE: Users can mark their own as read
CREATE POLICY "notifications_update_policy"
ON notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4.4 DELETE: Users can delete their own
CREATE POLICY "notifications_delete_policy"
ON notifications FOR DELETE
USING (user_id = auth.uid());

-- 5. Broadcast completion (Optional test)
-- INSERT INTO notifications (user_id, title, message, module_type)
-- SELECT id, 'Notification Engine Recovered', 'Real-time alerts are now fully operational for your account.', 'system'
-- FROM profiles WHERE id = auth.uid();
