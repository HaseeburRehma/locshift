-- =============================================================================
-- QA 19.11.2026 · Data cleanup before handover (run AFTER the migration
-- 20261119120000_qa_fixes.sql). Run block by block in the SQL editor and
-- check each preview before the change below it.
-- =============================================================================

-- 1. Internal test accounts → hidden from all client views (not deleted).
--    Preview:
SELECT id, full_name, email, role, is_internal
  FROM public.profiles
 WHERE lower(email) IN ('dev@tylotech.de', 'jhaseeb718@gmail.com')
    OR lower(full_name) IN ('leo messi', 'test rmr', 'projektmanager')
    OR lower(email) LIKE '%haseeb%'
    OR lower(full_name) LIKE '%haseeb%'
 ORDER BY full_name;

UPDATE public.profiles
   SET is_internal = TRUE
 WHERE lower(email) IN ('dev@tylotech.de', 'jhaseeb718@gmail.com')
    OR lower(full_name) IN ('leo messi', 'test rmr', 'projektmanager')
    OR lower(email) LIKE '%haseeb%'
    OR lower(full_name) LIKE '%haseeb%';

-- 2. Test time entry dev@tylotech.de, 19.11.2026 10:00–18:00 and its
--    correction request. (The entry was already deleted at 15:12; this
--    removes it if it still exists and any correction left behind.)
SELECT te.id, te.date, te.start_time, te.end_time
  FROM public.time_entries te JOIN public.profiles p ON p.id = te.employee_id
 WHERE lower(p.email) = 'dev@tylotech.de' AND te.date = '2026-11-19';

DELETE FROM public.time_entry_corrections c
 WHERE NOT EXISTS (SELECT 1 FROM public.time_entries te WHERE te.id = c.entry_id)
    OR c.entry_id IN (SELECT te.id FROM public.time_entries te JOIN public.profiles p ON p.id = te.employee_id
                       WHERE lower(p.email) = 'dev@tylotech.de' AND te.date = '2026-11-19');
DELETE FROM public.time_entries te
 USING public.profiles p
 WHERE p.id = te.employee_id AND lower(p.email) = 'dev@tylotech.de' AND te.date = '2026-11-19';

-- 3. Spesen: rejected claim of a deleted account (08.05.2026, 28,00 €,
--    shown as "Unbekannt"). Preview every claim without an account:
SELECT pd.id, pd.date, pd.start_date, pd.amount, pd.status, pd.task
  FROM public.per_diems pd
 WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pd.employee_id);

DELETE FROM public.per_diems pd
 WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pd.employee_id)
   AND pd.status = 'rejected';

-- 4. Sonderzahlungen: test record "Test RMR – Leistungsprämie 100 € (10/2026)".
SELECT id, title, amount, billing_month, employee_id
  FROM public.holiday_bonuses
 WHERE title ILIKE '%Leistungsprämie%' AND amount = 100;

DELETE FROM public.holiday_bonuses hb
 USING public.profiles p
 WHERE p.id = hb.employee_id
   AND lower(p.full_name) = 'test rmr'
   AND hb.title ILIKE '%Leistungsprämie%'
   AND hb.amount = 100;

-- 5. Check: client views now hide these accounts.
SELECT full_name, email, role FROM public.profiles WHERE is_internal ORDER BY full_name;
