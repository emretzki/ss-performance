import clsx from "clsx";
import type { Trainer } from "@/lib/types";

interface TrainerFilterChipsProps {
  trainers: Trainer[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  currentProfileId: string | null;
}

export function TrainerFilterChips({ trainers, selected, onToggle, currentProfileId }: TrainerFilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
      {trainers.map((t) => {
        const isSelf = t.id === currentProfileId;
        const active = selected.has(t.id);
        return (
          <button
            key={t.id}
            onClick={() => onToggle(t.id)}
            className={clsx(
              "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-100 lg:w-full lg:justify-start",
              active
                ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
                : "border-[var(--color-line-strong)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink)]",
            )}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: isSelf ? "var(--color-gold)" : t.badgeColor }}
            />
            {t.fullName}
            {isSelf && <span className="text-[11px] opacity-70">(sen)</span>}
          </button>
        );
      })}
    </div>
  );
}
