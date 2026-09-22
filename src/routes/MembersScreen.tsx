import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "@phosphor-icons/react";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { listMembers } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { PackageProgressBar } from "@/components/ui/PackageProgressBar";
import { AddMemberForm } from "@/components/team/AddMemberForm";
import type { Member } from "@/lib/types";

type PackageStatus = "none" | "active" | "finished";
type Filter = "all" | "active" | "finished";

function packageStatus(m: Member): PackageStatus {
  if (!m.packageTotalSessions) return "none";
  return m.packageSessionsUsed >= m.packageTotalSessions ? "finished" : "active";
}

function PackageStatusBadge({ status }: { status: PackageStatus }) {
  if (status === "none") return null;
  const isActive = status === "active";
  return (
    <span
      className={clsx(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
        isActive ? "bg-[var(--color-success-tint)] text-[var(--color-success)]" : "bg-[var(--color-danger-tint)] text-[var(--color-danger)]",
      )}
    >
      {isActive ? "Paketi devam ediyor" : "Paketi bitti"}
    </span>
  );
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "active", label: "Devam eden paketler" },
  { key: "finished", label: "Biten paketler" },
];

export function MembersScreen() {
  const { profile } = useAuth();
  const { activeBranchId, branches } = useBranch();
  const qc = useQueryClient();
  const canManage = profile?.role === "super_admin" || profile?.role === "owner";
  const [openAdd, setOpenAdd] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const { data: members = [] } = useQuery({
    queryKey: ["members", activeBranchId],
    queryFn: () => listMembers(activeBranchId as string),
    enabled: Boolean(activeBranchId),
  });

  const filtered = filter === "all" ? members : members.filter((m) => packageStatus(m) === filter);

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

        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={clsx(
                "shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-100",
                filter === f.key
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
                  : "border-[var(--color-line-strong)] text-[var(--color-ink-soft)]",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            message={
              members.length === 0
                ? "Bu şubede henüz üye kaydı yok."
                : filter === "active"
                  ? "Devam eden paketi olan üye yok."
                  : filter === "finished"
                    ? "Paketi biten üye yok."
                    : "Üye bulunamadı."
            }
          />
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
            {filtered.map((m) => {
              const status = packageStatus(m);
              return (
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
                    <PackageStatusBadge status={status} />
                    {m.packageTotalSessions && (
                      <span className="shrink-0 text-[12px] font-medium text-[var(--color-ink-soft)]">
                        {Math.max(0, m.packageTotalSessions - m.packageSessionsUsed)} ders kaldı
                      </span>
                    )}
                  </div>
                  {Boolean(m.packageTotalSessions) && <PackageProgressBar used={m.packageSessionsUsed} total={m.packageTotalSessions!} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {openAdd && activeBranchId && (
        <AddMemberForm
          defaultBranchId={activeBranchId}
          branches={branches}
          onClose={() => setOpenAdd(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["members"] })}
        />
      )}

      {editingMember && activeBranchId && (
        <AddMemberForm
          defaultBranchId={activeBranchId}
          branches={branches}
          member={members.find((m) => m.id === editingMember.id) ?? editingMember}
          onClose={() => setEditingMember(null)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["members"] })}
        />
      )}
    </div>
  );
}
