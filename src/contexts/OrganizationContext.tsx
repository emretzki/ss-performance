import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyOrganization } from "@/lib/api";
import { deriveAccentRamp } from "@/lib/color";
import { useAuth } from "./AuthContext";
import type { Organization } from "@/lib/types";

interface OrganizationContextValue {
  organization: Organization | null;
  refreshOrganization: () => void;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const qc = useQueryClient();

  const { data: organization = null } = useQuery({
    queryKey: ["organization", profile?.organizationId],
    queryFn: () => getMyOrganization(profile!.organizationId),
    enabled: Boolean(profile?.organizationId),
  });

  useEffect(() => {
    const root = document.documentElement;
    if (!organization) return;
    const ramp = deriveAccentRamp(organization.accentColor);
    root.style.setProperty("--color-gold", ramp.accent);
    root.style.setProperty("--color-gold-deep", ramp.accentDeep);
    root.style.setProperty("--color-gold-soft", ramp.accentSoft);
    root.style.setProperty("--color-gold-tint", ramp.accentTint);
    return () => {
      root.style.removeProperty("--color-gold");
      root.style.removeProperty("--color-gold-deep");
      root.style.removeProperty("--color-gold-soft");
      root.style.removeProperty("--color-gold-tint");
    };
  }, [organization]);

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organization,
      refreshOrganization: () => qc.invalidateQueries({ queryKey: ["organization", profile?.organizationId] }),
    }),
    [organization, qc, profile?.organizationId],
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganization must be used within OrganizationProvider");
  return ctx;
}
