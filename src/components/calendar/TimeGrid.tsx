import { useMemo } from "react";
import { SlotCell, type TrainerVisual } from "./SlotCell";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  ZOOM_ROW_HEIGHT,
  formatDayHeader,
  formatHourLabel,
  isSameDay,
  sessionsInSlot,
  slotTimes,
  weekdayShort,
  type ZoomLevel,
} from "@/lib/calendarGrid";
import type { GymSession } from "@/lib/types";

interface TimeGridProps {
  days: Date[];
  sessions: GymSession[];
  zoom: ZoomLevel;
  capacity: number;
  trainerVisual: (trainerId: string) => TrainerVisual;
  workoutTypeColor: (workoutTypeId: string | null) => string | null;
  onSlotClick: (day: Date, hour: number, minute: number, sessionsInThatSlot: GymSession[]) => void;
  showDayHeaders: boolean;
}

export function TimeGrid({ days, sessions, zoom, capacity, trainerVisual, workoutTypeColor, onSlotClick, showDayHeaders }: TimeGridProps) {
  const rowHeight = ZOOM_ROW_HEIGHT[zoom];
  const slots = useMemo(() => slotTimes(), []);
  const now = new Date();
  const axisWidth = 56;

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex min-w-fit">
        <div className="sticky left-0 z-10 flex shrink-0 flex-col bg-[var(--color-paper)]" style={{ width: axisWidth }}>
          {showDayHeaders && <div className="h-11 border-b border-[var(--color-line)]" />}
          {slots.map((slot) => (
            <div
              key={`${slot.hour}-${slot.minute}`}
              style={{ height: rowHeight }}
              className="flex items-start justify-end border-b border-[var(--color-line)] pr-2 pt-1"
            >
              {slot.minute === 0 && (
                <span className="font-body text-[11px] tabular-nums text-[var(--color-ash)]">{formatHourLabel(slot.hour, slot.minute)}</span>
              )}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const today = isSameDay(day, now);
          const nowOffset =
            today && now.getHours() >= DAY_START_HOUR && now.getHours() < DAY_END_HOUR
              ? ((now.getHours() - DAY_START_HOUR) * 60 + now.getMinutes()) * (rowHeight / 30)
              : null;

          return (
            <div key={day.toISOString()} className="relative flex min-w-[92px] flex-1 flex-col lg:min-w-0">
              {showDayHeaders && (
                <div className="flex h-11 flex-col items-center justify-center border-b border-[var(--color-line)]">
                  <span className="font-body text-[11px] font-medium uppercase tracking-wide text-[var(--color-ash)]">
                    {weekdayShort(day)}
                  </span>
                  <span
                    className="font-display text-[15px] font-bold leading-none"
                    style={{ color: today ? "var(--color-gold)" : "var(--color-ink)" }}
                  >
                    {formatDayHeader(day)}
                  </span>
                </div>
              )}
              {slots.map((slot) => (
                <SlotCell
                  key={`${slot.hour}-${slot.minute}`}
                  height={rowHeight}
                  sessions={sessionsInSlot(sessions, day, slot.hour, slot.minute)}
                  capacity={capacity}
                  trainerVisual={trainerVisual}
                  workoutTypeColor={workoutTypeColor}
                  isPast={new Date(day).setHours(slot.hour, slot.minute, 0, 0) < now.getTime() && !today}
                  onClick={() => onSlotClick(day, slot.hour, slot.minute, sessionsInSlot(sessions, day, slot.hour, slot.minute))}
                />
              ))}
              {nowOffset !== null && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-[1] border-t-2 border-[var(--color-gold)]"
                  style={{ top: (showDayHeaders ? 44 : 0) + nowOffset }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
