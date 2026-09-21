import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { getBranchRevenue, getTrainerStats, listTrainers, listWorkoutTypes } from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { WeekBars } from "@/components/ui/WeekBars";
import clsx from "clsx";

function formatTL(n: number): string {
  return `${Math.round(n).toLocaleString("tr-TR")} TL`;
}

function pct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function last7Days(): { date: string; count: number }[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return { date: d.toISOString(), count: 0 };
  });
}

export function ReportsScreen() {
  const { profile } = useAuth();
  const { activeBranchId } = useBranch();
  const isTrainer = profile?.role === "trainer";
  const [searchParams] = useSearchParams();

  const { data: trainers = [] } = useQuery({
    queryKey: ["trainers", activeBranchId],
    queryFn: () => listTrainers(activeBranchId as string),
    enabled: Boolean(activeBranchId) && !isTrainer,
  });

  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(() => searchParams.get("trainer"));
  const showBranchTotal = !isTrainer && selectedTrainerId === null;
  const trainerId = isTrainer ? profile!.id : selectedTrainerId;

  const { data: stats } = useQuery({
    queryKey: ["trainer-stats", activeBranchId, trainerId],
    queryFn: () => getTrainerStats(activeBranchId as string, trainerId as string),
    enabled: Boolean(activeBranchId && trainerId),
  });

  const { data: workoutTypes = [] } = useQuery({
    queryKey: ["workout-types", profile?.organizationId],
    queryFn: () => listWorkoutTypes(profile!.organizationId),
    enabled: Boolean(profile?.organizationId),
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const { data: revenue } = useQuery({
    queryKey: ["branch-revenue", activeBranchId, monthStart.toISOString()],
    queryFn: () => getBranchRevenue(activeBranchId as string, monthStart, monthEnd),
    enabled: Boolean(activeBranchId),
  });
  const trainerRevenue = trainerId ? revenue?.byTrainer.find((b) => b.trainerId === trainerId) : undefined;

  const allStatsQueries = useQueries({
    queries: trainers.map((t) => ({
      queryKey: ["trainer-stats", activeBranchId, t.id],
      queryFn: () => getTrainerStats(activeBranchId as string, t.id),
      enabled: showBranchTotal && Boolean(activeBranchId),
    })),
  });

  const branchTotal = showBranchTotal
    ? allStatsQueries.reduce(
        (acc, q) => {
          if (!q.data) return acc;
          acc.thisWeek += q.data.thisWeek;
          acc.lastWeek += q.data.lastWeek;
          acc.thisMonth += q.data.thisMonth;
          acc.lastMonth += q.data.lastMonth;
          q.data.byDay.forEach((d, i) => {
            acc.byDay[i].count += d.count;
          });
          q.data.byWorkoutType.forEach((wt) => {
            const existing = acc.byWorkoutType.find((e) => e.workoutTypeId === wt.workoutTypeId);
            if (existing) existing.count += wt.count;
            else acc.byWorkoutType.push({ ...wt });
          });
          return acc;
        },
        {
          thisWeek: 0,
          lastWeek: 0,
          thisMonth: 0,
          lastMonth: 0,
          byDay: last7Days(),
          byWorkoutType: [] as { workoutTypeId: string; count: number }[],
        },
      )
    : null;

  const shown = showBranchTotal ? branchTotal : stats;
  const maxTypeCount = Math.max(1, ...(shown?.byWorkoutType.map((w) => w.count) ?? [0]));

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
          <h1 className="font-display text-[24px] font-bold text-[var(--color-ink)]">Çalışma Raporu</h1>
          <p className="mt-1 text-[13px] text-[var(--color-ash)]">
            {isTrainer ? "Ders sayıların ve önceki döneme göre kıyaslama." : "Şube toplamı veya PT bazlı ders sayıları."}
          </p>
        </div>

        {!isTrainer && (
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedTrainerId(null)}
              className={clsx(
                "shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-100",
                showBranchTotal
                  ? "border-[var(--color-gold-deep)] bg-[var(--color-gold)] text-[var(--color-ink)]"
                  : "border-[var(--color-line-strong)] text-[var(--color-ink-soft)]",
              )}
            >
              Tüm şube
            </button>
            {trainers.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTrainerId(t.id)}
                className={clsx(
                  "shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-100",
                  trainerId === t.id
                    ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
                    : "border-[var(--color-line-strong)] text-[var(--color-ink-soft)]",
                )}
              >
                {t.fullName}
              </button>
            ))}
          </div>
        )}

        {shown ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Bu hafta" value={shown.thisWeek} delta={{ value: pct(shown.thisWeek, shown.lastWeek), label: "geçen haftaya göre" }} />
              <StatCard label="Bu ay" value={shown.thisMonth} delta={{ value: pct(shown.thisMonth, shown.lastMonth), label: "geçen aya göre" }} />
            </div>

            {showBranchTotal && revenue && (
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
                <p className="mb-1 text-[13px] font-medium text-[var(--color-ink-soft)]">Ciro (bu ay)</p>
                <p className="mb-4 text-[12px] text-[var(--color-ash)]">Üyelerin paket birim fiyatına göre, gerçekleşen (iptal edilmemiş, saati geçmiş) dersler.</p>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Toplam ciro" value={formatTL(revenue.totalRevenue)} />
                  <StatCard label="Salon karı" value={formatTL(revenue.ownerProfit)} />
                  <StatCard label="PT primi" value={formatTL(revenue.commissionPayable)} />
                </div>
              </div>
            )}

            {!showBranchTotal && trainerRevenue && (
              <div className="grid grid-cols-2 gap-3">
                <StatCard label={isTrainer ? "Ürettiğin ciro (bu ay)" : "Ürettiği ciro (bu ay)"} value={formatTL(trainerRevenue.revenue)} />
                <StatCard label={isTrainer ? "Kazandığın prim (bu ay)" : "Ödenecek prim (bu ay)"} value={formatTL(trainerRevenue.commission)} />
              </div>
            )}

            <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
              <p className="mb-4 text-[13px] font-medium text-[var(--color-ink-soft)]">Son 7 gün</p>
              <WeekBars byDay={shown.byDay} />
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
              <p className="mb-1 text-[13px] font-medium text-[var(--color-ink-soft)]">Bu ay idman türüne göre</p>
              <p className="mb-4 text-[12px] text-[var(--color-ash)]">Hangi türe az ders giriliyor, nereye yatırım gerekebilir görürsün.</p>
              {workoutTypes.length === 0 || shown.byWorkoutType.length === 0 ? (
                <p className="text-[13px] text-[var(--color-ash)]">Bu ay için henüz idman türü kırılımı yok.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {workoutTypes.map((wt) => {
                    const entry = shown.byWorkoutType.find((w) => w.workoutTypeId === wt.id);
                    const count = entry?.count ?? 0;
                    return (
                      <div key={wt.id} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 truncate text-[13px] text-[var(--color-ink-soft)]">{wt.name}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                          <div className="h-full rounded-full" style={{ width: `${(count / maxTypeCount) * 100}%`, background: wt.color }} />
                        </div>
                        <span className="w-6 shrink-0 text-right text-[13px] tabular-nums text-[var(--color-ink)]">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-[14px] text-[var(--color-ash)]">Rapor yükleniyor.</p>
        )}
      </div>
    </div>
  );
}
