-- The organizations_public_branding_select policy from 0006 used
-- `using (true)`, which is row-level: it made every COLUMN of every
-- organization readable to anyone, not just the branding fields the comment
-- said it was for (name/logo/accent/slug). owner_auth_id and created_at were
-- an unintended information disclosure (any org's owner auth id was
-- enumerable by anyone, authenticated or not).
--
-- Fix: drop that blanket policy, so organizations reverts to org-scoped-only
-- (organizations_select: id = auth_organization_id()). Pre-login branding now
-- goes through a narrow security-definer function that only ever returns the
-- five branding-safe columns, for any single slug — nothing else on the row.

drop policy if exists organizations_public_branding_select on organizations;

create or replace function public_organization_branding(org_slug text)
returns table (
  id uuid,
  name text,
  slug text,
  logo_url text,
  accent_color text
) as $$
  select id, name, slug, logo_url, accent_color
  from organizations
  where slug = org_slug;
$$ language sql stable security definer set search_path = public;

grant execute on function public_organization_branding(text) to anon, authenticated;
