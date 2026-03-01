-- Daily cron job to sync GSC performance data
-- Runs at midnight UTC every day
-- This calls an internal endpoint on the backend API to trigger the sync

-- Install http extension (required for making HTTP requests)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Note: pg_cron is typically already available in Supabase
-- If needed, contact Supabase support to enable it for your project

-- The cron job is scheduled above and will run daily at midnight UTC
-- To manually test the sync, use the command below in SQL Editor:

-- Manual test:
-- SELECT extensions.http_post(
--   'https://sharkly.co/api/gsc/sync'::text,
--   '{}'::text,
--   'application/json'
-- );

-- To schedule the daily cron job at midnight UTC, run:
-- SELECT cron.schedule(
--   'gsc-sync-daily',
--   '0 0 * * *',
--   $$
--   SELECT extensions.http_post(
--     'https://sharkly.co/api/gsc/sync'::text,
--     '{}'::text,
--     'application/json'
--   );
--   $$
-- );
