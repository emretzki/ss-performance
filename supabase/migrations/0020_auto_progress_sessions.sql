-- PTs weren't reliably tapping "Dersi Başlat"/"Dersi Bitir" — feedback from
-- a şube sahibi was that trainers just skip it entirely. Package usage was
-- already decremented at booking time regardless (see bump_member_package_usage
-- in 0013), so those buttons only ever drove the *status label*, not billing —
-- meaning we can safely automate status off the wall clock and drop the
-- buttons without changing anything about how commission/package math works.
--
-- Replaces close_stale_sessions() (0004): that only auto-closed a session
-- that had ALREADY been manually started, capped at a fixed 1 hour
-- regardless of the session's real length. This instead drives both
-- transitions (scheduled -> in_progress -> done) purely from starts_at +
-- duration_min, so a session settles into "done" at the moment it was
-- actually scheduled to end, with no button ever required.
create or replace function auto_progress_sessions() returns void as $$
  update sessions
  set status = 'in_progress', started_at = coalesce(started_at, starts_at)
  where status = 'scheduled' and starts_at <= now();

  update sessions
  set status = 'done', ended_at = coalesce(ended_at, starts_at + make_interval(mins => duration_min))
  where status = 'in_progress' and starts_at + make_interval(mins => duration_min) <= now();
$$ language sql;

select cron.unschedule('close-stale-sessions');
drop function if exists close_stale_sessions();

select cron.schedule(
  'auto-progress-sessions',
  '* * * * *',
  $$select auto_progress_sessions()$$
);
