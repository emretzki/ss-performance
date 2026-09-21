import clsx from "clsx";
import { displayStatus } from "@/lib/api";
import type { GymSession } from "@/lib/types";

export interface TrainerVisual {
  initial: string;
  color: string;
  avatarUrl: string | null;
}

interface SlotCellProps {
  sessions: GymSession[];
  capacity: number;
  trainerVisual: (trainerId: string) => TrainerVisual;
  workoutTypeColor: (workoutTypeId: string | null) => string | null;
  height: number;
  onClick: () => void;
  isPast: boolean;
}

export function SlotCell({ sessions, capacity, trainerVisual, workoutTypeColor, height, onClick, isPast }: SlotCellProps) {
  const now = new Date();
  const active = sessions.filter((s) => s.status !== "cancelled" && displayStatus(s, now) !== "done");
  const full = active.length >= capacity;
  const compact = height < 64;
  const shown = active.slice(0, 3);
  const overflow = active.length - shown.length;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ height }}
      className={clsx(
        "group relative flex w-full items-center justify-center gap-1 border-b border-r border-[var(--color-line)] px-1 transition-colors duration-100",
        "hover:bg-[var(--color-surface-2)] active:scale-[0.98]",
        full && "bg-[repeating-linear-gradient(135deg,rgba(242,245,239,0.05)_0px,rgba(242,245,239,0.05)_1px,transparent_1px,transparent_8px)]",
        isPast && "opacity-60",
      )}
      aria-label={full ? "Bu saat dolu" : "Ders eklemek için dokun"}
    >
      {active.length === 0 ? (
        <span className="text-[13px] text-[var(--color-line-strong)] opacity-0 transition-opacity duration-100 group-hover:opacity-100">+</span>
      ) : (
        <>
          {shown.map((s) => {
            const v = trainerVisual(s.trainerId);
            const typeColor = workoutTypeColor(s.workoutTypeId);
            const size = compact ? 18 : 26;
            return (
              <span
                key={s.id}
                className="relative shrink-0 overflow-hidden rounded-full text-[9px] font-semibold text-[var(--color-ink)]"
                style={{ width: size, height: size, background: v.color, boxShadow: typeColor ? `0 0 0 2px ${typeColor}` : undefined }}
              >
                {v.avatarUrl ? (
                  <img src={v.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">{v.initial}</span>
                )}
              </span>
            );
          })}
          {overflow > 0 && (
            <span className="shrink-0 text-[11px] font-medium text-[var(--color-ash)]">+{overflow}</span>
          )}
          {full && !compact && <span className="ml-1 shrink-0 text-[11px] font-medium text-[var(--color-ink-soft)]">Dolu</span>}
        </>
      )}
    </button>
  );
}
