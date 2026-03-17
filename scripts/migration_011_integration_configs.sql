-- Migration 011: integration_configs
CREATE TABLE IF NOT EXISTS integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type TEXT NOT NULL UNIQUE,
    -- 'twilio' | 'sendgrid' | 'anthropic' | 'stripe' | 'google_calendar'
  is_active BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
    -- Note:sensitive keys stored in env vars, not DB. 
    -- This table stores non-sensitive confirmation data, phone numbers, etc.
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed defaults
INSERT INTO integration_configs (integration_type) VALUES 
('twilio'), ('sendgrid'), ('anthropic'), ('stripe'), ('google_calendar')
ON CONFLICT (integration_type) DO NOTHING;

-- Policies
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin to view integration configs"
  ON integration_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Allow admin to manage integration configs"
  ON integration_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
