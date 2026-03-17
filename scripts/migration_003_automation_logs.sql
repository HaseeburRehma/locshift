-- migration_003_automation_logs.sql
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automation_rules(id) ON DELETE SET NULL,
  rule_name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  trigger_entity_id UUID NOT NULL,
  trigger_entity_type TEXT NOT NULL CHECK (trigger_entity_type IN ('lead','job')),
  actions_executed JSONB DEFAULT '[]',
  results JSONB DEFAULT '{}',
  status TEXT DEFAULT 'success' CHECK (status IN ('success','partial','failed')),
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_entity
  ON automation_logs(trigger_entity_id, trigger_entity_type);
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule
  ON automation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_executed
  ON automation_logs(executed_at DESC);
