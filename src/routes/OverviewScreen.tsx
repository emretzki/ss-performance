import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useBranch } from "@/contexts/BranchContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { displayStatus, getBranchRevenue, getCommissionPeriod, getTrainerStats, listMembers, listSessions, listTrainers } from "@/lib/api";
import { formatHourLabel } from "@/lib/calendarGrid";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";

const UPCOMING_LIMIT = 6;

function formatTL(n: number): string {
  return `${Math.round(n).toLocaleString("tr-TR")} TL`;
}

function formatPeriodLabel(start: Date, end: Date): string {
  const lastDay = new Date(end.getTime() - 86400000);
  const fmt = (d: Date) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(lastDay)}`;
}

export function OverviewScreen() {
  const { activeBranchId } = useBranch();
  const { organization } = useOrganization();

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

  // Uyarılar — ayrı bir bildirim merkezi/rozet sistemi yerine mevcut
  // veriden her yüklemede yeniden türetilir: okundu/kapatma durumu yok,
  // dönem ilerledikçe veya paket yenilendikçe kendiliğinden güncel kalır.
  const { data: members = [] } = useQuery({
    queryKey: ["members", activeBranchId],
    queryFn: () => listMembers(activeBranchId as string),
    enabled: Boolean(activeBranchId),
  });
  const endingPackages = members.filter((m) => m.packageTotalSessions && m.packageTotalSessions - m.packageSessionsUsed <= 2);

  const { start: currentPeriodStart } = getCommissionPeriod(organization?.commissionPeriodStartDay ?? 1);
  const { start: prevPeriodStart, end: prevPeriodEnd } = getCommissionPeriod(
    organization?.commissionPeriodStartDay ?? 1,
    new Date(currentPeriodStart.getTime() - 1),
  );
  const { data: prevRevenue } = useQuery({
    queryKey: ["branch-revenue", activeBranchId, prevPeriodStart.toISOString()],
    queryFn: () => getBranchRevenue(activeBranchId as string, prevPeriodStart, prevPeriodEnd),
    enabled: Boolean(activeBranchId),
  });
  const hasAlerts = endingPackages.length > 0 || Boolean(prevRevenue && prevRevenue.commissionPayable > 0);

  if (trainers.length === 0) {
    return <EmptyState message="Bu şubede henüz PT kaydı yok." />;
  }

  const now = new Date();
  const upcoming = todaySessions
    .filter((s) => s.status !== "cancelled" && displayStatus(s, now) !== "done")
    .filter((s) => new Date(s.startsAt).getTime() + s.durationMin * 60_000 > now.getTime())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, UPCOMING_LIMIT);

  const trainerById = (id: string) => trainers.find((t) => t.id === id);

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

        {hasAlerts && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">Uyarılar</p>

            {prevRevenue && prevRevenue.commissionPayable > 0 && (
              <Link
                to="/reports"
                className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-gold)] bg-[var(--color-gold-tint)] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[var(--color-ink)]">
                    Önceki dönem kapandı · {formatPeriodLabel(prevPeriodStart, prevPeriodEnd)}
                  </p>
                  <p className="text-[12px] text-[var(--color-ink-soft)]">PT'lere ödenmesi gereken toplam prim</p>
                </div>
                <p className="shrink-0 font-display text-[18px] font-bold tabular-nums text-[var(--color-gold-deep)]">
                  {formatTL(prevRevenue.commissionPayable)}
                </p>
              </Link>
            )}

            {endingPackages.length > 0 && (
              <div className="flex flex-col divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
                {endingPackages.map((m) => {
                  const left = Math.max(0, (m.packageTotalSessions ?? 0) - m.packageSessionsUsed);
                  return (
                    <Link key={m.id} to="/uyeler" className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)]">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-[var(--color-ink)]">{m.fullName}</p>
                        <p className="truncate text-[12px] text-[var(--color-ash)]">{m.packageName} · paketi bitmek üzere</p>
                      </div>
                      <span className="shrink-0 text-[12px] font-medium text-[var(--color-danger)]">
                        {left === 0 ? "Bitti" : `${left} ders kaldı`}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard label="Bugün toplam ders" value={todaySessions.length} />
          <StatCard label="En yoğun saat" value={busiestHour} />
          <StatCard label="Aktif PT" value={trainers.length} />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">Yaklaşan dersler</p>
          {upcoming.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-6 text-center text-[13px] text-[var(--color-ash)]">
              Bugün için kalan ders yok.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
              {upcoming.map((s) => {
                const trainer = trainerById(s.trainerId);
                const start = new Date(s.startsAt);
                const live = displayStatus(s, now) === "in_progress";
                return (
                  <Link key={s.id} to="/calendar" className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)]">
                    <p className="w-12 shrink-0 font-display text-[15px] font-bold tabular-nums text-[var(--color-ink)]">
                      {formatHourLabel(start.getHours(), start.getMinutes())}
                    </p>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: trainer?.badgeColor ?? "var(--color-ash)" }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-[var(--color-ink)]">{trainer?.fullName ?? "Bilinmeyen PT"}</p>
                      <p className="truncate text-[12px] text-[var(--color-ash)]">{s.memberName ?? "Üye belirtilmedi"} · {s.durationMin} dk</p>
                    </div>
                    {live && (
                      <span className="shrink-0 rounded-full bg-[var(--color-gold-tint)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-gold-deep)]">
                        Devam ediyor
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
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
