-- migration_006_analytics_daily.sql
CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  new_leads INTEGER DEFAULT 0,
  qualified_leads INTEGER DEFAULT 0,
  jobs_created INTEGER DEFAULT 0,
  jobs_completed INTEGER DEFAULT 0,
  revenue_estimated NUMERIC(10,2) DEFAULT 0,
  avg_lead_score NUMERIC(5,2),
  technician_utilization JSONB DEFAULT '{}',
  conversion_rate NUMERIC(5,2),
  avg_response_time_minutes NUMERIC(10,2),
  notifications_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_date ON analytics_daily(date);
