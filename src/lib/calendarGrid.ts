import type { GymSession } from "./types";

export type ZoomLevel = "compact" | "normal" | "detailed";

export const ZOOM_ROW_HEIGHT: Record<ZoomLevel, number> = {
  compact: 40,
  normal: 64,
  detailed: 96,
};

export const ZOOM_LABELS: Record<ZoomLevel, string> = {
  compact: "Sıkışık",
  normal: "Normal",
  detailed: "Detaylı",
};

export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 22;
export const SLOT_MIN = 30;

export function slotTimes(): { hour: number; minute: number }[] {
  const slots: { hour: number; minute: number }[] = [];
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
    slots.push({ hour: h, minute: 0 });
    slots.push({ hour: h, minute: 30 });
  }
  return slots;
}

export function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// Includes cancelled sessions so a trainer/owner can still see "İptal edildi"
// history for a slot; capacity/tick logic filters those out separately.
export function sessionsInSlot(sessions: GymSession[], day: Date, hour: number, minute: number): GymSession[] {
  const slotStart = new Date(day);
  slotStart.setHours(hour, minute, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + SLOT_MIN * 60_000);

  return sessions.filter((s) => {
    const sStart = new Date(s.startsAt);
    const sEnd = new Date(sStart.getTime() + s.durationMin * 60_000);
    return sStart < slotEnd && sEnd > slotStart;
  });
}

// A session longer than one grid row (e.g. 60 or 90 minutes) overlaps
// several consecutive slots. sessionsInSlot() correctly returns it for all of
// them — capacity has to count it in every slot it actually occupies — but
// rendering its avatar chip in each of those slots reads as several separate
// bookings stacked in a row instead of one longer one. This narrows to just
// the slot the session actually starts in, so a 60-minute session shows
// exactly one chip, not two.
export function sessionsStartingInSlot(sessions: GymSession[], day: Date, hour: number, minute: number): GymSession[] {
  const slotStart = new Date(day);
  slotStart.setHours(hour, minute, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + SLOT_MIN * 60_000);

  return sessions.filter((s) => {
    const sStart = new Date(s.startsAt);
    return sStart >= slotStart && sStart < slotEnd;
  });
}

export function formatHourLabel(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const WEEKDAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const WEEKDAY_LONG = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export function weekdayShort(d: Date): string {
  return WEEKDAY_SHORT[(d.getDay() + 6) % 7];
}

export function weekdayLong(d: Date): string {
  return WEEKDAY_LONG[(d.getDay() + 6) % 7];
}

export function formatDayHeader(d: Date): string {
  return `${d.getDate()} ${["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"][d.getMonth()]}`;
}
