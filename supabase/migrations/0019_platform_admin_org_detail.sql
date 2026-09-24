-- Platform admin dashboard drill-down: the org list already showed
-- aggregate counts (branch/trainer/session totals) but no way to see WHICH
-- branches, WHICH PTs, or how many sessions each PT personally logged —
-- exactly what's needed to actually track usage per salon. One JSON-
-- returning RPC per organization keeps this to a single round trip.
create or replace function platform_admin_get_organization_detail(target_org_id uuid)
returns json as $$
  select json_build_object(
    'branches', (
      select coalesce(json_agg(json_build_object(
        'id', b.id,
        'name', b.name,
        'address', b.address,
        'max_concurrent_sessions', b.max_concurrent_sessions,
        'member_count', (select count(*) from members m where m.branch_id = b.id)
      ) order by b.created_at), '[]'::json)
      from branches b where b.organization_id = target_org_id
    ),
    'trainers', (
      select coalesce(json_agg(json_build_object(
        'id', t.id,
        'full_name', p.full_name,
        'phone', p.phone,
        'role', p.role,
        'branch_name', b.name,
        'commission_rate', t.commission_rate,
        'session_count', (select count(*) from sessions s where s.trainer_id = t.id and s.status <> 'cancelled'),
        'session_count_this_month', (
          select count(*) from sessions s
          where s.trainer_id = t.id and s.status <> 'cancelled' and s.starts_at >= date_trunc('month', now())
        )
      ) order by p.full_name), '[]'::json)
      from trainers t
      join profiles p on p.id = t.id
      join branches b on b.id = t.branch_id
      where p.organization_id = target_org_id
    ),
    'member_count', (
      select count(*) from members m join branches b on b.id = m.branch_id where b.organization_id = target_org_id
    ),
    'total_revenue', (
      select coalesce(sum(py.amount), 0) from payments py join branches b on b.id = py.branch_id where b.organization_id = target_org_id
    )
  )
  where is_platform_admin();
$$ language sql stable security definer set search_path = public, auth;

grant execute on function platform_admin_get_organization_detail(uuid) to authenticated;
