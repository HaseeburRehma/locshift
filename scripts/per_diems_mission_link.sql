-- scripts/per_diems_mission_link.sql

-- Add mission plan column (UUID referencing the plans table)
ALTER TABLE per_diems 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS working_hours NUMERIC(10,2) DEFAULT 0;

-- Comment for clarity
COMMENT ON COLUMN per_diems.plan_id IS 'Link to the mission/job this per diem was claimed for';
COMMENT ON COLUMN per_diems.hourly_rate IS 'Charging rate per hour for this job';
COMMENT ON COLUMN per_diems.working_hours IS 'Calculated total working hours for this job';
