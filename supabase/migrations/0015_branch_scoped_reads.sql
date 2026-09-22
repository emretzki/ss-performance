-- Multi-branch tightening: a trainer should only ever be able to read their
-- own branch's data — 0004 scoped select policies to the whole organization
-- (so an owner sees every branch), which also let a trainer's own JWT read
-- other branches in the same org via direct REST, even though the UI never
-- surfaced it. Split each of these into "owner/super_admin: org-wide" vs
-- "trainer: own branch only".
--
-- Also: payments/branch_expenses (financial ledger) were readable org-wide
-- by anyone in the org, including trainers — the Reports screen's own client
-- fetches the whole branch's payments/expenses just to compute a trainer's
-- personal slice locally, meaning a trainer's browser already receives full
-- branch financial totals over the wire today, unused but inspectable via
-- devtools. Restrict these two to owner/super_admin only; nothing in the
-- trainer-facing report actually reads payments/branch_expenses directly.

drop policy if exists branches_select on branches;
create policy branches_select on branches for select
  using (
    (auth_role() in ('super_admin', 'owner') and organization_id = auth_organization_id())
    or (auth_role() = 'trainer' and id = auth_branch_id())
  );

drop policy if exists trainers_select on trainers;
create policy trainers_select on trainers for select
  using (
    (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = trainers.branch_id and b.organization_id = auth_organization_id()))
    or (auth_role() = 'trainer' and branch_id = auth_branch_id())
  );

drop policy if exists members_select on members;
create policy members_select on members for select
  using (
    (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = members.branch_id and b.organization_id = auth_organization_id()))
    or (auth_role() = 'trainer' and branch_id = auth_branch_id())
  );

drop policy if exists sessions_select on sessions;
create policy sessions_select on sessions for select
  using (
    (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = sessions.branch_id and b.organization_id = auth_organization_id()))
    or (auth_role() = 'trainer' and branch_id = auth_branch_id())
  );

drop policy if exists payments_select on payments;
create policy payments_select on payments for select
  using (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = payments.branch_id and b.organization_id = auth_organization_id()));

drop policy if exists branch_expenses_select on branch_expenses;
create policy branch_expenses_select on branch_expenses for select
  using (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = branch_expenses.branch_id and b.organization_id = auth_organization_id()));
