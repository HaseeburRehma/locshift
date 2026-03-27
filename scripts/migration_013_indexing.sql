-- Migration 013: Dashboard Performance Indexing
-- Safe to run — only indexes tables that exist in the current schema.

-- 1. Foreign Key Indexes (Speed up JOINs and related lookups)
CREATE INDEX IF NOT EXISTS idx_jobs_lead_id ON public.jobs(lead_id);
CREATE INDEX IF NOT EXISTS idx_jobs_technician_id ON public.jobs(technician_id);
CREATE INDEX IF NOT EXISTS idx_messages_job_id ON public.messages(job_id);
CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON public.messages(lead_id);

-- 2. Status & Sorting Indexes (Speed up common dashboard filters)
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_technicians_is_active ON public.technicians(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_technicians_is_available ON public.technicians(is_available) WHERE is_available = true;

-- 3. Profile lookups (Speed up auth role checks in middleware)
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 4. Leads text search (Speed up name/city searches)
CREATE INDEX IF NOT EXISTS idx_leads_name ON public.leads(name);
CREATE INDEX IF NOT EXISTS idx_leads_city ON public.leads(city);

-- Done. No references to partner_leads or lead_marketplace (tables don't exist yet).
