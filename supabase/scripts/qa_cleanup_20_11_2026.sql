-- LokShift production: second junk cleanup (20.11.2026)
-- Removes only rows created by our internal test accounts. No client
-- employee's times, plans, Spesen or documents are touched.
-- Internal accounts: dev@tylotech.de, leo messi, Projektmanager, Test RMR,
-- haseebtylo@gmail.com (all profiles.is_internal = true).

BEGIN;

-- 1. Test RMR's test shift on 06.05.2026
DELETE FROM plans WHERE id = 'de1ce1ad-a826-4398-bb98-952b80a255f8';

-- 2. Rejected test Spesen (28,00 €, 08.05.2026) of haseebtylo@gmail.com
DELETE FROM per_diems WHERE id = '013a8cec-2d43-4e19-84fa-623816087283';

-- 3. Audit trail of the deleted test entry from 19.11.2026
DELETE FROM time_entry_audit WHERE entry_id = '5d75283e-cac9-4b79-960d-9034608bab8e';

-- 4. Notifications addressed to internal test accounts
DELETE FROM notifications
WHERE user_id IN (SELECT id FROM profiles WHERE is_internal);

-- 5. Test calendar events created by haseebtylo@gmail.com (April 2026)
DELETE FROM calendar_event_members
WHERE event_id IN (SELECT id FROM calendar_events WHERE creator_id = 'd52bffcc-709d-4ea4-a5cc-7ccc058464a2');
DELETE FROM calendar_events WHERE creator_id = 'd52bffcc-709d-4ea4-a5cc-7ccc058464a2';

-- 6. Test chats (April/May 2026), each started by an internal account
DELETE FROM chat_messages WHERE conversation_id IN (
  '03bc83a0-eb90-4631-8a20-47d20d19cc4f', 'c76b543e-fdf0-4d95-811b-d9d5e3149707',
  'ff853d66-1417-4377-a0a5-806b138f5209', '392ad1ea-e91e-4faa-8600-873d01b10577',
  'ac98f790-e517-499c-97b6-7b2cf38f6baf');
DELETE FROM chat_members WHERE conversation_id IN (
  '03bc83a0-eb90-4631-8a20-47d20d19cc4f', 'c76b543e-fdf0-4d95-811b-d9d5e3149707',
  'ff853d66-1417-4377-a0a5-806b138f5209', '392ad1ea-e91e-4faa-8600-873d01b10577',
  'ac98f790-e517-499c-97b6-7b2cf38f6baf');
DELETE FROM chat_conversations WHERE id IN (
  '03bc83a0-eb90-4631-8a20-47d20d19cc4f', 'c76b543e-fdf0-4d95-811b-d9d5e3149707',
  'ff853d66-1417-4377-a0a5-806b138f5209', '392ad1ea-e91e-4faa-8600-873d01b10577',
  'ac98f790-e517-499c-97b6-7b2cf38f6baf');

COMMIT;
