-- Section 5.7 of the Lokshift requirements lists "Bonus type (Art des Bonus)"
-- as a top-level field on the Holiday Bonus entity. The original schema only
-- captures a free-text `notes` column, so the dispatcher view could not
-- group/filter by bonus category. This migration adds an explicit enum.

DO $$ BEGIN
  CREATE TYPE public.holiday_bonus_type AS ENUM (
    'holiday_pay',     -- Urlaubsgeld
    'christmas',       -- Weihnachtsgeld
    'vacation',        -- Urlaubsbonus / Sommer
    'performance',     -- Leistungsbonus
    'other'            -- Sonstiges
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.holiday_bonuses
  ADD COLUMN IF NOT EXISTS bonus_type public.holiday_bonus_type
    NOT NULL DEFAULT 'holiday_pay';

CREATE INDEX IF NOT EXISTS idx_holiday_bonuses_bonus_type
  ON public.holiday_bonuses (bonus_type);
