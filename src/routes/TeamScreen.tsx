import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { GearSix, Plus } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { listBranches, listMembers, listTrainers } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { PackageProgressBar } from "@/components/ui/PackageProgressBar";
import { AddBranchForm } from "@/components/team/AddBranchForm";
import { AddMemberForm } from "@/components/team/AddMemberForm";
import { AddPersonForm } from "@/components/team/AddPersonForm";
import { EditTrainerForm } from "@/components/team/EditTrainerForm";
import type { Member, Trainer } from "@/lib/types";

type Tab = "trainers" | "members" | "branches";

export function TeamScreen() {
  const { profile } = useAuth();
  const { activeBranchId, branches } = useBranch();
  const qc = useQueryClient();
  const canManage = profile?.role === "super_admin" || profile?.role === "owner";
  const [tab, setTab] = useState<Tab>(canManage && branches.length === 0 ? "branches" : "trainers");
  const [openModal, setOpenModal] = useState<Tab | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);

  const { data: trainers = [] } = useQuery({
    queryKey: ["trainers", activeBranchId],
    queryFn: () => listTrainers(activeBranchId as string),
    enabled: Boolean(activeBranchId) && tab === "trainers",
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members", activeBranchId],
    queryFn: () => listMembers(activeBranchId as string),
    enabled: Boolean(activeBranchId) && tab === "members",
  });

  const { data: allBranches = [] } = useQuery({
    queryKey: ["branches", profile?.organizationId],
    queryFn: () => listBranches(profile?.organizationId),
    enabled: canManage && tab === "branches",
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[24px] font-bold text-[var(--color-ink)]">Ekip</h1>
            <p className="mt-1 text-[13px] text-[var(--color-ash)]">PT ve üye kayıtları.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canManage && tab !== "branches" && activeBranchId && (
              <button
                onClick={() => setOpenModal(tab)}
                className="flex h-9 items-center gap-1.5 rounded-full bg-[var(--color-ink)] px-3.5 text-[13px] font-medium text-[var(--color-paper)]"
              >
                <Plus size={15} weight="bold" />
                {tab === "trainers" ? "PT ekle" : "Üye ekle"}
              </button>
            )}
            {canManage && tab === "branches" && (
              <button
                onClick={() => setOpenModal(tab)}
                className="flex h-9 items-center gap-1.5 rounded-full bg-[var(--color-ink)] px-3.5 text-[13px] font-medium text-[var(--color-paper)]"
              >
                <Plus size={15} weight="bold" />
                Şube ekle
              </button>
            )}
            {canManage && (
              <Link
                to="/settings"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-line-strong)] text-[var(--color-ink-soft)] lg:hidden"
                aria-label="Ayarlar"
              >
                <GearSix size={16} />
              </Link>
            )}
          </div>
        </div>

        <div className="flex rounded-[var(--radius-md)] border border-[var(--color-line-strong)] p-0.5">
          {(["trainers", "members", ...(canManage ? (["branches"] as const) : [])] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex-1 rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-colors duration-100",
                tab === t ? "bg-[var(--color-ink)] text-[var(--color-paper)]" : "text-[var(--color-ink-soft)]",
              )}
            >
              {t === "trainers" ? "PT'ler" : t === "members" ? "Üyeler" : "Şubeler"}
            </button>
          ))}
        </div>

        {tab === "trainers" &&
          (trainers.length === 0 ? (
            <EmptyState message="Bu şubede henüz PT kaydı yok." />
          ) : (
            <div className="flex flex-col divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
              {trainers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => canManage && setEditingTrainer(t)}
                  disabled={!canManage}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:cursor-default"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.badgeColor }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-[var(--color-ink)]">{t.fullName}</p>
                    <p className="truncate text-[12px] text-[var(--color-ash)]">{t.phone ?? "Telefon eklenmedi"}</p>
                  </div>
                  {t.role === "trainer" && (
                    <span className="shrink-0 text-[12px] font-medium text-[var(--color-ink-soft)]">%{t.commissionRate} prim</span>
                  )}
                </button>
              ))}
            </div>
          ))}

        {tab === "members" &&
          (members.length === 0 ? (
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
                      <p className="truncate text-[12px] text-[var(--color-ash)]">
                        {m.packageName ?? m.phone ?? "Telefon eklenmedi"}
                      </p>
                    </div>
                    {m.packageTotalSessions && (
                      <span className="shrink-0 text-[12px] font-medium text-[var(--color-ink-soft)]">
                        {Math.max(0, m.packageTotalSessions - m.packageSessionsUsed)} ders kaldı
                      </span>
                    )}
                  </div>
                  {Boolean(m.packageTotalSessions) && (
                    <PackageProgressBar used={m.packageSessionsUsed} total={m.packageTotalSessions!} />
                  )}
                </button>
              ))}
            </div>
          ))}

        {tab === "branches" &&
          (allBranches.length === 0 ? (
            <EmptyState message="Henüz şube eklenmedi." />
          ) : (
            <ListPanel
              items={allBranches.map((b) => ({
                id: b.id,
                title: b.name,
                subtitle: b.address ?? "Adres eklenmedi",
                color: b.id === activeBranchId ? "var(--color-gold)" : "var(--color-ash)",
              }))}
            />
          ))}
      </div>

      {openModal === "trainers" && activeBranchId && profile && (
        <AddPersonForm
          organizationId={profile.organizationId}
          branches={branches}
          defaultBranchId={activeBranchId}
          canChooseRole={canManage}
          onClose={() => setOpenModal(null)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["trainers", activeBranchId] })}
        />
      )}

      {openModal === "members" && activeBranchId && (
        <AddMemberForm
          branchId={activeBranchId}
          onClose={() => setOpenModal(null)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["members", activeBranchId] })}
        />
      )}

      {openModal === "branches" && profile && (
        <AddBranchForm
          organizationId={profile.organizationId}
          onClose={() => setOpenModal(null)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["branches"] })}
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

      {editingTrainer && (
        <EditTrainerForm
          trainer={editingTrainer}
          onClose={() => setEditingTrainer(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["trainers", activeBranchId] })}
        />
      )}
    </div>
  );
}

function ListPanel({ items }: { items: { id: string; title: string; subtitle: string; color: string }[] }) {
  return (
    <div className="flex flex-col divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 px-4 py-3">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-[var(--color-ink)]">{item.title}</p>
            <p className="truncate text-[12px] text-[var(--color-ash)]">{item.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
