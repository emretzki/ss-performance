-- Schedules close_stale_sessions() (defined in 0004) to run every 5 minutes,
-- so a session left "in_progress" is auto-completed after 1 hour even if the
-- trainer never taps "Dersi Bitir".
--
-- If this fails with a permission error, enable the pg_cron extension first
-- via Dashboard -> Database -> Extensions (search "pg_cron", toggle it on),
-- then run this file again.

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'close-stale-sessions',
  '*/5 * * * *',
  $$select close_stale_sessions()$$
);
