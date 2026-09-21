import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { listMembers } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { PackageProgressBar } from "@/components/ui/PackageProgressBar";
import { AddMemberForm } from "@/components/team/AddMemberForm";
import type { Member } from "@/lib/types";

export function MembersScreen() {
  const { profile } = useAuth();
  const { activeBranchId } = useBranch();
  const qc = useQueryClient();
  const canManage = profile?.role === "super_admin" || profile?.role === "owner";
  const [openAdd, setOpenAdd] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ["members", activeBranchId],
    queryFn: () => listMembers(activeBranchId as string),
    enabled: Boolean(activeBranchId),
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[24px] font-bold text-[var(--color-ink)]">Üyeler</h1>
            <p className="mt-1 text-[13px] text-[var(--color-ash)]">Üye kayıtları ve paketleri.</p>
          </div>
          {canManage && activeBranchId && (
            <button
              onClick={() => setOpenAdd(true)}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[var(--color-ink)] px-3.5 text-[13px] font-medium text-[var(--color-paper)]"
            >
              <Plus size={15} weight="bold" />
              Üye ekle
            </button>
          )}
        </div>

        {members.length === 0 ? (
          <EmptyState message="Bu şubede henüz üye kaydı yok." />
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => canManage && setEditingMember(m)}
                disabled={!canManage}
                className="flex w-full flex-col gap-2 px-4 py-3 text-left disabled:cursor-default"
              >
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
              </button>
            ))}
          </div>
        )}
      </div>

      {openAdd && activeBranchId && (
        <AddMemberForm
          branchId={activeBranchId}
          onClose={() => setOpenAdd(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["members", activeBranchId] })}
        />
      )}

      {editingMember && activeBranchId && (
        <AddMemberForm
          branchId={activeBranchId}
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["members", activeBranchId] })}
        />
      )}
    </div>
  );
}
