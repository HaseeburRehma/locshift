

BEGIN;



ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS legal_name      TEXT,
  ADD COLUMN IF NOT EXISTS email           TEXT,
  ADD COLUMN IF NOT EXISTS phone           TEXT,
  ADD COLUMN IF NOT EXISTS website         TEXT,
  ADD COLUMN IF NOT EXISTS address         TEXT,
  ADD COLUMN IF NOT EXISTS tax_id          TEXT,
  ADD COLUMN IF NOT EXISTS currency        TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS timezone        TEXT NOT NULL DEFAULT 'Europe/Berlin',
  ADD COLUMN IF NOT EXISTS default_locale  TEXT NOT NULL DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS date_format     TEXT NOT NULL DEFAULT 'DD.MM.YYYY',
  ADD COLUMN IF NOT EXISTS time_format     TEXT NOT NULL DEFAULT '24h',
  ADD COLUMN IF NOT EXISTS plan_tier       TEXT NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS plan_seats      INT  NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS plan_renews_at  TIMESTAMPTZ;

COMMENT ON COLUMN public.organizations.default_locale IS 'Default UI locale for new users (de | en).';
COMMENT ON COLUMN public.organizations.plan_tier      IS 'Subscription tier: starter | professional | enterprise.';

-- ---------------------------------------------------------------------------
-- 2. INTEGRATIONS — per-org provider connections
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,        -- 'supabase' | 'anthropic' | 'stripe' | 'twilio' | 'sendgrid' | ...
  display_name    TEXT NOT NULL,
  is_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  -- API credentials are stored masked. The application MUST mask them on read
  -- and only the last 4 characters are ever shown in the UI.
  api_key_last4   TEXT,
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,  -- non-secret config (region, webhook URL, etc.)
  last_test_at    TIMESTAMPTZ,
  last_test_ok    BOOLEAN,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_org ON public.integrations(organization_id);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS integrations_select ON public.integrations;
CREATE POLICY integrations_select ON public.integrations
  FOR SELECT USING (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS integrations_admin_write ON public.integrations;
CREATE POLICY integrations_admin_write ON public.integrations
  FOR ALL
  USING      (organization_id = public.get_my_org_id() AND public.is_admin_or_dispatcher_in(organization_id))
  WITH CHECK (organization_id = public.get_my_org_id() AND public.is_admin_or_dispatcher_in(organization_id));

-- ---------------------------------------------------------------------------
-- 3. NOTIFICATION_PREFERENCES — per-user channel + event toggles
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id              UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Channels
  email_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  whatsapp_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  push_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  -- Events
  event_new_shift          BOOLEAN NOT NULL DEFAULT TRUE,
  event_shift_updated      BOOLEAN NOT NULL DEFAULT TRUE,
  event_plan_confirmed     BOOLEAN NOT NULL DEFAULT TRUE,
  event_plan_rejected      BOOLEAN NOT NULL DEFAULT TRUE,
  event_calendar_invite    BOOLEAN NOT NULL DEFAULT TRUE,
  event_calendar_reminder  BOOLEAN NOT NULL DEFAULT TRUE,
  event_time_approval      BOOLEAN NOT NULL DEFAULT TRUE,
  event_chat_mention       BOOLEAN NOT NULL DEFAULT TRUE,
  -- Quiet hours
  quiet_hours_start    TIME,
  quiet_hours_end      TIME,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_org ON public.notification_preferences(organization_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_prefs_select ON public.notification_preferences;
CREATE POLICY notif_prefs_select ON public.notification_preferences
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin_or_dispatcher_in(organization_id));

DROP POLICY IF EXISTS notif_prefs_self_upsert ON public.notification_preferences;
CREATE POLICY notif_prefs_self_upsert ON public.notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid() AND organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS notif_prefs_self_update ON public.notification_preferences;
CREATE POLICY notif_prefs_self_update ON public.notification_preferences
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notif_prefs_self_delete ON public.notification_preferences;
CREATE POLICY notif_prefs_self_delete ON public.notification_preferences
  FOR DELETE USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. SECURITY_SETTINGS — per-org auth & access policies
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.security_settings (
  organization_id        UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  require_2fa            BOOLEAN NOT NULL DEFAULT FALSE,
  password_min_length    INT     NOT NULL DEFAULT 10,
  password_require_upper BOOLEAN NOT NULL DEFAULT TRUE,
  password_require_digit BOOLEAN NOT NULL DEFAULT TRUE,
  password_require_special BOOLEAN NOT NULL DEFAULT FALSE,
  session_timeout_minutes INT    NOT NULL DEFAULT 480,  -- 8h
  ip_allowlist           JSONB   NOT NULL DEFAULT '[]'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sec_settings_select ON public.security_settings;
CREATE POLICY sec_settings_select ON public.security_settings
  FOR SELECT USING (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS sec_settings_admin_write ON public.security_settings;
CREATE POLICY sec_settings_admin_write ON public.security_settings
  FOR ALL
  USING      (organization_id = public.get_my_org_id() AND public.is_admin_or_dispatcher_in(organization_id))
  WITH CHECK (organization_id = public.get_my_org_id() AND public.is_admin_or_dispatcher_in(organization_id));

-- ---------------------------------------------------------------------------
-- 5. QUALIFICATIONS — per-user certifications & licences
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.qualifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  issuer          TEXT,
  issued_at       DATE,
  expires_at      DATE,
  reference       TEXT,
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  document_url    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qualifications_user ON public.qualifications(user_id);
CREATE INDEX IF NOT EXISTS idx_qualifications_org  ON public.qualifications(organization_id);

ALTER TABLE public.qualifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qual_select ON public.qualifications;
CREATE POLICY qual_select ON public.qualifications
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_admin_or_dispatcher_in(organization_id)
  );

DROP POLICY IF EXISTS qual_self_insert ON public.qualifications;
CREATE POLICY qual_self_insert ON public.qualifications
  FOR INSERT WITH CHECK (user_id = auth.uid() AND organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS qual_self_update ON public.qualifications;
CREATE POLICY qual_self_update ON public.qualifications
  FOR UPDATE USING (
    user_id = auth.uid() OR public.is_admin_or_dispatcher_in(organization_id)
  ) WITH CHECK (
    user_id = auth.uid() OR public.is_admin_or_dispatcher_in(organization_id)
  );

DROP POLICY IF EXISTS qual_self_delete ON public.qualifications;
CREATE POLICY qual_self_delete ON public.qualifications
  FOR DELETE USING (
    user_id = auth.uid() OR public.is_admin_or_dispatcher_in(organization_id)
  );

-- ---------------------------------------------------------------------------
-- 6. ABSENCES — leave / vacation tracking
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.absences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type            TEXT NOT NULL DEFAULT 'vacation',  -- 'vacation' | 'sick' | 'unpaid' | 'training' | 'other'
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'approved' | 'rejected'
  reason          TEXT,
  approver_id     UUID REFERENCES public.profiles(id),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_absences_user  ON public.absences(user_id);
CREATE INDEX IF NOT EXISTS idx_absences_org   ON public.absences(organization_id);
CREATE INDEX IF NOT EXISTS idx_absences_dates ON public.absences(start_date, end_date);

ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS abs_select ON public.absences;
CREATE POLICY abs_select ON public.absences
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_admin_or_dispatcher_in(organization_id)
  );

DROP POLICY IF EXISTS abs_self_insert ON public.absences;
CREATE POLICY abs_self_insert ON public.absences
  FOR INSERT WITH CHECK (user_id = auth.uid() AND organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS abs_self_update ON public.absences;
CREATE POLICY abs_self_update ON public.absences
  FOR UPDATE USING (
    user_id = auth.uid() OR public.is_admin_or_dispatcher_in(organization_id)
  ) WITH CHECK (
    user_id = auth.uid() OR public.is_admin_or_dispatcher_in(organization_id)
  );

DROP POLICY IF EXISTS abs_self_delete ON public.absences;
CREATE POLICY abs_self_delete ON public.absences
  FOR DELETE USING (
    user_id = auth.uid() OR public.is_admin_or_dispatcher_in(organization_id)
  );

-- ---------------------------------------------------------------------------
-- 7. PROFILE PHONE COLUMN — required for Personal Data form
-- ---------------------------------------------------------------------------
-- The page already writes to profiles.phone / .gender / .bio; assert columns
-- exist so the form never silently fails on a fresh database.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone           TEXT,
  ADD COLUMN IF NOT EXISTS gender          TEXT,
  ADD COLUMN IF NOT EXISTS bio             TEXT,
  ADD COLUMN IF NOT EXISTS first_name      TEXT,
  ADD COLUMN IF NOT EXISTS last_name       TEXT;

COMMIT;

