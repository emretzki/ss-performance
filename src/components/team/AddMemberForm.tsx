import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash } from "@phosphor-icons/react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PackageProgressBar } from "@/components/ui/PackageProgressBar";
import {
  addMemberPackage,
  createMember,
  deleteUpcomingPackage,
  listCancelledSessionsForMember,
  listMemberPackageHistory,
  listTrainers,
  restoreCancelledSession,
  updateMember,
} from "@/lib/api";
import type { Branch, Member } from "@/lib/types";

const inputClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] focus:border-[var(--color-gold)]";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatTL(n: number): string {
  return `${Math.round(n).toLocaleString("tr-TR")} TL`;
}

interface AddMemberFormProps {
  /** Branch a brand-new member is created into; ignored (in favor of the
   * branch picker below) once the org has more than one branch. */
  defaultBranchId: string;
  /** Every branch in the org — the picker only renders when there's a real
   * choice to make (branches.length > 1). */
  branches: Branch[];
  /** Present when editing an existing member instead of creating a new one. */
  member?: Member;
  onClose: () => void;
  onCreated: () => void;
}

export function AddMemberForm({ defaultBranchId, branches, member, onClose, onCreated }: AddMemberFormProps) {
  const isEdit = Boolean(member);
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(member?.fullName ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [notes, setNotes] = useState(member?.notes ?? "");
  const [branchId, setBranchId] = useState(member?.branchId ?? defaultBranchId);
  const [assignedTrainerId, setAssignedTrainerId] = useState(member?.assignedTrainerId ?? "");
  const [packageName, setPackageName] = useState(member?.packageName ?? "");
  const [packageTotalPrice, setPackageTotalPrice] = useState(member?.packageTotalPrice?.toString() ?? "");
  const [packageTotalSessions, setPackageTotalSessions] = useState(member?.packageTotalSessions?.toString() ?? "");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newPkgOpen, setNewPkgOpen] = useState(false);
  const [newPkgName, setNewPkgName] = useState("");
  const [newPkgPrice, setNewPkgPrice] = useState("");
  const [newPkgSessions, setNewPkgSessions] = useState("");
  const [newPkgPaidAt, setNewPkgPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [savingNewPkg, setSavingNewPkg] = useState(false);
  // Mirrors member.packageSessionsUsed, but resettable locally: the "start
  // now" action below resets usage to 0 while this modal stays open, before
  // the parent's stale member prop has a chance to refetch and reflect it.
  const [sessionsUsedLocal, setSessionsUsedLocal] = useState(member?.packageSessionsUsed ?? 0);

  const totalSessionsNum = Number(packageTotalSessions) || 0;
  const totalPriceNum = Number(packageTotalPrice) || 0;
  const unitPrice = totalSessionsNum > 0 ? totalPriceNum / totalSessionsNum : 0;
  const hadPackage = isEdit && (member?.packageTotalSessions ?? 0) > 0;

  const { data: history = [] } = useQuery({
    queryKey: ["member-packages", member?.id],
    queryFn: () => listMemberPackageHistory(member!.id),
    enabled: Boolean(member?.id),
  });

  // Scoped to the currently-picked branch, not defaultBranchId — a
  // multi-branch owner can switch which branch this member belongs to right
  // above, and the PT list has to follow that switch.
  const { data: branchTrainers = [] } = useQuery({
    queryKey: ["trainers", branchId],
    queryFn: () => listTrainers(branchId),
    enabled: Boolean(branchId),
  });
  const upcoming = history.filter((p) => p.status === "upcoming");
  const completed = history.filter((p) => p.status === "completed");

  const { data: cancelledSessions = [] } = useQuery({
    queryKey: ["cancelled-sessions", member?.id],
    queryFn: () => listCancelledSessionsForMember(member!.id),
    enabled: Boolean(member?.id),
  });
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // A branch switch can leave the picked PT belonging to the old branch —
  // clear it instead of silently submitting a mismatched assignment.
  useEffect(() => {
    if (assignedTrainerId && !branchTrainers.some((t) => t.id === assignedTrainerId)) {
      setAssignedTrainerId("");
    }
  }, [branchTrainers, assignedTrainerId]);

  function invalidateAll() {
    // Broad match (no branchId) on purpose: reassigning a member's branch
    // means both the old and new branch's member lists need to refresh.
    qc.invalidateQueries({ queryKey: ["members"] });
    if (member) {
      qc.invalidateQueries({ queryKey: ["member-packages", member.id] });
      qc.invalidateQueries({ queryKey: ["cancelled-sessions", member.id] });
    }
  }

  async function handleRestoreSession(id: string) {
    setRestoringId(id);
    try {
      await restoreCancelledSession(id);
      invalidateAll();
    } finally {
      setRestoringId(null);
    }
  }

  async function handleSubmit() {
    if (!fullName.trim()) {
      setError("Üye adı gerekli.");
      return;
    }
    if (!assignedTrainerId) {
      setError("Bu üyenin bir PT'si seçilmeli.");
      return;
    }
    if (packageTotalPrice && !packageTotalSessions) {
      setError("Toplam ders sayısı girilmeden birim fiyat hesaplanamaz.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit && member) {
        await updateMember(member.id, {
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          notes: notes.trim() || null,
          branchId,
          assignedTrainerId,
          ...(hadPackage && {
            packageName: packageName.trim() || null,
            packageTotalPrice: totalPriceNum || null,
            packageTotalSessions: totalSessionsNum || null,
          }),
        });
        // A member with no prior package has nothing to correct — filling in
        // package fields here is a first-ever assignment, not an edit.
        if (!hadPackage && totalSessionsNum > 0 && totalPriceNum > 0 && packageName.trim()) {
          await addMemberPackage({
            memberId: member.id,
            branchId,
            name: packageName.trim(),
            totalPrice: totalPriceNum,
            totalSessions: totalSessionsNum,
            paidAt,
            startNow: true,
          });
        }
      } else {
        const created = await createMember({
          branchId,
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          notes: notes.trim() || null,
          assignedTrainerId,
        });
        // Package fields were optional above the fold, on the same form — if
        // they were filled in, this is the member's first-ever package, not
        // a separate step the owner has to remember to come back for.
        if (totalSessionsNum > 0 && totalPriceNum > 0 && packageName.trim()) {
          await addMemberPackage({
            memberId: created.id,
            branchId,
            name: packageName.trim(),
            totalPrice: totalPriceNum,
            totalSessions: totalSessionsNum,
            paidAt,
            startNow: true,
          });
        }
      }
      invalidateAll();
      onCreated();
      onClose();
    } catch {
      setError(isEdit ? "Kaydedilemedi, tekrar dene." : "Üye eklenemedi, tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNewPackage(startNow: boolean) {
    const price = Number(newPkgPrice) || 0;
    const sessions = Number(newPkgSessions) || 0;
    if (!newPkgName.trim() || !price || !sessions || !member) return;
    setSavingNewPkg(true);
    try {
      await addMemberPackage({
        memberId: member.id,
        branchId,
        name: newPkgName.trim(),
        totalPrice: price,
        totalSessions: sessions,
        paidAt: newPkgPaidAt,
        startNow,
      });
      if (startNow) {
        // The modal stays open after this (unlike the main Kaydet flow), so
        // sync the "active package" fields locally — they're controlled
        // inputs seeded from `member` only once at mount, and the parent's
        // member prop won't reflect this until it refetches.
        setPackageName(newPkgName.trim());
        setPackageTotalPrice(String(price));
        setPackageTotalSessions(String(sessions));
        setSessionsUsedLocal(0);
      }
      setNewPkgName("");
      setNewPkgPrice("");
      setNewPkgSessions("");
      setNewPkgOpen(false);
      invalidateAll();
      onCreated();
    } finally {
      setSavingNewPkg(false);
    }
  }

  async function handleDeleteUpcoming(id: string) {
    await deleteUpcomingPackage(id);
    invalidateAll();
  }

  return (
    <Modal title={isEdit ? "Üyeyi düzenle" : "Yeni üye ekle"} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Ad Soyad</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Telefon (opsiyonel)</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </div>
        {branches.length > 1 && (
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Şube</label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputClass}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">PT</label>
          <select value={assignedTrainerId} onChange={(e) => setAssignedTrainerId(e.target.value)} className={inputClass}>
            <option value="" disabled>
              PT seç
            </option>
            {branchTrainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Not (opsiyonel)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sakatlık geçmişi, tercihler vb." className={inputClass} />
        </div>

        <div className="mt-1 flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
          <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">{hadPackage ? "Aktif paket" : "Paket"}</p>
          <div>
            <label className="mb-1.5 block text-[12px] text-[var(--color-ash)]">Paket adı</label>
            <input value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="Örn. 8 Ders Paketi" className={inputClass} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1.5 block text-[12px] text-[var(--color-ash)]">Toplam ücret (TL)</label>
              <input
                type="number"
                min={0}
                value={packageTotalPrice}
                onChange={(e) => setPackageTotalPrice(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-[12px] text-[var(--color-ash)]">Toplam ders</label>
              <input
                type="number"
                min={0}
                value={packageTotalSessions}
                onChange={(e) => setPackageTotalSessions(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          {unitPrice > 0 && (
            <p className="text-[12px] text-[var(--color-ash)]">
              Birim fiyat: <span className="font-medium text-[var(--color-ink)]">{unitPrice.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL</span> / ders
            </p>
          )}
          {isEdit && !hadPackage && totalSessionsNum > 0 && (
            <div>
              <label className="mb-1.5 block text-[12px] text-[var(--color-ash)]">Ödeme tarihi</label>
              <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputClass} />
              <p className="mt-1.5 text-[12px] text-[var(--color-ash)]">
                Ciro, dersler sonraki aya sarksa bile bu tarihin ait olduğu aya yazılır.
              </p>
            </div>
          )}
          {hadPackage && <PackageProgressBar used={sessionsUsedLocal} total={totalSessionsNum} size="lg" />}
          {!hadPackage && (
            <p className="text-[12px] text-[var(--color-ash)]">
              Paket adı, ücret ve ders sayısını doldurup kaydettiğinde bu üyenin ilk paketi başlar.
            </p>
          )}
        </div>

        {hadPackage && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-3">
            {!newPkgOpen ? (
              <Button variant="secondary" size="md" className="w-full" onClick={() => setNewPkgOpen(true)}>
                + Yeni paket ekle
              </Button>
            ) : (
              <div className="flex flex-col gap-2.5">
                <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">Yeni paket</p>
                <input value={newPkgName} onChange={(e) => setNewPkgName(e.target.value)} placeholder="Paket adı" className={inputClass} />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    value={newPkgPrice}
                    onChange={(e) => setNewPkgPrice(e.target.value)}
                    placeholder="Toplam ücret (TL)"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min={0}
                    value={newPkgSessions}
                    onChange={(e) => setNewPkgSessions(e.target.value)}
                    placeholder="Toplam ders"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] text-[var(--color-ash)]">Ödeme tarihi</label>
                  <input type="date" value={newPkgPaidAt} onChange={(e) => setNewPkgPaidAt(e.target.value)} className={inputClass} />
                </div>
                <p className="text-[12px] text-[var(--color-ash)]">
                  Mevcut paket henüz bitmediyse <strong>gelecek paket</strong> olarak ekle — ciroya hemen yazılır, ama bu üyenin
                  ders sayacı mevcut paket bitene kadar değişmez.
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => handleAddNewPackage(false)} disabled={savingNewPkg}>
                    Gelecek paket olarak ekle
                  </Button>
                  <Button className="flex-1" onClick={() => handleAddNewPackage(true)} disabled={savingNewPkg}>
                    Hemen başlat
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">Gelecek paketler</p>
            <div className="flex flex-col divide-y divide-[var(--color-line)] rounded-[var(--radius-md)] border border-[var(--color-line)]">
              {upcoming.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-[var(--color-ink)]">{p.packageName}</p>
                    <p className="text-[12px] text-[var(--color-ash)]">
                      {formatTL(p.amount)} · {p.totalSessions} ders · ödeme {formatDate(p.paidAt)}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteUpcoming(p.id)} className="text-[var(--color-ash)] hover:text-[var(--color-danger)]" aria-label="Sil">
                    <Trash size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {completed.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">Geçmiş paketler</p>
            <div className="flex flex-col divide-y divide-[var(--color-line)] rounded-[var(--radius-md)] border border-[var(--color-line)]">
              {completed.map((p) => (
                <div key={p.id} className="px-3 py-2.5">
                  <p className="truncate text-[13px] text-[var(--color-ink)]">{p.packageName}</p>
                  <p className="text-[12px] text-[var(--color-ash)]">
                    {formatTL(p.amount)} · {p.sessionsUsed ?? 0}/{p.totalSessions} ders kullanıldı · ödeme {formatDate(p.paidAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {cancelledSessions.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">İptal edilen dersler</p>
            <p className="text-[12px] text-[var(--color-ash)]">
              Ders başlamadan iptal edilenler üyenin paketine iade edildi; başladıktan sonra iptal edilenler paketten
              düşülmüş kaldı. Bir tanesi aslında verildiyse "Geri yükle"ye basarak (tekrar) pakete yansıtabilirsin.
            </p>
            <div className="flex flex-col divide-y divide-[var(--color-line)] rounded-[var(--radius-md)] border border-[var(--color-line)]">
              {cancelledSessions.map((s) => {
                const trainerName = branchTrainers.find((t) => t.id === s.trainerId)?.fullName ?? "Bilinmeyen PT";
                return (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-[var(--color-ink)]">{formatDateTime(s.startsAt)}</p>
                      <p className="text-[12px] text-[var(--color-ash)]">
                        {trainerName} · {s.cancelRefunded ? "pakete iade edildi" : "paketten düşülü kaldı"}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="md"
                      className="shrink-0"
                      onClick={() => handleRestoreSession(s.id)}
                      disabled={restoringId === s.id}
                    >
                      {restoringId === s.id ? "Geri yükleniyor..." : "Geri yükle"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}

        <Button size="lg" onClick={handleSubmit} disabled={saving}>
          {saving ? "Kaydediliyor..." : isEdit ? "Kaydet" : "Üyeyi ekle"}
        </Button>
      </div>
    </Modal>
  );
}
