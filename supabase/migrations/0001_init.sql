-- SportScience panel - initial schema
-- Multi-branch (multi-gym), role-based, capacity-constrained scheduling.

create extension if not exists "pgcrypto";

create type role as enum ('super_admin', 'owner', 'trainer');
create type session_status as enum ('scheduled', 'done', 'cancelled');

create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

-- profiles.id matches auth.users.id (created via trigger on signup, or manually by an admin)
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  branch_id uuid references branches (id) on delete set null,
  role role not null,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table trainers (
  id uuid primary key references profiles (id) on delete cascade,
  branch_id uuid not null references branches (id) on delete cascade,
  bio text,
  badge_color text not null default '#8A8478'
);

create table members (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id) on delete cascade,
  full_name text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id) on delete cascade,
  trainer_id uuid not null references trainers (id) on delete cascade,
  member_id uuid references members (id) on delete set null,
  member_name text,
  title text not null default 'Bire bir PT',
  starts_at timestamptz not null,
  duration_min int not null check (duration_min > 0 and duration_min <= 240),
  status session_status not null default 'scheduled',
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create index sessions_branch_time_idx on sessions (branch_id, starts_at);
create index trainers_branch_idx on trainers (branch_id);
create index members_branch_idx on members (branch_id);

-- Capacity guard: at most 3 overlapping non-cancelled sessions per branch.
create or replace function check_slot_capacity() returns trigger as $$
declare
  overlapping_count int;
begin
  if new.status = 'cancelled' then
    return new;
  end if;

  select count(*) into overlapping_count
  from sessions s
  where s.branch_id = new.branch_id
    and s.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    and s.status <> 'cancelled'
    and s.starts_at < (new.starts_at + make_interval(mins => new.duration_min))
    and (s.starts_at + make_interval(mins => s.duration_min)) > new.starts_at;

  if overlapping_count >= 3 then
    raise exception 'capacity_exceeded: slot already has 3 sessions' using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger sessions_capacity_guard
  before insert or update on sessions
  for each row execute function check_slot_capacity();

-- Helper: current user's role/branch, used by RLS policies below.
create or replace function auth_role() returns role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function auth_branch_id() returns uuid as $$
  select branch_id from profiles where id = auth.uid();
$$ language sql stable security definer;

alter table branches enable row level security;
alter table profiles enable row level security;
alter table trainers enable row level security;
alter table members enable row level security;
alter table sessions enable row level security;

-- branches: super_admin manages all, everyone else reads their own branch.
create policy branches_select on branches for select
  using (auth_role() = 'super_admin' or id = auth_branch_id());
create policy branches_write on branches for all
  using (auth_role() = 'super_admin') with check (auth_role() = 'super_admin');

-- profiles: readable within the same branch (or by super_admin); only super_admin/owner create/edit.
create policy profiles_select on profiles for select
  using (auth_role() = 'super_admin' or branch_id = auth_branch_id() or id = auth.uid());
create policy profiles_write on profiles for all
  using (auth_role() in ('super_admin', 'owner'))
  with check (auth_role() in ('super_admin', 'owner'));

-- trainers: everyone in the branch can see all trainers (the calendar needs this); only admin/owner manage roster.
create policy trainers_select on trainers for select
  using (auth_role() = 'super_admin' or branch_id = auth_branch_id());
create policy trainers_write on trainers for all
  using (auth_role() in ('super_admin', 'owner'))
  with check (auth_role() in ('super_admin', 'owner'));

-- members: branch-scoped, managed by owner/admin.
create policy members_select on members for select
  using (auth_role() = 'super_admin' or branch_id = auth_branch_id());
create policy members_write on members for all
  using (auth_role() in ('super_admin', 'owner'))
  with check (auth_role() in ('super_admin', 'owner'));

-- sessions: everyone in the branch can see all sessions (shared calendar).
-- Trainers may only create/update their own sessions; owner/admin can manage all.
create policy sessions_select on sessions for select
  using (auth_role() = 'super_admin' or branch_id = auth_branch_id());

create policy sessions_insert on sessions for insert
  with check (
    auth_role() in ('super_admin', 'owner')
    or (auth_role() = 'trainer' and trainer_id = auth.uid() and branch_id = auth_branch_id())
  );

create policy sessions_update on sessions for update
  using (
    auth_role() in ('super_admin', 'owner')
    or (auth_role() = 'trainer' and trainer_id = auth.uid())
  );

create policy sessions_delete on sessions for delete
  using (auth_role() in ('super_admin', 'owner'));
