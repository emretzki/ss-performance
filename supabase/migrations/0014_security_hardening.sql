-- Security hardening from a full audit before public launch:
--
-- 1. sessions_update's trainer clause checked identity (trainer_id =
--    auth.uid()) but never re-validated branch_id on the new row, unlike
--    sessions_insert right above it. Without a matching `with check`, a
--    trainer could re-parent their own session onto ANY branch_id
--    (including another organization's), and it would then show up in that
--    org's calendar/reports — a cross-tenant data-injection path. Fix: give
--    it the same with check sessions_insert already has.
--
-- 2. complete_and_advance_package() is only ever meant to be called from
--    bump_member_package_usage()'s trigger context (itself security
--    definer), never directly by a client — but Postgres grants EXECUTE to
--    PUBLIC by default on new functions, so any authenticated user could
--    currently call it directly via RPC with an arbitrary member_id and
--    tamper with another organization's package state. Revoking direct
--    execute doesn't affect the trigger path: that call happens from
--    inside another SECURITY DEFINER function, which runs as the function
--    owner regardless of what's granted to `authenticated`/`anon`.

drop policy if exists sessions_update on sessions;
create policy sessions_update on sessions for update
  using (
    (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = sessions.branch_id and b.organization_id = auth_organization_id()))
    or (auth_role() = 'trainer' and trainer_id = auth.uid())
  )
  with check (
    (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = sessions.branch_id and b.organization_id = auth_organization_id()))
    or (auth_role() = 'trainer' and trainer_id = auth.uid() and branch_id = auth_branch_id())
  );

revoke execute on function complete_and_advance_package(uuid) from public, authenticated, anon;

-- 3. Basic abuse control for the anonymous, unauthenticated
--    create-organization signup endpoint: no RLS policies at all (only the
--    service-role key used by the Edge Function can touch it, and that key
--    already bypasses RLS — this table is never queried from the client).
create table if not exists org_signup_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);
create index if not exists org_signup_attempts_ip_idx on org_signup_attempts (ip, created_at);
alter table org_signup_attempts enable row level security;
