-- Cancelling used to always credit the session back to the member's
-- package, regardless of when it was cancelled. Confirmed with the owner:
-- that's only correct if the class hadn't started yet — once it has
-- (in_progress/done, now reached automatically off the clock, see
-- migration 0020), the time was already used, so a later cancellation
-- shouldn't hand the member a free session back.
--
-- Restoring (uncancelling) has to mirror whichever of those happened, not
-- just always re-charge — a session cancelled post-start was never
-- refunded, so restoring it must not charge it a second time. That
-- requires remembering, at cancel time, whether a refund happened; deriving
-- it later from starts_at vs now() wouldn't work because by the time
-- anyone restores a session, its start time is virtually always in the
-- past regardless of which case it was.
alter table sessions add column if not exists cancel_refunded boolean;

-- Needs to be BEFORE (not AFTER, as it was) so it can set NEW.cancel_refunded
-- itself; an AFTER trigger's changes to NEW are never persisted.
drop trigger if exists sessions_bump_member_package on sessions;

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
      if old.starts_at > now() then
        target_member := new.member_id;
        delta := -1;
        new.cancel_refunded := true;
      else
        new.cancel_refunded := false;
      end if;
    elsif old.status = 'cancelled' and new.status <> 'cancelled' and new.member_id is not null then
      if coalesce(old.cancel_refunded, false) then
        target_member := new.member_id;
        delta := 1;
      end if;
      new.cancel_refunded := null;
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

create trigger sessions_bump_member_package
  before insert or update or delete on sessions
  for each row execute function bump_member_package_usage();
