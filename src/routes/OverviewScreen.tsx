import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useBranch } from "@/contexts/BranchContext";
import { getTrainerStats, listSessions, listTrainers } from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";

export function OverviewScreen() {
  const { activeBranchId } = useBranch();

  const { data: trainers = [] } = useQuery({
    queryKey: ["trainers", activeBranchId],
    queryFn: () => listTrainers(activeBranchId as string),
    enabled: Boolean(activeBranchId),
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const { data: todaySessions = [] } = useQuery({
    queryKey: ["sessions-today", activeBranchId],
    queryFn: () => listSessions(activeBranchId as string, todayStart, todayEnd),
    enabled: Boolean(activeBranchId),
  });

  const statsQueries = useQueries({
    queries: trainers.map((t) => ({
      queryKey: ["trainer-stats", activeBranchId, t.id],
      queryFn: () => getTrainerStats(activeBranchId as string, t.id),
      enabled: Boolean(activeBranchId),
    })),
  });

  if (trainers.length === 0) {
    return <EmptyState message="Bu şubede henüz PT kaydı yok." />;
  }

  const busiestHour = (() => {
    const counts = new Map<number, number>();
    todaySessions.forEach((s) => {
      const h = new Date(s.startsAt).getHours();
      counts.set(h, (counts.get(h) ?? 0) + 1);
    });
    let best: [number, number] | null = null;
    counts.forEach((count, hour) => {
      if (!best || count > best[1]) best = [hour, count];
    });
    return best ? `${String(best[0]).padStart(2, "0")}:00` : "-";
  })();

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[24px] font-bold text-[var(--color-ink)]">Genel Bakış</h1>
            <p className="mt-1 text-[13px] text-[var(--color-ash)]">Bugünün ve ekibin durumu tek bakışta.</p>
          </div>
          <Link to="/reports" className="shrink-0 text-[13px] font-medium text-[var(--color-gold-deep)] underline underline-offset-4">
            Tüm rapor
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard label="Bugün toplam ders" value={todaySessions.length} />
          <StatCard label="En yoğun saat" value={busiestHour} />
          <StatCard label="Aktif PT" value={trainers.length} />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">PT bazlı bugün</p>
          <div className="flex flex-col divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
            {trainers.map((t, i) => {
              const count = todaySessions.filter((s) => s.trainerId === t.id).length;
              const stats = statsQueries[i]?.data;
              return (
                <Link key={t.id} to={`/reports?trainer=${t.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.badgeColor }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-[var(--color-ink)]">{t.fullName}</p>
                    <p className="text-[12px] text-[var(--color-ash)]">
                      Bugün {count} ders · Bu hafta {stats?.thisWeek ?? "-"}
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-[20px] font-bold tabular-nums text-[var(--color-ink)]">{count}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
