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
