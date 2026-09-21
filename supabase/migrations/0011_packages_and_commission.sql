-- Member packages (free-form, no catalog) + per-trainer commission rate,
-- for revenue/profit reporting.

alter table members add column if not exists package_name text;
alter table members add column if not exists package_total_price numeric;
alter table members add column if not exists package_total_sessions int;
alter table members add column if not exists package_sessions_used int not null default 0;

alter table trainers add column if not exists commission_rate numeric not null default 50;
alter table trainers add constraint trainers_commission_rate_check check (commission_rate >= 0 and commission_rate <= 100);

-- Keep package_sessions_used in sync with real session activity server-side,
-- so it can never drift from what's actually booked regardless of which
-- client path creates/cancels/reassigns/deletes a session.
create or replace function bump_member_package_usage() returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    if new.member_id is not null and new.status <> 'cancelled' then
      update members set package_sessions_used = package_sessions_used + 1 where id = new.member_id;
    end if;
    return new;
  elsif (TG_OP = 'UPDATE') then
    if old.member_id is distinct from new.member_id then
      if old.member_id is not null and old.status <> 'cancelled' then
        update members set package_sessions_used = greatest(0, package_sessions_used - 1) where id = old.member_id;
      end if;
      if new.member_id is not null and new.status <> 'cancelled' then
        update members set package_sessions_used = package_sessions_used + 1 where id = new.member_id;
      end if;
    elsif old.status <> 'cancelled' and new.status = 'cancelled' and new.member_id is not null then
      update members set package_sessions_used = greatest(0, package_sessions_used - 1) where id = new.member_id;
    elsif old.status = 'cancelled' and new.status <> 'cancelled' and new.member_id is not null then
      update members set package_sessions_used = package_sessions_used + 1 where id = new.member_id;
    end if;
    return new;
  elsif (TG_OP = 'DELETE') then
    if old.member_id is not null and old.status <> 'cancelled' then
      update members set package_sessions_used = greatest(0, package_sessions_used - 1) where id = old.member_id;
    end if;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists sessions_bump_member_package on sessions;
create trigger sessions_bump_member_package
  after insert or update or delete on sessions
  for each row execute function bump_member_package_usage();
