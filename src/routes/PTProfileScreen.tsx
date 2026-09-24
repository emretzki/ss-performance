import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import { CaretLeft } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { getBranchRevenue, getCommissionPeriod, getTrainerStats, listMembers, listTrainersForOrg } from "@/lib/api";
import { PackageProgressBar } from "@/components/ui/PackageProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";

function formatTL(n: number): string {
  return `${Math.round(n).toLocaleString("tr-TR")} TL`;
}

function formatPeriodLabel(start: Date, end: Date): string {
  const lastDay = new Date(end.getTime() - 86400000);
  const fmt = (d: Date) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(lastDay)}`;
}

/** A PT's own page: who they are, how many students they carry, what each
 * one's package is worth, and how much they've earned this payout period —
 * the roster an owner needs without clicking into Raporlar and Üyeler
 * separately and cross-referencing by hand. */
export function PTProfileScreen() {
  const { trainerId } = useParams<{ trainerId: string }>();
  const { profile } = useAuth();
  const { organization } = useOrganization();
  const canManage = profile?.role === "owner" || profile?.role === "super_admin";

  const orgId = profile?.organizationId;
  const { data: orgTrainers = [] } = useQuery({
    queryKey: ["trainers-org", orgId],
    queryFn: () => listTrainersForOrg(orgId as string),
    enabled: Boolean(orgId),
  });
  const trainer = orgTrainers.find((t) => t.id === trainerId);

  const { data: members = [] } = useQuery({
    queryKey: ["members", trainer?.branchId],
    queryFn: () => listMembers(trainer!.branchId),
    enabled: Boolean(trainer?.branchId),
  });
  const roster = members.filter((m) => m.assignedTrainerId === trainerId);

  const { data: stats } = useQuery({
    queryKey: ["trainer-stats", trainer?.branchId, trainerId],
    queryFn: () => getTrainerStats(trainer!.branchId, trainerId as string),
    enabled: Boolean(trainer?.branchId && trainerId),
  });

  const { start: periodStart, end: periodEnd } = getCommissionPeriod(organization?.commissionPeriodStartDay ?? 1);
  const { data: revenue } = useQuery({
    queryKey: ["branch-revenue", trainer?.branchId, periodStart.toISOString()],
    queryFn: () => getBranchRevenue(trainer!.branchId, periodStart, periodEnd),
    enabled: Boolean(trainer?.branchId),
  });
  const trainerRevenue = revenue?.byTrainer.find((b) => b.trainerId === trainerId);
  const unitPrice = trainerRevenue && trainerRevenue.sessionCount > 0 ? trainerRevenue.sessionValue / trainerRevenue.sessionCount : 0;

  // A trainer may look at their own page; anyone else's is owner/super_admin
  // only. Checked after every hook above runs (not as an early return before
  // them), so hook call order stays identical across renders.
  if (!canManage && profile?.id !== trainerId) return <Navigate to="/team" replace />;

  if (!trainer) {
    return (
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto max-w-2xl">
          <EmptyState message="PT bulunamadı." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
          <Link to="/team" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--color-ink-soft)]">
            <CaretLeft size={14} weight="bold" />
            Ekip
          </Link>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: trainer.badgeColor }} />
            <div>
              <h1 className="font-display text-[22px] font-bold text-[var(--color-ink)]">{trainer.fullName}</h1>
              <p className="text-[13px] text-[var(--color-ash)]">
                {trainer.phone ?? "Telefon eklenmedi"}
                {trainer.role === "trainer" && ` · %${trainer.commissionRate} prim`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ash)]">Öğrenci</p>
            <p className="mt-1 font-display text-[28px] font-bold leading-none tabular-nums text-[var(--color-ink)]">{roster.length}</p>
          </div>
          <div className="flex-1 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ash)]">Bu ay ders</p>
            <p className="mt-1 font-display text-[28px] font-bold leading-none tabular-nums text-[var(--color-ink)]">{stats?.thisMonth ?? "–"}</p>
          </div>
        </div>

        {trainer.role === "trainer" && trainerRevenue && (
          <section className="rounded-[var(--radius-lg)] border border-[var(--color-gold)] bg-[var(--color-gold-tint)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold-deep)]">
              Prim · {formatPeriodLabel(periodStart, periodEnd)}
            </p>
            <p className="mt-3 font-display text-[34px] font-bold leading-none tabular-nums text-[var(--color-ink)]">
              {formatTL(trainerRevenue.commission)}
            </p>
            <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--color-gold-soft)" }}>
              <p className="text-[12px] text-[var(--color-ink-soft)]">Verdiği ders</p>
              <p className="font-display text-[15px] font-semibold tabular-nums text-[var(--color-ink)]">{trainerRevenue.sessionCount}</p>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[12px] text-[var(--color-ink-soft)]">Ortalama ders ücreti</p>
              <p className="font-display text-[15px] font-semibold tabular-nums text-[var(--color-ink)]">{formatTL(unitPrice)}</p>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">Öğrencileri</p>
          {roster.length === 0 ? (
            <EmptyState message="Bu PT'ye atanmış üye yok." />
          ) : (
            <div className="flex flex-col divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
              {roster.map((m) => {
                const memberUnitPrice =
                  m.packageTotalPrice && m.packageTotalSessions ? m.packageTotalPrice / m.packageTotalSessions : null;
                return (
                  <div key={m.id} className="flex flex-col gap-2 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-[var(--color-ink)]">{m.fullName}</p>
                        <p className="truncate text-[12px] text-[var(--color-ash)]">
                          {m.packageName ?? "Paketi yok"}
                          {memberUnitPrice ? ` · ${formatTL(memberUnitPrice)}/ders` : ""}
                        </p>
                      </div>
                      {m.packageTotalSessions && (
                        <span className="shrink-0 text-[12px] font-medium text-[var(--color-ink-soft)]">
                          {Math.max(0, m.packageTotalSessions - m.packageSessionsUsed)} ders kaldı
                        </span>
                      )}
                    </div>
                    {Boolean(m.packageTotalSessions) && <PackageProgressBar used={m.packageSessionsUsed} total={m.packageTotalSessions!} />}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
