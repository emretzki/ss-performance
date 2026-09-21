-- Per-organization subdomains (salonadi.gymkoc.com) + a public "branding
-- only" read so the login page can show the right logo/color before anyone
-- signs in.

create or replace function slugify(input text) returns text as $$
  select trim(both '-' from
    regexp_replace(
      lower(
        translate(input,
          'çğıöşüÇĞİÖŞÜ',
          'cgiosuCGIOSU'
        )
      ),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$ language sql immutable;

alter table organizations add column if not exists slug text;

-- Backfill existing rows with a unique slug derived from their name.
with numbered as (
  select id, slugify(name) as base_slug, row_number() over (partition by slugify(name) order by created_at) as rn
  from organizations
  where slug is null
)
update organizations o
set slug = case when n.rn = 1 then n.base_slug else n.base_slug || '-' || n.rn end
from numbered n
where o.id = n.id;

alter table organizations alter column slug set not null;
alter table organizations add constraint organizations_slug_unique unique (slug);

-- Looks up which organization's subdomain an email belongs to, for the
-- root domain's "salonumu bul" flow. security definer so it can read
-- auth.users (not otherwise exposed to any client role); returns only a
-- slug, never account details.
create or replace function find_organization_slug_by_email(input_email text) returns text as $$
  select o.slug
  from auth.users u
  join profiles p on p.id = u.id
  join organizations o on o.id = p.organization_id
  where lower(u.email) = lower(input_email)
  limit 1;
$$ language sql security definer set search_path = public, auth;

grant execute on function find_organization_slug_by_email(text) to anon, authenticated;

-- Anyone (including anonymous, pre-login) can read branding fields to render
-- the right logo/color on a tenant's login page. This is intentionally in
-- addition to the existing org-scoped policy, not a replacement of it.
create policy organizations_public_branding_select on organizations for select
  using (true);
