
CREATE TABLE IF NOT EXISTS shift_templates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  creator_id         UUID NOT NULL REFERENCES profiles(id),
  name               TEXT NOT NULL,
  customer_id        UUID REFERENCES customers(id) ON DELETE SET NULL,
  start_time         TEXT NOT NULL,           -- 'HH:MM' (local)
  end_time           TEXT NOT NULL,           -- 'HH:MM' (local)
  duration_days      INTEGER NOT NULL DEFAULT 1 CHECK (duration_days >= 1),
  route              TEXT,
  location           TEXT,
  overnight_stay     BOOLEAN DEFAULT false,
  hotel_address      TEXT,
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_templates_org ON shift_templates(organization_id);

ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

-- Everyone in the org can read templates.
DROP POLICY IF EXISTS "shift_templates_select" ON shift_templates;
CREATE POLICY "shift_templates_select" ON shift_templates FOR SELECT
  USING (organization_id = public.get_my_org_id());

-- Only admin / dispatcher may write.
DROP POLICY IF EXISTS "shift_templates_write" ON shift_templates;
CREATE POLICY "shift_templates_write" ON shift_templates FOR ALL
  USING (
    organization_id = public.get_my_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'dispatcher')
    )
  )
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'dispatcher')
    )
  );
