-- Migration 003: RBAC, Partners, and Lead Marketplace

-- 1. Extend PROFILES table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS partner_id UUID; -- References partners(id) added later
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS technician_id UUID; -- References technicians(id) added later
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- 2. PARTNERS table
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  service_areas TEXT[],           -- which cities/postcodes they cover
  service_types TEXT[],           -- which services they handle
  commission_model TEXT DEFAULT 'per_lead', -- 'per_lead' | 'percentage' | 'flat_monthly'
  commission_rate NUMERIC(10,2),  -- EUR per lead OR percentage (0-100)
  monthly_fee NUMERIC(10,2),      -- for flat_monthly model
  is_active BOOLEAN DEFAULT true,
  stripe_customer_id TEXT,        -- for billing (Phase 4)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign keys to profiles now that referenced tables exist
ALTER TABLE profiles 
  ADD CONSTRAINT fk_profiles_partner 
  FOREIGN KEY (partner_id) 
  REFERENCES partners(id);

ALTER TABLE profiles 
  ADD CONSTRAINT fk_profiles_technician 
  FOREIGN KEY (technician_id) 
  REFERENCES technicians(id);

-- 3. PARTNER_LEADS table (assigned or purchased leads)
CREATE TABLE IF NOT EXISTS partner_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),  -- which admin assigned it
  assignment_type TEXT DEFAULT 'assigned',   -- 'assigned' | 'purchased' | 'auto_matched'
  status TEXT DEFAULT 'pending',             -- 'pending' | 'accepted' | 'rejected' | 'converted' | 'expired'
  commission_amount NUMERIC(10,2),  -- calculated at time of assignment
  commission_paid BOOLEAN DEFAULT false,
  commission_paid_at TIMESTAMPTZ,
  partner_notes TEXT,               -- partner's internal notes on this lead
  viewed_at TIMESTAMPTZ,            -- when partner first viewed the lead
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ,           -- lead offer expires if not accepted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id, lead_id)
);

-- 4. LEAD_MARKETPLACE table
CREATE TABLE IF NOT EXISTS lead_marketplace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  listed_by UUID REFERENCES profiles(id),
  price NUMERIC(10,2) NOT NULL,     -- fixed price partners pay to claim
  is_exclusive BOOLEAN DEFAULT false, -- exclusive = only 1 partner can claim
  max_claims INTEGER DEFAULT 1,     -- how many partners can purchase
  current_claims INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',     -- 'active' | 'sold' | 'expired' | 'withdrawn'
  listed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  lead_preview JSONB,               -- limited preview { city, postcode, service_type, job_type, urgency, description_preview, estimated_value }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PARTNER_CREDITS table (wallet)
CREATE TABLE IF NOT EXISTS partner_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,    -- positive = credit added, negative = spent
  transaction_type TEXT NOT NULL,   -- 'top_up' | 'lead_purchase' | 'commission_debit' | 'refund' | 'adjustment'
  reference_id UUID,                -- partner_leads.id or payment reference
  description TEXT,
  balance_after NUMERIC(10,2),      -- running balance snapshot
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Helper Functions for RLS
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_partner_id()
RETURNS UUID AS $$
  SELECT partner_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_technician_id()
RETURNS UUID AS $$
  SELECT technician_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 7. Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to cleanly apply new ones
DROP POLICY IF EXISTS "Leads select policy" ON leads;
DROP POLICY IF EXISTS "Jobs select policy" ON jobs;
DROP POLICY IF EXISTS "Technicians select policy" ON technicians;
DROP POLICY IF EXISTS "Messages select policy" ON messages;
DROP POLICY IF EXISTS "Profiles select policy" ON profiles;

-- 8. RLS Policies

-- PROFILES
CREATE POLICY "Profiles read access" ON profiles FOR SELECT
  USING ( true ); -- Fixes infinite recursion: everyone authenticated can see profiles, or at least read their own without looping

CREATE POLICY "Profiles update access" ON profiles FOR UPDATE
  USING (
    get_my_role() IN ('admin') 
    OR id = auth.uid()
  );

-- LEADS
CREATE POLICY "Leads read access" ON leads FOR SELECT
  USING (
    get_my_role() IN ('admin', 'manager', 'disponent', 'viewer')
    OR (
      get_my_role() = 'technician' AND 
      EXISTS (SELECT 1 FROM jobs WHERE jobs.lead_id = leads.id AND jobs.technician_id = get_my_technician_id())
    )
    OR (
      get_my_role() IN ('partner_admin', 'partner_agent') AND
      EXISTS (SELECT 1 FROM partner_leads WHERE partner_leads.lead_id = leads.id AND partner_leads.partner_id = get_my_partner_id())
    )
  );

CREATE POLICY "Leads write access" ON leads FOR ALL
  USING (get_my_role() IN ('admin', 'manager', 'disponent'));


-- JOBS
CREATE POLICY "Jobs read access" ON jobs FOR SELECT
  USING (
    get_my_role() IN ('admin', 'manager', 'disponent', 'viewer')
    OR (get_my_role() = 'technician' AND technician_id = get_my_technician_id())
    OR (
      get_my_role() IN ('partner_admin', 'partner_agent') AND
      EXISTS (SELECT 1 FROM partner_leads WHERE partner_leads.lead_id = jobs.lead_id AND partner_leads.partner_id = get_my_partner_id())
    )
  );

CREATE POLICY "Jobs write access" ON jobs FOR ALL
  USING (
    get_my_role() IN ('admin', 'manager', 'disponent')
    OR (get_my_role() = 'technician' AND technician_id = get_my_technician_id()) -- Techs can update their job status
  );


-- TECHNICIANS
CREATE POLICY "Technicians read access" ON technicians FOR SELECT
  USING (
    get_my_role() IN ('admin', 'manager', 'disponent', 'viewer')
    OR (get_my_role() = 'technician' AND id = get_my_technician_id())
  );

CREATE POLICY "Technicians write access" ON technicians FOR ALL
  USING (
    get_my_role() IN ('admin', 'manager')
    OR (get_my_role() = 'technician' AND id = get_my_technician_id()) -- Techs can update availability
  );


-- MESSAGES
CREATE POLICY "Messages read access" ON messages FOR SELECT
  USING (
    get_my_role() IN ('admin', 'manager', 'disponent', 'viewer')
  );

CREATE POLICY "Messages write access" ON messages FOR ALL
  USING (get_my_role() IN ('admin', 'manager', 'disponent'));


-- PARTNERS
CREATE POLICY "Partners read access" ON partners FOR SELECT
  USING (
    get_my_role() IN ('admin', 'manager')
    OR (get_my_role() IN ('partner_admin', 'partner_agent') AND id = get_my_partner_id())
  );

CREATE POLICY "Partners write access" ON partners FOR ALL
  USING (get_my_role() IN ('admin', 'manager'));


-- PARTNER_LEADS
CREATE POLICY "PartnerLeads read access" ON partner_leads FOR SELECT
  USING (
    get_my_role() IN ('admin', 'manager')
    OR (get_my_role() IN ('partner_admin', 'partner_agent') AND partner_id = get_my_partner_id())
  );

CREATE POLICY "PartnerLeads write access" ON partner_leads FOR ALL
  USING (
    get_my_role() IN ('admin', 'manager')
    OR (get_my_role() IN ('partner_admin', 'partner_agent') AND partner_id = get_my_partner_id()) -- Partners can update status
  );


-- LEAD_MARKETPLACE
CREATE POLICY "Marketplace read access" ON lead_marketplace FOR SELECT
  USING (
    get_my_role() IN ('admin', 'manager', 'partner_admin', 'partner_agent')
  );

CREATE POLICY "Marketplace write access" ON lead_marketplace FOR ALL
  USING (get_my_role() IN ('admin', 'manager'));


-- PARTNER_CREDITS
CREATE POLICY "Credits read access" ON partner_credits FOR SELECT
  USING (
    get_my_role() IN ('admin', 'manager')
    OR (get_my_role() IN ('partner_admin', 'partner_agent') AND partner_id = get_my_partner_id())
  );

CREATE POLICY "Credits write access" ON partner_credits FOR ALL
  USING (get_my_role() IN ('admin', 'manager'));

-- 9. Trigger for first user as Admin
CREATE OR REPLACE FUNCTION public.handle_first_user_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM profiles) = 0 THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_creation_first_admin
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_first_user_admin();
