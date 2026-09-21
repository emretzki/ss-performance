import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  createBranchExpense,
  createWorkoutType,
  deleteBranchExpense,
  deleteWorkoutType,
  listBranchExpenses,
  listWorkoutTypes,
  updateBranch,
  updateOrganization,
  uploadOrgLogo,
} from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

const inputClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] focus:border-[var(--color-gold)]";

export function SettingsScreen() {
  const { profile } = useAuth();
  const { activeBranchId, branches } = useBranch();
  const { organization, refreshOrganization } = useOrganization();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeBranch = branches.find((b) => b.id === activeBranchId);

  const [orgName, setOrgName] = useState(organization?.name ?? "");
  const [accentColor, setAccentColor] = useState(organization?.accentColor ?? "#96792C");
  const [savingOrg, setSavingOrg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [branchName, setBranchName] = useState(activeBranch?.name ?? "");
  const [branchAddress, setBranchAddress] = useState(activeBranch?.address ?? "");
  const [maxSessions, setMaxSessions] = useState(activeBranch?.maxConcurrentSessions ?? 3);
  const [savingBranch, setSavingBranch] = useState(false);

  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#8A8478");

  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const isOwner = profile?.role === "owner" || profile?.role === "super_admin";

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name);
      setAccentColor(organization.accentColor);
    }
  }, [organization]);

  useEffect(() => {
    if (activeBranch) {
      setBranchName(activeBranch.name);
      setBranchAddress(activeBranch.address ?? "");
      setMaxSessions(activeBranch.maxConcurrentSessions);
    }
  }, [activeBranch]);

  const { data: workoutTypes = [] } = useQuery({
    queryKey: ["workout-types", profile?.organizationId],
    queryFn: () => listWorkoutTypes(profile!.organizationId),
    enabled: Boolean(profile?.organizationId),
  });

  const { data: branchExpenses = [] } = useQuery({
    queryKey: ["branch-expenses", activeBranchId],
    queryFn: () => listBranchExpenses(activeBranchId as string),
    enabled: Boolean(activeBranchId) && isOwner,
  });

  if (!organization) return <EmptyState message="Ayarlar yükleniyor." />;

  async function handleSaveOrg() {
    setSavingOrg(true);
    try {
      await updateOrganization(organization!.id, { name: orgName || organization!.name, accentColor, logoUrl: organization!.logoUrl });
      refreshOrganization();
    } finally {
      setSavingOrg(false);
    }
  }

  async function handleLogoChange(file: File) {
    setUploadingLogo(true);
    try {
      const url = await uploadOrgLogo(organization!.ownerAuthId, file);
      await updateOrganization(organization!.id, { name: organization!.name, accentColor: organization!.accentColor, logoUrl: url });
      refreshOrganization();
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSaveBranch() {
    if (!activeBranchId) return;
    setSavingBranch(true);
    try {
      await updateBranch(activeBranchId, { name: branchName, address: branchAddress || null, maxConcurrentSessions: maxSessions });
      qc.invalidateQueries({ queryKey: ["branches"] });
    } finally {
      setSavingBranch(false);
    }
  }

  async function handleAddType() {
    if (!newTypeName.trim() || !profile) return;
    await createWorkoutType({ organizationId: profile.organizationId, name: newTypeName.trim(), color: newTypeColor });
    setNewTypeName("");
    qc.invalidateQueries({ queryKey: ["workout-types", profile.organizationId] });
  }

  async function handleDeleteType(id: string) {
    await deleteWorkoutType(id);
    qc.invalidateQueries({ queryKey: ["workout-types", profile?.organizationId] });
  }

  async function handleAddExpense() {
    const amount = Number(newExpenseAmount);
    if (!newExpenseName.trim() || !amount || !activeBranchId) return;
    await createBranchExpense({ branchId: activeBranchId, name: newExpenseName.trim(), amount });
    setNewExpenseName("");
    setNewExpenseAmount("");
    qc.invalidateQueries({ queryKey: ["branch-expenses", activeBranchId] });
  }

  async function handleDeleteExpense(id: string) {
    await deleteBranchExpense(id);
    qc.invalidateQueries({ queryKey: ["branch-expenses", activeBranchId] });
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <div>
          <h1 className="font-display text-[24px] font-bold text-[var(--color-ink)]">Ayarlar</h1>
          <p className="mt-1 text-[13px] text-[var(--color-ash)]">Marka, şube kapasitesi ve idman türleri.</p>
        </div>

        <section className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">Marka</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] text-[11px] text-[var(--color-ash)]"
            >
              {organization.logoUrl ? <img src={organization.logoUrl} alt="" className="h-full w-full object-cover" /> : "Logo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoChange(file);
              }}
            />
            <div className="flex-1">
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Salon adı</label>
              <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Marka rengi</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)]"
              />
              <span className="text-[13px] text-[var(--color-ash)]">{accentColor}</span>
            </div>
          </div>
          <Button onClick={handleSaveOrg} disabled={savingOrg} className="self-start">
            {savingOrg ? "Kaydediliyor..." : "Markayı kaydet"}
          </Button>
        </section>

        {activeBranch && (
          <section className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">Şube — {activeBranch.name}</p>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Şube adı</label>
              <input value={branchName} onChange={(e) => setBranchName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Adres</label>
              <input value={branchAddress ?? ""} onChange={(e) => setBranchAddress(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Bir saatte maksimum ders</label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxSessions}
                onChange={(e) => setMaxSessions(Number(e.target.value) || 1)}
                className={inputClass}
              />
              <p className="mt-1.5 text-[12px] text-[var(--color-ash)]">Salon büyüklüğüne göre ayarla — bu, takvimde aynı anda kaç ders girilebileceğini belirler.</p>
            </div>
            <Button onClick={handleSaveBranch} disabled={savingBranch} className="self-start">
              {savingBranch ? "Kaydediliyor..." : "Şubeyi kaydet"}
            </Button>
          </section>
        )}

        <section className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">İdman türleri</p>
          <p className="text-[12px] text-[var(--color-ash)]">Boks, Kickbox, Fitness, Hyrox gibi — raporlarda hangi türe daha çok/az yatırım yaptığını görebilesin diye.</p>

          <div className="flex flex-col divide-y divide-[var(--color-line)] rounded-[var(--radius-md)] border border-[var(--color-line)]">
            {workoutTypes.map((wt) => (
              <div key={wt.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: wt.color }} />
                <span className="flex-1 text-[14px] text-[var(--color-ink)]">{wt.name}</span>
                <button onClick={() => handleDeleteType(wt.id)} className="text-[var(--color-ash)] hover:text-[var(--color-danger)]" aria-label="Sil">
                  <Trash size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input type="color" value={newTypeColor} onChange={(e) => setNewTypeColor(e.target.value)} className="h-11 w-12 shrink-0 cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-line-strong)]" />
            <input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Yeni tür (örn. Hyrox)" className={inputClass} />
            <Button onClick={handleAddType} className="shrink-0">
              Ekle
            </Button>
          </div>
        </section>

        {isOwner && activeBranch && (
          <section className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">Giderler — {activeBranch.name}</p>
            <p className="text-[12px] text-[var(--color-ash)]">
              Kira, elektrik gibi düzenli aylık giderler. Her ay otomatik olarak salon karından düşülür.
            </p>

            <div className="flex flex-col divide-y divide-[var(--color-line)] rounded-[var(--radius-md)] border border-[var(--color-line)]">
              {branchExpenses.length === 0 ? (
                <p className="px-3 py-2.5 text-[13px] text-[var(--color-ash)]">Henüz gider eklenmedi.</p>
              ) : (
                branchExpenses.map((exp) => (
                  <div key={exp.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="flex-1 text-[14px] text-[var(--color-ink)]">{exp.name}</span>
                    <span className="text-[13px] tabular-nums text-[var(--color-ink-soft)]">{Math.round(exp.amount).toLocaleString("tr-TR")} TL</span>
                    <button onClick={() => handleDeleteExpense(exp.id)} className="text-[var(--color-ash)] hover:text-[var(--color-danger)]" aria-label="Sil">
                      <Trash size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={newExpenseName}
                onChange={(e) => setNewExpenseName(e.target.value)}
                placeholder="Gider adı (örn. Kira)"
                className={inputClass}
              />
              <input
                type="number"
                min={0}
                value={newExpenseAmount}
                onChange={(e) => setNewExpenseAmount(e.target.value)}
                placeholder="Aylık TL"
                className={`${inputClass} w-32 shrink-0`}
              />
              <Button onClick={handleAddExpense} className="shrink-0">
                Ekle
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
