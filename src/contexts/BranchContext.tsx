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

const STORAGE_KEY = "sportscience-active-branch";

export function BranchProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { data: branches = [] } = useQuery({ queryKey: ["branches"], queryFn: listBranches });
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);

  const canSwitchBranch = profile?.role === "super_admin";

  useEffect(() => {
    if (!profile) return;
    if (!canSwitchBranch) {
      setActiveBranchIdState(profile.branchId);
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setActiveBranchIdState(stored);
    } else if (branches.length > 0) {
      setActiveBranchIdState(branches[0].id);
    }
  }, [profile, canSwitchBranch, branches]);

  const setActiveBranchId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
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
