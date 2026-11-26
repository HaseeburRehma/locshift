-- Betriebsstellen: the code is the identity (billing spec section 9).
--
-- The official RIL100 list (Stand 30.10.2026) has 17 names that belong to
-- two different codes each, e.g. "Frankfurt (Oder) Pbf" = BFP and BFP P,
-- "Auma" = UAU and XOAM. The old UNIQUE (organization_id, name) blocked the
-- import. Codes stay unique per organisation (uq_operational_locations_org_code);
-- names stay unique among the organisation's own entries (source IS NULL), so
-- admins still cannot create the same own Betriebsstelle twice.
-- Idempotent; safe to run again.

ALTER TABLE public.operational_locations
  DROP CONSTRAINT IF EXISTS operational_locations_organization_id_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_operational_locations_org_name_own
  ON public.operational_locations (organization_id, name)
  WHERE source IS NULL;
