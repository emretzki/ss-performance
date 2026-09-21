const ROOT_HOSTS = ["gymkoc.com", "www.gymkoc.com"];

/** Returns the tenant slug from a *.gymkoc.com hostname, or null for the root domain / any other host (vercel.app preview, localhost). */
export function getTenantSlugFromHostname(hostname: string): string | null {
  if (ROOT_HOSTS.includes(hostname)) return null;
  if (!hostname.endsWith(".gymkoc.com")) return null;
  const sub = hostname.slice(0, -".gymkoc.com".length);
  if (!sub || sub === "www") return null;
  return sub;
}

export function slugify(input: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
  return input
    .toLowerCase()
    .replace(/[çğıöşü]/g, (c) => map[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function tenantUrl(slug: string, path = "/login"): string {
  return `https://${slug}.gymkoc.com${path}`;
}

// A subdomain is a different origin, so a Supabase session established at
// the root domain isn't visible there. We hand the session's tokens across
// once, in the URL fragment (never sent to any server, unlike a query
// string) — the receiving side reads them, calls setSession, then strips
// the fragment immediately.
// Custom param names (not Supabase's own access_token/refresh_token/type
// hash format) so supabase-js's built-in detectSessionInUrl never touches
// this — that mechanism is already used by the password-recovery email link
// and must keep working untouched.
export function tenantHandoffUrl(slug: string, accessToken: string, refreshToken: string, path = "/calendar"): string {
  const hash = `sb_at=${encodeURIComponent(accessToken)}&sb_rt=${encodeURIComponent(refreshToken)}`;
  return `https://${slug}.gymkoc.com${path}#${hash}`;
}

export function readSessionHandoffFromHash(): { accessToken: string; refreshToken: string } | null {
  if (!window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("sb_at");
  const refreshToken = params.get("sb_rt");
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function clearHandoffHash(): void {
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}
