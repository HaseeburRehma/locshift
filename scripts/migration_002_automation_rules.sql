-- migration_002_automation_rules.sql
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_event TEXT NOT NULL CHECK (trigger_event IN (
    'lead_created','lead_status_changed','job_created',
    'job_status_changed','job_completed','lead_score_above',
    'lead_urgency_is','no_response_after','partner_purchased_lead'
  )),
  trigger_conditions JSONB DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_event
  ON automation_rules(trigger_event) WHERE is_active = true;
