-- Every member should belong to a specific PT (their "kendi PT'si"), so a
-- PT's profile page can show their own roster and the owner can see who's
-- carrying how many students. Nullable at the column level only so existing
-- rows don't break on migrate; the app enforces "required" at entry time.
alter table members
  add column assigned_trainer_id uuid references trainers(id) on delete set null;

-- Session handoff: a trainer transferring one of their OWN booked sessions
-- to a branch colleague changes sessions.trainer_id to someone other than
-- themselves. The previous sessions_update with-check required
-- `trainer_id = auth.uid()` on the NEW row (not just the old one), which
-- made this impossible — the only way to change trainer_id at all was to
-- keep it equal to yourself. Relax the with-check so a trainer may set
-- trainer_id to any trainer in their own branch, while the using clause
-- still requires the row to currently be theirs — so a trainer can hand
-- their own session to a colleague, but can never reach into a colleague's
-- session to begin with.
drop policy if exists sessions_update on sessions;
create policy sessions_update on sessions for update
  using (
    (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = sessions.branch_id and b.organization_id = auth_organization_id()))
    or (auth_role() = 'trainer' and trainer_id = auth.uid())
  )
  with check (
    (auth_role() in ('super_admin', 'owner') and exists (select 1 from branches b where b.id = sessions.branch_id and b.organization_id = auth_organization_id()))
    or (
      auth_role() = 'trainer'
      and branch_id = auth_branch_id()
      and exists (select 1 from trainers t where t.id = sessions.trainer_id and t.branch_id = auth_branch_id())
    )
  );
