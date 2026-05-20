-- Force a password change on first login.
--
-- Section 5.1 of the Lokshift requirements:
--   "First login flow: user must change initial password
--    (Beim ersten Login muss das initiale Passwort geändert werden)"
--
-- When an admin creates a user, the server-side endpoint sets this flag to
-- TRUE. The middleware redirects such users to /change-password until they
-- complete the change, after which the flag flips to FALSE.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing users created before this column existed must NOT be forced to
-- change. The DEFAULT FALSE handles that. New users get TRUE explicitly from
-- the /api/users/create endpoint.
