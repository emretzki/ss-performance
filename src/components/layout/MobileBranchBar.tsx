import { Buildings, CaretDown } from "@phosphor-icons/react";
import { useBranch } from "@/contexts/BranchContext";

// Mobile-only equivalent of the branch <select> in the desktop Sidebar
// (that sidebar is lg:hidden, so without this a multi-branch owner had no
// way at all to switch branches on a phone). Sits directly above the bottom
// tab bar, in a slim strip so it never feels like a whole extra screen —
// a native <select> is layered transparently over the styled row so it
// opens the OS's own picker rather than a bespoke dropdown.
export function MobileBranchBar() {
  const { branches, activeBranchId, setActiveBranchId, canSwitchBranch } = useBranch();

  if (!canSwitchBranch || branches.length < 2) return null;
  const current = branches.find((b) => b.id === activeBranchId);

  return (
    <div className="relative border-t border-[var(--color-line)] bg-[var(--color-surface)] lg:hidden">
      <div className="pointer-events-none flex items-center gap-2 px-4 py-2.5">
        <Buildings size={16} className="shrink-0 text-[var(--color-ash)]" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--color-ink)]">{current?.name ?? "Şube seç"}</span>
        <CaretDown size={13} weight="bold" className="shrink-0 text-[var(--color-ash)]" />
      </div>
      <select
        aria-label="Şube seç"
        value={activeBranchId ?? ""}
        onChange={(e) => setActiveBranchId(e.target.value)}
        className="absolute inset-0 h-full w-full opacity-0"
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}
