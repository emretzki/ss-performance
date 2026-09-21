-- Cash-basis revenue: ciro is recognized on the month a package is PAID for
-- (fees are collected in bulk up front), not spread across whichever months
-- its sessions happen to fall in. A flat "package_paid_at" on members alone
-- would break once a member renews (their earlier payment date is gone), so
-- payments get their own append-only table instead — one row per
-- assignment/renewal, never mutated, so an earlier month's ciro stays
-- correct no matter how many times a member has renewed since.

alter table members add column if not exists package_paid_at date;

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members (id) on delete cascade,
  branch_id uuid not null references branches (id) on delete cascade,
  amount numeric not null,
  package_name text,
  total_sessions int,
  paid_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists payments_branch_paid_idx on payments (branch_id, paid_at);

alter table payments enable row level security;

create policy payments_select on payments for select
  using (exists (select 1 from branches b where b.id = payments.branch_id and b.organization_id = auth_organization_id()));
create policy payments_write on payments for all
  using (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = payments.branch_id and b.organization_id = auth_organization_id()))
  with check (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = payments.branch_id and b.organization_id = auth_organization_id()));

-- Standing monthly costs (kira, elektrik, vb.) the owner enters once; every
-- one of them is treated as recurring every month, not a per-month ledger.
create table if not exists branch_expenses (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id) on delete cascade,
  name text not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);

alter table branch_expenses enable row level security;

create policy branch_expenses_select on branch_expenses for select
  using (exists (select 1 from branches b where b.id = branch_expenses.branch_id and b.organization_id = auth_organization_id()));
create policy branch_expenses_write on branch_expenses for all
  using (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = branch_expenses.branch_id and b.organization_id = auth_organization_id()))
  with check (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = branch_expenses.branch_id and b.organization_id = auth_organization_id()));
