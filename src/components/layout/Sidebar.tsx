import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { Barbell, CalendarBlank, ChartLineUp, GearSix, SignOut, SquaresFour, UserCircle } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { Role } from "@/lib/types";

interface SidebarProps {
  role: Role;
}

const LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  clsx(
    "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] font-medium transition-colors duration-100",
    isActive ? "bg-[var(--color-ink)] text-[var(--color-paper)]" : "text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)]",
  );

export function Sidebar({ role }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const { branches, activeBranchId, setActiveBranchId, canSwitchBranch } = useBranch();
  const { organization } = useOrganization();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)] p-4 lg:flex">
      <div className="mb-6 flex items-center gap-2.5 px-1">
        {organization?.logoUrl ? (
          <img src={organization.logoUrl} alt={organization.name} className="h-9 w-9 rounded-[var(--radius-sm)] object-contain" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-ink)] text-[var(--color-paper)]">
            <Barbell size={18} weight="fill" />
          </span>
        )}
        <div>
          <p className="font-display text-[15px] font-bold leading-none">{organization?.name ?? "Salon"}</p>
          <p className="text-[11px] text-[var(--color-ash)]">Yönetim Paneli</p>
        </div>
      </div>

      {canSwitchBranch && (
        <div className="mb-4">
          <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-ash)]">Şube</label>
          <select
            value={activeBranchId ?? ""}
            onChange={(e) => setActiveBranchId(e.target.value)}
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2.5 text-[14px] text-[var(--color-ink)]"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-1">
        <NavLink to="/calendar" className={LINK_CLASS}>
          <CalendarBlank size={19} />
          Takvim
        </NavLink>
        {role !== "trainer" && (
          <NavLink to="/overview" className={LINK_CLASS}>
            <ChartLineUp size={19} />
            Genel Bakış
          </NavLink>
        )}
        <NavLink to="/reports" className={LINK_CLASS}>
          <ChartLineUp size={19} />
          {role === "trainer" ? "Raporlarım" : "Raporlar"}
        </NavLink>
        {role !== "trainer" && (
          <NavLink to="/team" className={LINK_CLASS}>
            <SquaresFour size={19} />
            Ekip
          </NavLink>
        )}
        {role !== "trainer" && (
          <NavLink to="/settings" className={LINK_CLASS}>
            <GearSix size={19} />
            Ayarlar
          </NavLink>
        )}
        <NavLink to="/profile" className={LINK_CLASS}>
          <UserCircle size={19} />
          Profil
        </NavLink>
      </nav>

      <div className="mt-4 border-t border-[var(--color-line)] pt-4">
        <p className="truncate px-1 text-[13px] font-medium text-[var(--color-ink)]">{profile?.fullName}</p>
        <button
          onClick={signOut}
          className="mt-2 flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-[13px] text-[var(--color-ash)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
        >
          <SignOut size={16} />
          Çıkış yap
        </button>
      </div>
    </aside>
  );
}
