
CREATE TABLE IF NOT EXISTS operational_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  short_code      TEXT,                                -- e.g. "RM-DEP-01"
  type            TEXT NOT NULL DEFAULT 'depot'
                    CHECK (type IN ('depot', 'station', 'yard', 'workshop', 'office', 'other')),
  address         TEXT,
  latitude        NUMERIC(10, 7),
  longitude       NUMERIC(10, 7),
  is_active       BOOLEAN DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_operational_locations_org
  ON operational_locations(organization_id, is_active);

ALTER TABLE operational_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oploc_select" ON operational_locations;
CREATE POLICY "oploc_select" ON operational_locations FOR SELECT
  USING (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS "oploc_write" ON operational_locations;
CREATE POLICY "oploc_write" ON operational_locations FOR ALL
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

-- 2. Wire Start + Destination into plans
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS start_location_id       UUID REFERENCES operational_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_location_id UUID REFERENCES operational_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_plans_start_loc       ON plans(start_location_id)       WHERE start_location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plans_destination_loc ON plans(destination_location_id) WHERE destination_location_id IS NOT NULL;

-- 3. Same on time_entries so reports can compare planned vs actual
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS start_location_id       UUID REFERENCES operational_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_location_id UUID REFERENCES operational_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_start_loc
  ON time_entries(start_location_id) WHERE start_location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_destination_loc
  ON time_entries(destination_location_id) WHERE destination_location_id IS NOT NULL;

COMMENT ON COLUMN plans.start_location_id IS
  'Optional link to the operational_locations row the shift departs from. Coexists with the free-text `location` column.';
COMMENT ON COLUMN plans.destination_location_id IS
  'Optional link to the operational_locations row the shift ends at.';
