import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { listBranches } from "@/lib/api";
import { useAuth } from "./AuthContext";
import type { Branch } from "@/lib/types";

interface BranchContextValue {
  branches: Branch[];
  activeBranchId: string | null;
  setActiveBranchId: (id: string) => void;
  canSwitchBranch: boolean;
}

const BranchContext = createContext<BranchContextValue | null>(null);

const STORAGE_PREFIX = "active-branch:";

export function BranchProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { data: branches = [] } = useQuery({
    queryKey: ["branches", profile?.organizationId],
    queryFn: () => listBranches(profile?.organizationId),
    enabled: Boolean(profile),
  });
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);

  const canSwitchBranch = profile?.role === "super_admin" || profile?.role === "owner";
  const storageKey = profile ? `${STORAGE_PREFIX}${profile.id}` : null;

  useEffect(() => {
    if (!profile) return;
    if (!canSwitchBranch) {
      setActiveBranchIdState(profile.branchId);
      return;
    }
    // Only trust a stored branch id if it actually belongs to THIS user's
    // (org-scoped) branch list — otherwise a stale value from a previously
    // signed-in account on the same browser could leak across tenants.
    const stored = storageKey ? localStorage.getItem(storageKey) : null;
    if (stored && branches.some((b) => b.id === stored)) {
      setActiveBranchIdState(stored);
    } else if (branches.length > 0) {
      setActiveBranchIdState(branches[0].id);
    } else {
      setActiveBranchIdState(null);
    }
  }, [profile, canSwitchBranch, branches, storageKey]);

  const setActiveBranchId = (id: string) => {
    if (storageKey) localStorage.setItem(storageKey, id);
    setActiveBranchIdState(id);
  };

  const value = useMemo(
    () => ({ branches, activeBranchId, setActiveBranchId, canSwitchBranch }),
    [branches, activeBranchId, canSwitchBranch],
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
}
