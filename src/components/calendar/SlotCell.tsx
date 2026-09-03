import { CapacityTicks } from "@/components/ui/CapacityTicks";
import { MAX_SESSIONS_PER_SLOT, type GymSession } from "@/lib/types";
import clsx from "clsx";

interface SlotCellProps {
  sessions: GymSession[];
  trainerColor: (trainerId: string) => string;
  height: number;
  onClick: () => void;
  isPast: boolean;
}

export function SlotCell({ sessions, trainerColor, height, onClick, isPast }: SlotCellProps) {
  const active = sessions.filter((s) => s.status !== "cancelled");
  const full = active.length >= MAX_SESSIONS_PER_SLOT;
  const colors = active.slice(0, MAX_SESSIONS_PER_SLOT).map((s) => trainerColor(s.trainerId));

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ height }}
      className={clsx(
        "group relative flex w-full items-center justify-center border-b border-r border-[var(--color-line)] transition-colors duration-100",
        "hover:bg-[var(--color-surface-2)] active:scale-[0.98]",
        full && "bg-[repeating-linear-gradient(135deg,rgba(23,20,15,0.04)_0px,rgba(23,20,15,0.04)_1px,transparent_1px,transparent_8px)]",
        isPast && "opacity-60",
      )}
      aria-label={full ? "Bu saat dolu" : "Ders eklemek için dokun"}
    >
      {active.length === 0 ? (
        <span className="text-[13px] text-[var(--color-line-strong)] opacity-0 transition-opacity duration-100 group-hover:opacity-100">
          +
        </span>
      ) : (
        <CapacityTicks colors={colors} size={height >= 64 ? "md" : "sm"} />
      )}
    </button>
  );
}
