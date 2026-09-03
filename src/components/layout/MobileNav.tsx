import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { CalendarBlank, ChartLineUp, SquaresFour, UserCircle } from "@phosphor-icons/react";
import type { Role } from "@/lib/types";

interface MobileNavProps {
  role: Role;
}

const ITEM_CLASS = ({ isActive }: { isActive: boolean }) =>
  clsx(
    "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors duration-100",
    isActive ? "text-[var(--color-gold-deep)]" : "text-[var(--color-ash)]",
  );

export function MobileNav({ role }: MobileNavProps) {
  return (
    <nav className="flex border-t border-[var(--color-line)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] lg:hidden">
      <NavLink to="/calendar" className={ITEM_CLASS}>
        {({ isActive }) => (
          <>
            <CalendarBlank size={22} weight={isActive ? "fill" : "regular"} />
            Takvim
          </>
        )}
      </NavLink>

      {role !== "trainer" && (
        <NavLink to="/overview" className={ITEM_CLASS}>
          {({ isActive }) => (
            <>
              <ChartLineUp size={22} weight={isActive ? "fill" : "regular"} />
              Genel Bakış
            </>
          )}
        </NavLink>
      )}

      <NavLink to="/reports" className={ITEM_CLASS}>
        {({ isActive }) => (
          <>
            <ChartLineUp size={22} weight={isActive ? "fill" : "regular"} />
            Raporlar
          </>
        )}
      </NavLink>

      {role !== "trainer" && (
        <NavLink to="/team" className={ITEM_CLASS}>
          {({ isActive }) => (
            <>
              <SquaresFour size={22} weight={isActive ? "fill" : "regular"} />
              Ekip
            </>
          )}
        </NavLink>
      )}

      <NavLink to="/profile" className={ITEM_CLASS}>
        {({ isActive }) => (
          <>
            <UserCircle size={22} weight={isActive ? "fill" : "regular"} />
            Profil
          </>
        )}
      </NavLink>
    </nav>
  );
}
