import clsx from "clsx";
import { displayStatus } from "@/lib/api";
import type { GymSession } from "@/lib/types";

export interface TrainerVisual {
  initial: string;
  color: string;
  avatarUrl: string | null;
}

interface SlotCellProps {
  /** Every session overlapping this slot (may have started in an earlier
   * slot) — the source of truth for capacity/"Dolu", never for what to draw. */
  sessions: GymSession[];
  /** Only the sessions that actually start in this slot — what gets an
   * avatar chip, so a 60/90-minute session doesn't get one per row it spans. */
  startingSessions: GymSession[];
  capacity: number;
  trainerVisual: (trainerId: string) => TrainerVisual;
  workoutTypeColor: (workoutTypeId: string | null) => string | null;
  height: number;
  onClick: () => void;
  isPast: boolean;
}

export function SlotCell({ sessions, startingSessions, capacity, trainerVisual, workoutTypeColor, height, onClick, isPast }: SlotCellProps) {
  const now = new Date();
  const isActive = (s: GymSession) => s.status !== "cancelled" && displayStatus(s, now) !== "done";
  const active = sessions.filter(isActive);
  const full = active.length >= capacity;
  const compact = height < 64;

  const startingIds = new Set(startingSessions.map((s) => s.id));
  const startingActive = active.filter((s) => startingIds.has(s.id));
  // Sessions that began in an earlier slot and are still running through
  // this one: already have a chip up there, so they get a small continuation
  // mark here instead of a second chip.
  const continuing = active.filter((s) => !startingIds.has(s.id));

  const shown = startingActive.slice(0, 3);
  const overflow = startingActive.length - shown.length;

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
          {continuing.length > 0 &&
            continuing.slice(0, 3).map((s) => (
              <span
                key={s.id}
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full opacity-70"
                style={{ background: trainerVisual(s.trainerId).color }}
              />
            ))}
          {full && !compact && <span className="ml-1 shrink-0 text-[11px] font-medium text-[var(--color-ink-soft)]">Dolu</span>}
        </>
      )}
    </button>
  );
}
