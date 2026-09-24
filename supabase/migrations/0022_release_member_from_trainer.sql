-- A trainer has no write access to members at all (members_write is
-- owner/super_admin only, see 0004) — narrow, single-purpose RPC instead of
-- broadening that: lets a trainer release ONLY a member currently assigned
-- to themselves (self-service "artık bu üyeye ders vermiyorum"), nothing
-- else about the member. Owner/super_admin can also call it (for the same
-- member-detail "release" action from their side), scoped to their org.
create or replace function release_member_from_trainer(target_member_id uuid) returns void as $$
declare
  m members%rowtype;
begin
  select * into m from members where id = target_member_id;
  if not found then
    raise exception 'Üye bulunamadı.';
  end if;

  if auth_role() = 'trainer' and m.assigned_trainer_id = auth.uid() then
    update members set assigned_trainer_id = null where id = target_member_id;
  elsif auth_role() in ('owner', 'super_admin')
    and exists (select 1 from branches b where b.id = m.branch_id and b.organization_id = auth_organization_id())
  then
    update members set assigned_trainer_id = null where id = target_member_id;
  else
    raise exception 'Bu işlem için yetkin yok.';
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function release_member_from_trainer(uuid) to authenticated;
