-- Migration 1: AI qualification fields on leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_score INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_recommended_action TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_matched_technician_id UUID REFERENCES technicians(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_model_version TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualification_reason TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS house_number TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS full_address TEXT;

-- Migration 2: Automation rules engine
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_event TEXT NOT NULL,
  trigger_conditions JSONB DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration 3: Automation execution log
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automation_rules(id) ON DELETE SET NULL,
  rule_name TEXT,
  trigger_event TEXT,
  trigger_entity_id UUID,
  trigger_entity_type TEXT,
  actions_executed JSONB,
  results JSONB,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration 4: Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  customer_name TEXT,
  is_published BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  review_token UUID DEFAULT gen_random_uuid(),
  token_used_at TIMESTAMPTZ,
  source TEXT DEFAULT 'email',
  admin_response TEXT,
  admin_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration 5: Notifications (in-app)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read) WHERE is_read = false;

-- Migration 6: Analytics snapshots
CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  new_leads INTEGER DEFAULT 0,
  qualified_leads INTEGER DEFAULT 0,
  jobs_created INTEGER DEFAULT 0,
  jobs_completed INTEGER DEFAULT 0,
  revenue_estimated NUMERIC(10,2) DEFAULT 0,
  avg_lead_score NUMERIC(5,2),
  technician_utilization JSONB,
  conversion_rate NUMERIC(5,2),
  avg_response_time_minutes NUMERIC(10,2),
  notifications_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
