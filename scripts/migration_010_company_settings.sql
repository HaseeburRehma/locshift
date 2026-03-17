-- Migration 010: company_settings
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'FixDone',
  tagline TEXT,
  business_email TEXT,
  support_phone TEXT,
  website_url TEXT,
  address JSONB DEFAULT '{"street": "", "house_number": "", "postcode": "", "city": "", "country": "Germany"}'::JSONB,
  branding JSONB DEFAULT '{"primary_color": "#2563EB", "logo_url": ""}'::JSONB,
  service_types TEXT[] DEFAULT ARRAY['electrician'],
  operating_cities TEXT[] DEFAULT ARRAY[]::TEXT[],
  operating_hours JSONB DEFAULT '{"monday": {"from": "08:00", "to": "17:00", "closed": false}, "tuesday": {"from": "08:00", "to": "17:00", "closed": false}, "wednesday": {"from": "08:00", "to": "17:00", "closed": false}, "thursday": {"from": "08:00", "to": "17:00", "closed": false}, "friday": {"from": "08:00", "to": "17:00", "closed": false}, "saturday": {"from": "08:00", "to": "12:00", "closed": true}, "sunday": {"from": "00:00", "to": "00:00", "closed": true}}'::JSONB,
  review_settings JSONB DEFAULT '{"google_review_url": "", "auto_request": true, "request_delay_hours": 24}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only ever one row per instance
INSERT INTO company_settings (id) VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;

-- Policies
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to company settings"
  ON company_settings FOR SELECT
  USING (true);

CREATE POLICY "Allow admin to update company settings"
  ON company_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
