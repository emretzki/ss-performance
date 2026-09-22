import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MobileBranchBar } from "./MobileBranchBar";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const { profile } = useAuth();
  if (!profile) return null;

  return (
    <div className="flex h-[100dvh] flex-col lg:flex-row">
      <Sidebar role={profile.role} />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
      <MobileBranchBar />
      <MobileNav role={profile.role} />
    </div>
  );
}
