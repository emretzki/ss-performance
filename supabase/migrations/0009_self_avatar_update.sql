-- Same gap as 0008, for avatar_url: uploadAvatar() writes directly to
-- profiles via the client, which only owner/super_admin can do under
-- profiles_write. A trainer's own avatar upload was silently failing RLS
-- (never noticed because an owner testing it can write any row in their org,
-- including their own). Narrow security-definer function, same pattern.

create or replace function update_own_avatar_url(new_avatar_url text) returns void as $$
  update profiles set avatar_url = new_avatar_url where id = auth.uid();
$$ language sql security definer set search_path = public;

grant execute on function update_own_avatar_url(text) to authenticated;
