-- Instructions: Run this in the Supabase SQL Editor
-- This script uses pg_cron and pg_net to call your Next.js Vercel API
-- Replace 'https://your-production-url.vercel.app' with your actual Vercel domain

-- 1. Enable the required extensions (they are usually enabled by default on Supabase)
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 2. Create the cron job to run every 4 hours
-- Make sure to replace the URL and add your actual CRON_SECRET if you added one in Vercel
select cron.schedule(
  'sync-linkedin-analytics-job', -- Job name
  '0 */4 * * *',               -- Cron schedule (every 4 hours)
  $$
    select net.http_post(
      url:='https://marketing-automation-ten.vercel.app/api/cron/sync-linkedin-analytics',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer your_cron_secret_here"}'::jsonb
    );
  $$
);

-- Note: To view scheduled jobs, run:
-- select * from cron.job;

-- Note: To unschedule a job, run:
-- select cron.unschedule('sync-linkedin-analytics-job');
