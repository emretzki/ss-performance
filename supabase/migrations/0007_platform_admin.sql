-- Platform-level admin: one (or a few) accounts that are not scoped to any
-- single organization, and can read across every organization for a
-- cross-tenant usage overview at gymkoc.com/admin.

create table if not exists platform_admins (
  auth_user_id uuid primary key references auth.users (id),
  created_at timestamptz not null default now()
);

alter table platform_admins enable row level security;

create policy platform_admins_self_select on platform_admins for select
  using (auth_user_id = auth.uid());

create or replace function is_platform_admin() returns boolean as $$
  select exists (select 1 from platform_admins where auth_user_id = auth.uid());
$$ language sql stable security definer set search_path = public;

-- Additive read-only policies: platform admins can see every row, on top of
-- (not instead of) the existing org-scoped policies.
create policy organizations_platform_admin_select on organizations for select
  using (is_platform_admin());
create policy branches_platform_admin_select on branches for select
  using (is_platform_admin());
create policy profiles_platform_admin_select on profiles for select
  using (is_platform_admin());
create policy sessions_platform_admin_select on sessions for select
  using (is_platform_admin());
create policy workout_types_platform_admin_select on workout_types for select
  using (is_platform_admin());

-- One RPC that returns the whole admin dashboard's row set in a single call:
-- per-organization counts plus the owner's email (auth.users is otherwise
-- unreachable from the client). Gated by is_platform_admin() itself, so a
-- non-admin caller gets zero rows rather than an error.
create or replace function platform_admin_list_organizations()
returns table (
  id uuid,
  name text,
  slug text,
  created_at timestamptz,
  owner_email text,
  branch_count bigint,
  trainer_count bigint,
  session_count bigint,
  session_count_this_month bigint,
  last_session_at timestamptz
) as $$
  select
    o.id,
    o.name,
    o.slug,
    o.created_at,
    u.email,
    (select count(*) from branches b where b.organization_id = o.id),
    (select count(*) from profiles p where p.organization_id = o.id and p.role = 'trainer'),
    (select count(*) from sessions s join branches b on b.id = s.branch_id where b.organization_id = o.id),
    (select count(*) from sessions s join branches b on b.id = s.branch_id
       where b.organization_id = o.id and s.starts_at >= date_trunc('month', now())),
    (select max(s.created_at) from sessions s join branches b on b.id = s.branch_id where b.organization_id = o.id)
  from organizations o
  join auth.users u on u.id = o.owner_auth_id
  where is_platform_admin()
  order by o.created_at desc;
$$ language sql stable security definer set search_path = public, auth;

grant execute on function platform_admin_list_organizations() to authenticated;
