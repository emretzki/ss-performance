import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { listMembers, releaseMemberFromTrainer } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PackageProgressBar } from "@/components/ui/PackageProgressBar";

/** A trainer's own read-only roster: who they're currently training and how
 * many sessions each has left — no edit access (members_write stays
 * owner/super_admin only), just visibility plus a self-service way to hand
 * a member off the roster entirely ("artık bu üyeye ders vermiyorum"),
 * distinct from handing off a single session (see ManageSessionSheet). */
export function MyMembersScreen() {
  const { profile } = useAuth();
  const { activeBranchId } = useBranch();
  const qc = useQueryClient();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ["members", activeBranchId],
    queryFn: () => listMembers(activeBranchId as string),
    enabled: Boolean(activeBranchId),
  });
  const mine = members.filter((m) => m.assignedTrainerId === profile?.id);

  async function handleRelease(memberId: string) {
    setReleasingId(memberId);
    try {
      await releaseMemberFromTrainer(memberId);
      qc.invalidateQueries({ queryKey: ["members", activeBranchId] });
      setConfirmingId(null);
    } finally {
      setReleasingId(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <div>
          <h1 className="font-display text-[24px] font-bold text-[var(--color-ink)]">Üyelerim</h1>
          <p className="mt-1 text-[13px] text-[var(--color-ash)]">Sana atanmış üyeler ve kalan ders sayıları.</p>
        </div>

        {mine.length === 0 ? (
          <EmptyState message="Henüz sana atanmış bir üye yok." />
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
            {mine.map((m) => (
              <div key={m.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-ash)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-[var(--color-ink)]">{m.fullName}</p>
                    <p className="truncate text-[12px] text-[var(--color-ash)]">{m.packageName ?? m.phone ?? "Telefon eklenmedi"}</p>
                  </div>
                  {m.packageTotalSessions && (
                    <span className="shrink-0 text-[12px] font-medium text-[var(--color-ink-soft)]">
                      {Math.max(0, m.packageTotalSessions - m.packageSessionsUsed)} ders kaldı
                    </span>
                  )}
                </div>
                {Boolean(m.packageTotalSessions) && <PackageProgressBar used={m.packageSessionsUsed} total={m.packageTotalSessions!} />}

                {confirmingId === m.id ? (
                  <div className="mt-1 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-2.5">
                    <p className="flex-1 text-[12px] text-[var(--color-ink-soft)]">
                      {m.fullName} artık senin öğrencin listende görünmeyecek. Emin misin?
                    </p>
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="shrink-0 text-[12px] font-medium text-[var(--color-ink-soft)]"
                    >
                      Vazgeç
                    </button>
                    <Button
                      variant="secondary"
                      size="md"
                      className="shrink-0 !text-[var(--color-danger)]"
                      onClick={() => handleRelease(m.id)}
                      disabled={releasingId === m.id}
                    >
                      {releasingId === m.id ? "İşleniyor..." : "Evet, bırak"}
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingId(m.id)}
                    className={clsx("self-start text-[12px] font-medium text-[var(--color-ash)] hover:text-[var(--color-danger)]")}
                  >
                    Ders vermeyi bıraktım
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
