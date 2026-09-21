import clsx from "clsx";
import { X } from "@phosphor-icons/react";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { displayStatus } from "@/lib/api";
import { formatHourLabel } from "@/lib/calendarGrid";
import type { GymSession, Trainer, WorkoutType } from "@/lib/types";

interface SlotDetailsPanelProps {
  day: Date;
  hour: number;
  minute: number;
  sessions: GymSession[];
  trainers: Trainer[];
  workoutTypes: WorkoutType[];
  onClose: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Planlandı",
  in_progress: "Devam ediyor",
  done: "Tamamlandı",
};

export function SlotDetailsPanel({ day, hour, minute, sessions, trainers, workoutTypes, onClose }: SlotDetailsPanelProps) {
  const isDesktop = useIsDesktop();
  useEscapeClose(onClose);
  const trainerById = (id: string) => trainers.find((t) => t.id === id);
  const typeById = (id: string | null) => (id ? workoutTypes.find((w) => w.id === id) : undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[var(--color-paper)]/72 transition-opacity duration-200" onClick={onClose} />
      <div
        className={clsx(
          "relative z-10 flex w-full flex-col gap-4 bg-[var(--color-surface)] p-5 shadow-[var(--shadow-float)] transition-transform duration-200",
          isDesktop ? "max-w-sm rounded-[var(--radius-lg)]" : "max-h-[90dvh] rounded-t-[var(--radius-lg)] pb-[max(20px,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-[22px] font-bold leading-none tabular-nums">{formatHourLabel(hour, minute)}</p>
            <p className="mt-1 text-[13px] text-[var(--color-ash)]">{day.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ash)] hover:bg-[var(--color-surface-2)]" aria-label="Kapat">
            <X size={18} />
          </button>
        </div>

        {sessions.length === 0 ? (
          <p className="text-[14px] text-[var(--color-ash)]">Bu saat için henüz ders girilmedi.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-line)]">
            {sessions.map((s) => {
              const trainer = trainerById(s.trainerId);
              const workoutType = typeById(s.workoutTypeId);
              const cancelled = s.status === "cancelled";
              const status = displayStatus(s);
              return (
                <div key={s.id} className={clsx("flex items-start gap-3 py-3", cancelled && "opacity-50")}>
                  <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: trainer?.badgeColor ?? "var(--color-ash)" }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={clsx("truncate text-[14px] font-medium text-[var(--color-ink)]", cancelled && "line-through")}>
                        {trainer?.fullName ?? "Bilinmeyen PT"}
                      </p>
                      {!cancelled && status === "in_progress" && (
                        <span className="shrink-0 rounded-full bg-[var(--color-gold-tint)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-gold-deep)]">
                          {STATUS_LABEL.in_progress}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[13px] text-[var(--color-ash)]">
                      {cancelled ? "İptal edildi" : (s.memberName ?? "Üye belirtilmedi")} · {s.durationMin} dk
                      {workoutType ? ` · ${workoutType.name}` : ""}
                    </p>
                    {s.notes && <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">{s.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
