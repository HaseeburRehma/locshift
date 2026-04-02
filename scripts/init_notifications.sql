-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  module_type TEXT NOT NULL, -- 'plans', 'customers', 'calendar', 'shifts'
  module_id UUID,           -- ID of the related plan/customer/etc
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add high-performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;

-- 3. Add RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- System can insert notifications (this will be used by our app triggers/hooks)
CREATE POLICY "System can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Notify everyone for testing (Optional: broadcast to all admins about system change)
-- INSERT INTO notifications (user_id, title, message, module_type)
-- SELECT id, 'Notification System Active', 'The LokShift real-time alerting engine is now online.', 'system'
-- FROM profiles WHERE role = 'admin' OR role = 'administrator';
