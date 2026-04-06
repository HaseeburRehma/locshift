-- Migration: Expand per_diems table for high-fidelity claims
-- Purpose: Support multi-day claims with rates and tasks

ALTER TABLE public.per_diems
ADD COLUMN IF NOT EXISTS task TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS num_days INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS rate NUMERIC(10,2) DEFAULT 28.00;

-- Backfill data for existing entries if necessary
UPDATE public.per_diems 
SET 
  start_date = COALESCE(start_date, date),
  end_date = COALESCE(end_date, date),
  task = COALESCE(task, 'Travel / Mission')
WHERE start_date IS NULL;
