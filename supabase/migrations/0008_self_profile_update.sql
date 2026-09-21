-- Lets any signed-in user (PT, owner, super_admin) edit their own name and
-- phone number. The existing profiles_write policy only allows owner/super_admin
-- to write profiles at all, and even a permissive "id = auth.uid()" self-update
-- policy would be unsafe on its own: RLS is row-level, not column-level, so it
-- would also let someone rewrite their own role/organization_id. A narrow
-- security-definer function is the safe version of the same thing — it only
-- ever touches full_name/phone, and only for the caller's own row.

create or replace function update_own_profile(new_full_name text, new_phone text) returns void as $$
  update profiles
  set full_name = coalesce(nullif(trim(new_full_name), ''), full_name),
      phone = nullif(trim(new_phone), '')
  where id = auth.uid();
$$ language sql security definer set search_path = public;

grant execute on function update_own_profile(text, text) to authenticated;
