-- Package history: a member's finished packages get archived (not silently
-- overwritten), and a package paid for in advance can be queued as
-- "upcoming" and auto-activated the moment the current one finishes.
--
-- payments already has one row per package purchase/renewal (see 0012); this
-- promotes it into the actual package ledger by giving each row a lifecycle:
--   'active'    — the package members.package_* currently tracks
--   'upcoming'  — paid for, queued, not started yet
--   'completed' — finished and archived; sessions_used freezes its final count
--
-- At most one 'active' row per member, enforced by a partial unique index —
-- that's the single package the session-logging trigger is allowed to move.

alter table payments add column if not exists status text not null default 'completed';
alter table payments add constraint payments_status_check check (status in ('active', 'upcoming', 'completed'));
alter table payments add column if not exists sessions_used int;

-- Backfill: best-effort match each member's current package to the payment
-- row that funded it (by name + session count) and mark it active; every
-- other existing row for that member is left completed.
update payments p set status = 'active'
where p.id in (
  select distinct on (p2.member_id) p2.id
  from payments p2
  join members m on m.id = p2.member_id
  where m.package_total_sessions is not null
    and m.package_name is not distinct from p2.package_name
    and m.package_total_sessions is not distinct from p2.total_sessions
  order by p2.member_id, p2.paid_at desc, p2.created_at desc
);

create unique index if not exists payments_one_active_per_member on payments (member_id) where status = 'active';

-- Archives the member's active package once its sessions are used up, and
-- promotes the earliest queued upcoming package (if any) to active in its
-- place. Called from the session-logging trigger below, and from
-- addMemberPackage's "start now" path can't call this directly (that path
-- archives explicitly instead, since it's an early switch, not a natural
-- completion) — this one only fires on actually running out of sessions.
create or replace function complete_and_advance_package(p_member_id uuid) returns void as $$
declare
  m members%rowtype;
  next_pkg payments%rowtype;
begin
  select * into m from members where id = p_member_id;
  if m.package_total_sessions is null or m.package_sessions_used < m.package_total_sessions then
    return;
  end if;

  update payments set status = 'completed', sessions_used = m.package_sessions_used
    where member_id = p_member_id and status = 'active';

  select * into next_pkg from payments
    where member_id = p_member_id and status = 'upcoming'
    order by paid_at asc, created_at asc
    limit 1;

  if found then
    update payments set status = 'active' where id = next_pkg.id;
    update members set
      package_name = next_pkg.package_name,
      package_total_price = next_pkg.amount,
      package_total_sessions = next_pkg.total_sessions,
      package_sessions_used = 0,
      package_paid_at = next_pkg.paid_at
    where id = p_member_id;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function bump_member_package_usage() returns trigger as $$
declare
  target_member uuid;
  delta int := 0;
  old_target uuid;
  old_delta int := 0;
begin
  if (TG_OP = 'INSERT') then
    if new.member_id is not null and new.status <> 'cancelled' then
      target_member := new.member_id;
      delta := 1;
    end if;
  elsif (TG_OP = 'UPDATE') then
    if old.member_id is distinct from new.member_id then
      if old.member_id is not null and old.status <> 'cancelled' then
        old_target := old.member_id;
        old_delta := -1;
      end if;
      if new.member_id is not null and new.status <> 'cancelled' then
        target_member := new.member_id;
        delta := 1;
      end if;
    elsif old.status <> 'cancelled' and new.status = 'cancelled' and new.member_id is not null then
      target_member := new.member_id;
      delta := -1;
    elsif old.status = 'cancelled' and new.status <> 'cancelled' and new.member_id is not null then
      target_member := new.member_id;
      delta := 1;
    end if;
  elsif (TG_OP = 'DELETE') then
    if old.member_id is not null and old.status <> 'cancelled' then
      old_target := old.member_id;
      old_delta := -1;
    end if;
  end if;

  if old_target is not null and old_delta <> 0 then
    update members set package_sessions_used = greatest(0, package_sessions_used + old_delta) where id = old_target;
    perform complete_and_advance_package(old_target);
  end if;

  if target_member is not null and delta <> 0 then
    update members set package_sessions_used = greatest(0, package_sessions_used + delta) where id = target_member;
    perform complete_and_advance_package(target_member);
  end if;

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
