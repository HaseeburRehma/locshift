-- Phase 1: Database Automation (Shifts)
-- Automatically generate 30 days of shifts (Mon-Fri) for a new employee

CREATE OR REPLACE FUNCTION public.auto_generate_monthly_shifts()
RETURNS TRIGGER AS $$
DECLARE
    i INTEGER;
    shift_date DATE;
    start_time_val TIMESTAMPTZ;
    end_time_val TIMESTAMPTZ;
BEGIN
    -- Only auto-generate for technicians (employees)
    IF NEW.role = 'technician' THEN
        FOR i IN 0..29 LOOP
            shift_date := CURRENT_DATE + i;
            
            -- Simple logic: Mon-Fri default (Skip Sat/Sun or keep them as optional?)
            -- The user said "whole months shifts", so we populate everyday or just work days.
            -- Choosing 7 days for now to ensure visibility, admin can delete.
            
            start_time_val := (shift_date || ' 08:00:00')::TIMESTAMPTZ;
            end_time_val := (shift_date || ' 17:00:00')::TIMESTAMPTZ;

            INSERT INTO public.plans (
                organization_id,
                employee_id,
                route,
                location,
                start_time,
                end_time,
                status,
                created_at,
                updated_at
            ) VALUES (
                NEW.organization_id,
                NEW.id,
                'Main Hub - Standard Shift',
                'Main Hub',
                start_time_val,
                end_time_val,
                'assigned', -- Status set to assigned so employee can 'confirm' to start tracking
                now(),
                now()
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup existing trigger if it exists
DROP TRIGGER IF EXISTS on_employee_profile_created ON public.profiles;

-- Create the trigger
CREATE TRIGGER on_employee_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_monthly_shifts();

COMMENT ON FUNCTION public.auto_generate_monthly_shifts() IS 'Automatically populates 30 days of default shifts for new technicians.';
