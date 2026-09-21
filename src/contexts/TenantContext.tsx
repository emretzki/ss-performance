import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOrganizationBySlug } from "@/lib/api";
import { getTenantSlugFromHostname } from "@/lib/tenant";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { PublicOrgBranding } from "@/lib/types";

type TenantState =
  | { status: "landing" }
  | { status: "loading" }
  | { status: "not-found"; slug: string }
  | { status: "ready"; slug: string | null; organization: PublicOrgBranding | null };

const TenantContext = createContext<TenantState | null>(null);

// Real subdomains only exist against the live gymkoc.com deployment. In mock
// mode (no Supabase configured — local dev, or preview builds) there is no
// hostname to resolve, so we skip straight to "ready" and let the existing
// demo-account picker on the login screen do its job; append ?landing=1 to
// preview the universal landing page instead.
function resolveSlug(): string | "mock" | null {
  if (!isSupabaseConfigured) {
    const params = new URLSearchParams(window.location.search);
    return params.get("landing") === "1" ? null : "mock";
  }
  return getTenantSlugFromHostname(window.location.hostname);
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const slug = useMemo(resolveSlug, []);

  const { data: organization, isLoading } = useQuery({
    queryKey: ["tenant-organization", slug],
    queryFn: () => getOrganizationBySlug(slug as string),
    enabled: slug !== null && slug !== "mock",
  });

  const state: TenantState = useMemo(() => {
    if (slug === null) return { status: "landing" };
    if (slug === "mock") return { status: "ready", slug: null, organization: null };
    if (isLoading) return { status: "loading" };
    if (!organization) return { status: "not-found", slug };
    return { status: "ready", slug, organization };
  }, [slug, isLoading, organization]);

  return <TenantContext.Provider value={state}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
