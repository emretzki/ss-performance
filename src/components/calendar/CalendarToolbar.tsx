import clsx from "clsx";
import { CaretLeft, CaretRight, MagnifyingGlassMinus, MagnifyingGlassPlus } from "@phosphor-icons/react";
import { ZOOM_LABELS, type ZoomLevel, formatDayHeader, weekdayLong } from "@/lib/calendarGrid";

export type CalendarView = "day" | "week";

interface CalendarToolbarProps {
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  anchorDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  zoom: ZoomLevel;
  onZoomChange: (z: ZoomLevel) => void;
}

const ZOOM_ORDER: ZoomLevel[] = ["compact", "normal", "detailed"];

export function CalendarToolbar({ view, onViewChange, anchorDate, onPrev, onNext, onToday, zoom, onZoomChange }: CalendarToolbarProps) {
  const zoomIndex = ZOOM_ORDER.indexOf(zoom);

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)] active:scale-95"
            aria-label="Önceki"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <button
            onClick={onNext}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)] active:scale-95"
            aria-label="Sonraki"
          >
            <CaretRight size={16} weight="bold" />
          </button>
          <button
            onClick={onToday}
            className="ml-1 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13px] font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)]"
          >
            Bugün
          </button>
        </div>
        <p className="font-display text-[20px] font-bold leading-none text-[var(--color-ink)] lg:hidden">
          {view === "day" ? weekdayLong(anchorDate) + ", " + formatDayHeader(anchorDate) : formatDayHeader(anchorDate)}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex rounded-[var(--radius-md)] border border-[var(--color-line-strong)] p-0.5">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={clsx(
                "rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-colors duration-100",
                view === v ? "bg-[var(--color-ink)] text-[var(--color-paper)]" : "text-[var(--color-ink-soft)]",
              )}
            >
              {v === "day" ? "Gün" : "Hafta"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] px-1 py-0.5">
          <button
            onClick={() => onZoomChange(ZOOM_ORDER[Math.max(0, zoomIndex - 1)])}
            disabled={zoomIndex === 0}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)] disabled:opacity-30"
            aria-label="Uzaklaştır"
          >
            <MagnifyingGlassMinus size={15} />
          </button>
          <span className="w-16 text-center text-[12px] font-medium text-[var(--color-ink-soft)]">{ZOOM_LABELS[zoom]}</span>
          <button
            onClick={() => onZoomChange(ZOOM_ORDER[Math.min(2, zoomIndex + 1)])}
            disabled={zoomIndex === 2}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)] disabled:opacity-30"
            aria-label="Yakınlaştır"
          >
            <MagnifyingGlassPlus size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
