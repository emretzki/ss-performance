-- Multi-tenant conversion: independent organizations (gyms), each fully
-- isolated from every other one. Existing SportScience data is preserved by
-- wrapping it into a single new organization automatically.

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  accent_color text not null default '#96792C',
  owner_auth_id uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

-- Wrap any pre-existing data into one organization, owned by whichever
-- super_admin/owner account already exists. No-op on a fresh project.
do $$
declare
  legacy_org_id uuid;
  legacy_owner uuid;
begin
  if exists (select 1 from profiles limit 1) and not exists (select 1 from organizations limit 1) then
    select id into legacy_owner from profiles where role in ('super_admin', 'owner') order by created_at asc limit 1;
    if legacy_owner is null then
      select id into legacy_owner from profiles order by created_at asc limit 1;
    end if;

    insert into organizations (name, accent_color, owner_auth_id)
    values ('SportScience', '#96792C', legacy_owner)
    returning id into legacy_org_id;

    alter table branches add column if not exists organization_id uuid references organizations (id);
    update branches set organization_id = legacy_org_id where organization_id is null;

    alter table profiles add column if not exists organization_id uuid references organizations (id);
    update profiles set organization_id = legacy_org_id where organization_id is null;
  end if;
end $$;

-- Ensure the columns exist even on a brand-new project with no legacy rows.
alter table branches add column if not exists organization_id uuid references organizations (id);
alter table branches add column if not exists max_concurrent_sessions int not null default 3;
alter table profiles add column if not exists organization_id uuid references organizations (id);

alter table branches alter column organization_id set not null;
alter table profiles alter column organization_id set not null;

-- Idman türleri (workout types), per organization.
create table if not exists workout_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  color text not null default '#8A8478',
  created_at timestamptz not null default now()
);

-- Seed a default type for every existing organization so old sessions have
-- something to backfill onto.
insert into workout_types (organization_id, name, color)
select o.id, 'Bire bir PT', '#96792C'
from organizations o
where not exists (select 1 from workout_types wt where wt.organization_id = o.id);

-- Live session lifecycle + workout classification.
alter table sessions add column if not exists workout_type_id uuid references workout_types (id);
alter table sessions add column if not exists started_at timestamptz;
alter table sessions add column if not exists ended_at timestamptz;

alter type session_status add value if not exists 'in_progress';

update sessions s
set workout_type_id = wt.id
from branches b
join workout_types wt on wt.organization_id = b.organization_id and wt.name = 'Bire bir PT'
where s.branch_id = b.id and s.workout_type_id is null;

-- Org-aware auth helper, alongside the existing auth_role()/auth_branch_id().
create or replace function auth_organization_id() returns uuid as $$
  select organization_id from profiles where id = auth.uid();
$$ language sql stable security definer;

-- Capacity guard now reads the branch's own configurable limit.
create or replace function check_slot_capacity() returns trigger as $$
declare
  overlapping_count int;
  cap int;
begin
  if new.status = 'cancelled' then
    return new;
  end if;

  select max_concurrent_sessions into cap from branches where id = new.branch_id;
  cap := coalesce(cap, 3);

  select count(*) into overlapping_count
  from sessions s
  where s.branch_id = new.branch_id
    and s.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    and s.status <> 'cancelled'
    and s.starts_at < (new.starts_at + make_interval(mins => new.duration_min))
    and (s.starts_at + make_interval(mins => s.duration_min)) > new.starts_at;

  if overlapping_count >= cap then
    raise exception 'capacity_exceeded: slot already has % sessions', cap using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql;

-- Auto-complete sessions left running past their 1-hour cap. Called by a
-- scheduled Cron Job (see README) every few minutes.
create or replace function close_stale_sessions() returns void as $$
  update sessions
  set status = 'done', ended_at = started_at + interval '1 hour'
  where status = 'in_progress' and started_at < now() - interval '1 hour';
$$ language sql;

-- ---------------------------------------------------------------------------
-- RLS: replace branch-only scoping with organization-wide scoping so an
-- owner sees every branch in their org, while data never crosses org lines.
-- ---------------------------------------------------------------------------

drop policy if exists branches_select on branches;
drop policy if exists branches_write on branches;
drop policy if exists profiles_select on profiles;
drop policy if exists profiles_write on profiles;
drop policy if exists trainers_select on trainers;
drop policy if exists trainers_write on trainers;
drop policy if exists members_select on members;
drop policy if exists members_write on members;
drop policy if exists sessions_select on sessions;
drop policy if exists sessions_insert on sessions;
drop policy if exists sessions_update on sessions;
drop policy if exists sessions_delete on sessions;

create policy branches_select on branches for select
  using (organization_id = auth_organization_id());
create policy branches_write on branches for all
  using (auth_role() in ('super_admin', 'owner') and organization_id = auth_organization_id())
  with check (auth_role() in ('super_admin', 'owner') and organization_id = auth_organization_id());

create policy profiles_select on profiles for select
  using (organization_id = auth_organization_id() or id = auth.uid());
create policy profiles_write on profiles for all
  using (auth_role() in ('super_admin', 'owner') and organization_id = auth_organization_id())
  with check (auth_role() in ('super_admin', 'owner') and organization_id = auth_organization_id());

create policy trainers_select on trainers for select
  using (exists (select 1 from branches b where b.id = trainers.branch_id and b.organization_id = auth_organization_id()));
create policy trainers_write on trainers for all
  using (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = trainers.branch_id and b.organization_id = auth_organization_id()))
  with check (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = trainers.branch_id and b.organization_id = auth_organization_id()));

create policy members_select on members for select
  using (exists (select 1 from branches b where b.id = members.branch_id and b.organization_id = auth_organization_id()));
create policy members_write on members for all
  using (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = members.branch_id and b.organization_id = auth_organization_id()))
  with check (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = members.branch_id and b.organization_id = auth_organization_id()));

create policy sessions_select on sessions for select
  using (exists (select 1 from branches b where b.id = sessions.branch_id and b.organization_id = auth_organization_id()));

create policy sessions_insert on sessions for insert
  with check (
    (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = sessions.branch_id and b.organization_id = auth_organization_id()))
    or (auth_role() = 'trainer' and trainer_id = auth.uid() and branch_id = auth_branch_id())
  );

create policy sessions_update on sessions for update
  using (
    (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = sessions.branch_id and b.organization_id = auth_organization_id()))
    or (auth_role() = 'trainer' and trainer_id = auth.uid())
  );

create policy sessions_delete on sessions for delete
  using (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = sessions.branch_id and b.organization_id = auth_organization_id()));

-- workout_types: everyone in the org can read (calendar/report pickers),
-- only owner/super_admin manage the roster.
alter table workout_types enable row level security;

create policy workout_types_select on workout_types for select
  using (organization_id = auth_organization_id());
create policy workout_types_write on workout_types for all
  using (auth_role() in ('super_admin', 'owner') and organization_id = auth_organization_id())
  with check (auth_role() in ('super_admin', 'owner') and organization_id = auth_organization_id());

-- organizations: the org's own members can read it (branding, settings);
-- only its owner can edit it.
alter table organizations enable row level security;

create policy organizations_select on organizations for select
  using (id = auth_organization_id());
create policy organizations_write on organizations for all
  using (auth_role() in ('super_admin', 'owner') and id = auth_organization_id())
  with check (auth_role() in ('super_admin', 'owner') and id = auth_organization_id());

-- Storage bucket for org logos, same per-uid-folder pattern as avatars.
insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

create policy org_logos_public_read on storage.objects for select
  using (bucket_id = 'org-logos');

create policy org_logos_owner_write on storage.objects for insert
  with check (bucket_id = 'org-logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy org_logos_owner_update on storage.objects for update
  using (bucket_id = 'org-logos' and (storage.foldername(name))[1] = auth.uid()::text);
