import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { getBranchRevenue, getTrainerStats, listTrainers, listWorkoutTypes } from "@/lib/api";
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

/** A trend indicator that reads as direction + magnitude at a glance without
 * a stock-chart arrow glyph: a diverging bar from a center tick, growth in
 * the brand gold, decline in a neutral tone (this is an activity count, not
 * a problem to flag red over). */
function TrendChip({ value, label }: { value: number; label: string }) {
  const positive = value >= 0;
  const magnitude = Math.min(Math.abs(value), 100);
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-9 shrink-0 overflow-hidden rounded-full bg-[var(--color-line)]">
        <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--color-line-strong)]" />
        <div
          className="absolute inset-y-0 rounded-full"
          style={{
            width: `${magnitude / 2}%`,
            left: positive ? "50%" : undefined,
            right: positive ? undefined : "50%",
            background: positive ? "var(--color-gold)" : "var(--color-ash)",
          }}
        />
      </div>
      <span className="text-[12px] leading-tight" style={{ color: positive ? "var(--color-gold-deep)" : "var(--color-ash)" }}>
        <span className="font-semibold tabular-nums">
          {positive ? "+" : ""}
          {value}%
        </span>{" "}
        <span className="text-[var(--color-ash)]">{label}</span>
      </span>
    </div>
  );
}

const WEEKDAY = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

/** A bespoke week strip rather than a chart-library grid: today is picked out
 * in solid ink so "where am I in the week" reads instantly, other days sit in
 * a quieter gold tint, and counts only print above bars that have activity. */
function DayBars({ byDay }: { byDay: { date: string; count: number }[] }) {
  const max = Math.max(1, ...byDay.map((d) => d.count));
  const todayKey = new Date().toDateString();
  return (
    <div className="flex items-end gap-2">
      {byDay.map((d) => {
        const date = new Date(d.date);
        const isToday = date.toDateString() === todayKey;
        const h = Math.max(3, (d.count / max) * 64);
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              className="text-[10px] font-medium tabular-nums text-[var(--color-ash)]"
              style={{ visibility: d.count > 0 ? "visible" : "hidden" }}
            >
              {d.count}
            </span>
            <div className="flex h-16 w-full items-end justify-center">
              <div
                className="w-full max-w-[22px] rounded-t-[4px] transition-[height] duration-300"
                style={{ height: h, background: isToday ? "var(--color-ink)" : "var(--color-gold-soft)" }}
              />
            </div>
            <span
              className="text-[11px] tabular-nums"
              style={{ color: isToday ? "var(--color-ink)" : "var(--color-ash)", fontWeight: isToday ? 600 : 400 }}
            >
              {WEEKDAY[(date.getDay() + 6) % 7]}
            </span>
          </div>
        );
      })}
    </div>
  );
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
            {/* Activity — everyone's view, counts not money. One unified
                surface (not a grid of interchangeable tiles) so it reads as
                a single performance summary: headline this-month figure,
                a quieter this-week figure beside it, then the shape of the
                week and the type breakdown underneath. */}
            <section className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ash)]">Aktivite</p>

              <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                <div>
                  <p className="text-[13px] text-[var(--color-ash)]">Bu ay</p>
                  <p className="font-display text-[44px] font-bold leading-none tabular-nums text-[var(--color-ink)]">{shown.thisMonth}</p>
                  <div className="mt-2">
                    <TrendChip value={pct(shown.thisMonth, shown.lastMonth)} label="geçen aya göre" />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[13px] text-[var(--color-ash)]">Bu hafta</p>
                  <p className="font-display text-[22px] font-bold leading-none tabular-nums text-[var(--color-ink-soft)]">{shown.thisWeek}</p>
                  <div className="mt-2 flex justify-end">
                    <TrendChip value={pct(shown.thisWeek, shown.lastWeek)} label="geçen haftaya göre" />
                  </div>
                </div>
              </div>

              <div className="my-5 h-px bg-[var(--color-line)]" />

              <p className="mb-3 text-[12px] font-medium text-[var(--color-ink-soft)]">Son 7 gün</p>
              <DayBars byDay={shown.byDay} />

              <div className="my-5 h-px bg-[var(--color-line)]" />

              <p className="mb-1 text-[12px] font-medium text-[var(--color-ink-soft)]">Bu ay idman türüne göre</p>
              <p className="mb-3 text-[12px] text-[var(--color-ash)]">Hangi türe az ders giriliyor, nereye yatırım gerekebilir görürsün.</p>
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
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                          <div className="h-full rounded-full" style={{ width: `${(count / maxTypeCount) * 100}%`, background: wt.color }} />
                        </div>
                        <span className="w-6 shrink-0 text-right text-[13px] tabular-nums text-[var(--color-ink)]">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Money — branch-wide, owner/super_admin only. Deliberately the
                opposite register of the activity card above: a dark, fixed
                "ledger" panel that reads as sensitive financial data at a
                glance, with salon karı as the single largest, most
                contrasted figure on the whole page — its own color carries
                the profit/loss sign, no icon needed. */}
            {showBranchTotal && revenue && (
              <section className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-ledger)] p-5">
                <div className="absolute inset-x-0 top-0 h-[3px] bg-[var(--color-gold)]" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold-soft)]">Şube geneli · bu ay</p>
                <p className="mt-2 max-w-[34ch] text-[12px] text-[var(--color-ledger-ink-soft)]">
                  Ciro, paketin ödendiği aya yazılır — dersler sonraki aya sarksa bile.
                </p>

                <p
                  className="mt-3 font-display text-[46px] font-bold leading-none tabular-nums"
                  style={{ color: revenue.ownerProfit >= 0 ? "var(--color-gold-soft)" : "var(--color-ledger-loss)" }}
                >
                  {formatTL(revenue.ownerProfit)}
                </p>
                <p className="text-[13px] text-[var(--color-ledger-ink)]">Salon karı</p>

                <div className="mt-5 flex gap-4 border-t pt-4" style={{ borderColor: "var(--color-ledger-line)" }}>
                  <div className="flex-1">
                    <p className="text-[11px] text-[var(--color-ledger-ink-soft)]">Toplam ciro</p>
                    <p className="mt-1 font-display text-[16px] font-semibold tabular-nums text-[var(--color-ledger-ink)]">
                      {formatTL(revenue.totalRevenue)}
                    </p>
                  </div>
                  <div className="flex-1 border-l pl-4" style={{ borderColor: "var(--color-ledger-line)" }}>
                    <p className="text-[11px] text-[var(--color-ledger-ink-soft)]">Giderler</p>
                    <p className="mt-1 font-display text-[16px] font-semibold tabular-nums text-[var(--color-ledger-ink)]">
                      {formatTL(revenue.totalExpenses)}
                    </p>
                  </div>
                  <div className="flex-1 border-l pl-4" style={{ borderColor: "var(--color-ledger-line)" }}>
                    <p className="text-[11px] text-[var(--color-ledger-ink-soft)]">PT primi</p>
                    <p className="mt-1 font-display text-[16px] font-semibold tabular-nums text-[var(--color-ledger-ink)]">
                      {formatTL(revenue.commissionPayable)}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Money — a single PT's own figures. Personal, quieter than the
                branch ledger above: a warm gold-tinted card, not a dark one,
                so it never reads as the same category of data. Prim is the
                headline; the session-value figure sits underneath, clearly
                labeled apart from "ciro" since it's session-basis, not
                cash-basis. */}
            {!showBranchTotal && trainerRevenue && (
              <section className="rounded-[var(--radius-lg)] border border-[var(--color-gold)] bg-[var(--color-gold-tint)] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold-deep)]">
                  {isTrainer ? "Senin bu ayın" : "PT · bu ay"}
                </p>
                <p className="mt-3 font-display text-[38px] font-bold leading-none tabular-nums text-[var(--color-ink)]">
                  {formatTL(trainerRevenue.commission)}
                </p>
                <p className="text-[13px] text-[var(--color-ink-soft)]">{isTrainer ? "Kazandığın prim" : "Ödenecek prim"}</p>

                <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--color-gold-soft)" }}>
                  <p className="text-[12px] text-[var(--color-ink-soft)]">
                    {isTrainer ? "Verdiğin derslerin değeri" : "Verdiği derslerin değeri"}
                  </p>
                  <p className="font-display text-[16px] font-semibold tabular-nums text-[var(--color-ink)]">
                    {formatTL(trainerRevenue.sessionValue)}
                  </p>
                </div>
              </section>
            )}
          </>
        ) : (
          <p className="text-[14px] text-[var(--color-ash)]">Rapor yükleniyor.</p>
        )}
      </div>
    </div>
  );
}
