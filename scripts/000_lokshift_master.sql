-- ──────────────────────────────────────────────────────────
-- LOKSHIFT MASTER DATABASE SETUP (10 Deliverables)
-- ──────────────────────────────────────────────────────────

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ORGANIZATIONS (Multi-tenancy)
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  logo_url    TEXT,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. PROFILES (Roles: admin, dispatcher, employee)
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  full_name       TEXT,
  email           TEXT,
  role            TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'dispatcher', 'employee')),
  avatar_url      TEXT,
  is_active       BOOLEAN DEFAULT true,
  target_hours    NUMERIC(10,2) DEFAULT 40.0, -- Weekly target hours for Time Account
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 4. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  address         TEXT,
  contact_person  TEXT,
  contact_info    TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 5. PLANS (Shift & Assignment Plans)
CREATE TABLE IF NOT EXISTS plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_id      UUID NOT NULL REFERENCES profiles(id),
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  route           TEXT,
  location        TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('draft', 'assigned', 'confirmed', 'rejected', 'cancelled')),
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 6. TIMES (Working Time Logs)
CREATE TABLE IF NOT EXISTS time_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id         UUID REFERENCES plans(id) ON DELETE SET NULL, -- optional link to shift
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  break_minutes   INTEGER DEFAULT 0,
  net_hours       NUMERIC(10,2) GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (end_time - start_time))/3600 - (break_minutes/60.0)
  ) STORED,
  notes           TEXT,
  is_verified     BOOLEAN DEFAULT false,
  verified_by     UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 7. PER DIEM (Travel Allowance)
CREATE TABLE IF NOT EXISTS per_diems (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  departure_time  TIMESTAMPTZ,
  return_time     TIMESTAMPTZ,
  country         TEXT DEFAULT 'Germany',
  amount          NUMERIC(10,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 8. HOLIDAY BONUS
CREATE TABLE IF NOT EXISTS holiday_bonuses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  period_start    DATE,
  period_end      DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 9. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  type            TEXT DEFAULT 'info',
  is_read         BOOLEAN DEFAULT false,
  link            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 10. REAL-TIME CHAT (Integrated from 016)
CREATE TABLE IF NOT EXISTS chat_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT,
  is_group        BOOLEAN NOT NULL DEFAULT false,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_members (
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member',
  joined_at       TIMESTAMPTZ DEFAULT now(),
  last_read_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id),
  content         TEXT,
  attachment_url  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────
-- RLS POLICIES & SECURITY HELPERS
-- ──────────────────────────────────────────────────────────

-- Helper function to break RLS recursion for organization checks
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- 1. Organizations: Everyone can see basic org info (needed for registration)
DROP POLICY IF EXISTS "org_public_select" ON organizations;
CREATE POLICY "org_public_select" ON organizations FOR SELECT USING (true);

-- 2. Profiles: Users can see all in their org (for selection), but update only own
DROP POLICY IF EXISTS "profiles_org_access" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles FOR SELECT
  USING (organization_id = public.get_my_org_id() OR id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
CREATE POLICY "profiles_update_policy" ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Plans: Employees see own, Admin/Dispatcher see all in org
DROP POLICY IF EXISTS "plans_access_policy" ON plans;
CREATE POLICY "plans_access_policy" ON plans FOR SELECT
  USING (
    employee_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'dispatcher') 
      AND organization_id = plans.organization_id
    )
  );

-- 11. INITIALIZATION (Ensure trigger works by having at least one org)
INSERT INTO organizations (name, slug)
VALUES ('Lokshift Default', 'default')
ON CONFLICT (slug) DO NOTHING;

-- 12. TRIGGERS
-- Trigger to create profile and link to default org if none
CREATE OR REPLACE FUNCTION public.handle_new_lokshift_user()
RETURNS TRIGGER AS $$
DECLARE
  default_org_id UUID;
  meta_org_id TEXT;
  target_org_id UUID;
BEGIN
  -- 1. Get a fallback organization ID
  SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
  
  -- 2. Safely extract and validate organization_id from metadata
  meta_org_id := NEW.raw_user_meta_data->>'organization_id';
  
  -- Use a block to safely attempt the cast
  BEGIN
    IF meta_org_id IS NOT NULL AND meta_org_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      target_org_id := meta_org_id::UUID;
    ELSE
      target_org_id := default_org_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    target_org_id := default_org_id;
  END;

  -- 3. Insert into profiles with extreme safety (won't block auth user creation)
  BEGIN
    INSERT INTO public.profiles (id, full_name, email, organization_id, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.email,
      target_org_id,
      COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
    );
  EXCEPTION WHEN OTHERS THEN
    -- If profile creation fails, we log it but let the auth user creation succeed
    -- This prevents the "Database error saving new user" (unexpected_failure)
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-link the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_lokshift_user();
