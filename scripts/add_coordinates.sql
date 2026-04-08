-- Add coordinates to Customers (Assigned Area)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add coordinates to Profiles (Last Known Position)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_lng DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ;

-- Add coordinates to Time Entries (Check-in Location)
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Comment on columns for clarity
COMMENT ON COLUMN customers.latitude IS 'Fixed latitude of the customer site';
COMMENT ON COLUMN customers.longitude IS 'Fixed longitude of the customer site';
COMMENT ON COLUMN profiles.last_lat IS 'Last captured latitude of the employee';
COMMENT ON COLUMN profiles.last_lng IS 'Last captured longitude of the employee';
COMMENT ON COLUMN time_entries.latitude IS 'Latitude captured at the time of clock-in';
COMMENT ON COLUMN time_entries.longitude IS 'Longitude captured at the time of clock-in';
