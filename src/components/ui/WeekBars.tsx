const WEEKDAY = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

interface WeekBarsProps {
  byDay: { date: string; count: number }[];
}

export function WeekBars({ byDay }: WeekBarsProps) {
  const max = Math.max(1, ...byDay.map((d) => d.count));
  return (
    <div className="flex items-end gap-2.5" style={{ height: 96 }}>
      {byDay.map((d) => {
        const date = new Date(d.date);
        const h = Math.max(4, (d.count / max) * 76);
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-[76px] w-full items-end">
              <div
                className="w-full rounded-[3px] bg-[var(--color-gold)] transition-[height] duration-200"
                style={{ height: h }}
                title={`${d.count} ders`}
              />
            </div>
            <span className="text-[11px] tabular-nums text-[var(--color-ash)]">{WEEKDAY[(date.getDay() + 6) % 7]}</span>
          </div>
        );
      })}
    </div>
  );
}
