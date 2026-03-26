-- Migration 012: Optimize RLS via JWT Claims
-- This significantly speeds up RLS by avoiding subqueries to the profiles table for every row.

-- 1. Helper to update user metadata (role/partner_id/technician_id)
CREATE OR REPLACE FUNCTION public.sync_profile_to_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the auth.users table with the new metadata
  -- This makes these values available via auth.jwt()
  UPDATE auth.users
  SET raw_app_metadata_base = 
    raw_app_metadata_base || 
    jsonb_build_object(
      'role', NEW.role,
      'partner_id', NEW.partner_id,
      'technician_id', NEW.technician_id
    )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger to keep auth metadata in sync with profile
DROP TRIGGER IF EXISTS on_profile_updated_sync_auth ON public.profiles;
CREATE TRIGGER on_profile_updated_sync_auth
AFTER INSERT OR UPDATE OF role, partner_id, technician_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_auth_metadata();

-- 3. Optimized RLS Helpers
-- These now prefer JWT claims (instant) but fallback to IDs for safety

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    (SELECT role FROM profiles WHERE id = auth.uid())
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_partner_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    ((auth.jwt() -> 'app_metadata' ->> 'partner_id')::UUID),
    (SELECT partner_id FROM profiles WHERE id = auth.uid())
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_technician_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    ((auth.jwt() -> 'app_metadata' ->> 'technician_id')::UUID),
    (SELECT technician_id FROM profiles WHERE id = auth.uid())
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Audit Existing Users
-- Run this once to sync all existing profiles to auth metadata
-- DO NOT REMOVE: This is needed for existing accounts
-- UPDATE profiles SET role = role; 
