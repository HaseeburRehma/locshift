-- Migration: Add Working Time Models for Admin Management (Section 4.1)

-- 1. Create the Working Time Models table
CREATE TABLE IF NOT EXISTS working_time_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_hours_per_week DECIMAL(10,2) NOT NULL DEFAULT 40.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE working_time_models ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Admin/Dispatcher can do everything
CREATE POLICY "Admins have full access to work models"
  ON working_time_models
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = working_time_models.organization_id 
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- All employees can view (to see their own model details)
CREATE POLICY "All employees can view work models"
  ON working_time_models
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = working_time_models.organization_id
    )
  );

-- 4. Add foreign key to profiles if not exists to link an employee to a model
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS working_time_model_id UUID REFERENCES working_time_models(id) ON DELETE SET NULL;

-- 5. Seed some defaults for the organization
-- (This would usually happen on org creation, but adding here for bootstrapping)
INSERT INTO working_time_models (organization_id, name, description, target_hours_per_week)
SELECT id, 'Full Time (Standard)', 'Standard 40-hour work week', 40.00 FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO working_time_models (organization_id, name, description, target_hours_per_week)
SELECT id, 'Part Time (50%)', '20-hour work week model', 20.00 FROM organizations
ON CONFLICT DO NOTHING;
