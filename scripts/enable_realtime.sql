-- Enable Supabase Realtime on all operational tables
-- This ensures the UI updates instantly without manual refreshes

-- 1. Create the publication if it doesn't exist (Supabase usually has it, but good for idempotency)
-- EXCEPTION: In some environments this fails, so we just focus on adding tables.

-- 2. Add operational tables to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE plans;
ALTER PUBLICATION supabase_realtime ADD TABLE time_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE per_diems;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;

-- 3. Verify tables are in the publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- IMPORTANT: You must also go to your Supabase Dashboard
-- Database -> Replication -> supabase_realtime (click 'xxx tables')
-- and ensure these tables are toggled ON if the SQL doesn't reflect immediately.
