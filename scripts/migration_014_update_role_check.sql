-- Migration 014: Update Profile Roles Constraint
-- The initial roles check constraint doesn't include the new partner roles.
-- This script safely updates the constraint to allow 'partner_admin' and 'partner_agent'.

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'manager', 'disponent', 'technician', 'viewer', 'partner_admin', 'partner_agent'));
