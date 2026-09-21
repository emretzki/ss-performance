import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PackageProgressBar } from "@/components/ui/PackageProgressBar";
import { createMember, updateMember } from "@/lib/api";
import type { Member } from "@/lib/types";

const inputClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] focus:border-[var(--color-gold)]";

interface AddMemberFormProps {
  branchId: string;
  /** Present when editing an existing member instead of creating a new one. */
  member?: Member;
  onClose: () => void;
  onCreated: () => void;
}

export function AddMemberForm({ branchId, member, onClose, onCreated }: AddMemberFormProps) {
  const isEdit = Boolean(member);
  const [fullName, setFullName] = useState(member?.fullName ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [notes, setNotes] = useState(member?.notes ?? "");
  const [packageName, setPackageName] = useState(member?.packageName ?? "");
  const [packageTotalPrice, setPackageTotalPrice] = useState(member?.packageTotalPrice?.toString() ?? "");
  const [packageTotalSessions, setPackageTotalSessions] = useState(member?.packageTotalSessions?.toString() ?? "");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSessionsNum = Number(packageTotalSessions) || 0;
  const totalPriceNum = Number(packageTotalPrice) || 0;
  const unitPrice = totalSessionsNum > 0 ? totalPriceNum / totalSessionsNum : 0;
  const hadPackage = isEdit && (member?.packageTotalSessions ?? 0) > 0;
  const packageChanged =
    isEdit &&
    (packageName !== (member?.packageName ?? "") ||
      totalPriceNum !== (member?.packageTotalPrice ?? 0) ||
      totalSessionsNum !== (member?.packageTotalSessions ?? 0));
  // A member with no prior package has nothing to "continue" — treat any
  // package entered as a fresh assignment without asking, and only ask when
  // an existing package's numbers are being changed.
  const showPackageChoice = hadPackage && packageChanged;

  async function handleSubmit(resetUsage: boolean) {
    if (!fullName.trim()) {
      setError("Üye adı gerekli.");
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
          packageName: packageName.trim() || null,
          packageTotalPrice: totalPriceNum || null,
          packageTotalSessions: totalSessionsNum || null,
          resetPackageUsage: resetUsage,
          packagePaidAt: resetUsage ? paidAt : undefined,
        });
      } else {
        await createMember({ branchId, fullName: fullName.trim(), phone: phone.trim() || null, notes: notes.trim() || null });
      }
      onCreated();
      onClose();
    } catch {
      setError(isEdit ? "Kaydedilemedi, tekrar dene." : "Üye eklenemedi, tekrar dene.");
    } finally {
      setSaving(false);
    }
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
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Not (opsiyonel)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sakatlık geçmişi, tercihler vb." className={inputClass} />
        </div>

        <div className="mt-1 flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
          <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">Paket</p>
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
          {isEdit && (!hadPackage || showPackageChoice) && totalSessionsNum > 0 && (
            <div>
              <label className="mb-1.5 block text-[12px] text-[var(--color-ash)]">Ödeme tarihi</label>
              <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputClass} />
              <p className="mt-1.5 text-[12px] text-[var(--color-ash)]">
                Ciro, dersler sonraki aya sarksa bile bu tarihin ait olduğu aya yazılır.
              </p>
            </div>
          )}
          {isEdit && (member?.packageTotalSessions ?? 0) > 0 && (
            <PackageProgressBar used={member!.packageSessionsUsed} total={member!.packageTotalSessions!} size="lg" />
          )}
        </div>

        {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}

        {showPackageChoice ? (
          <div className="flex flex-col gap-2">
            <p className="text-[12px] text-[var(--color-ash)]">
              Paket bilgilerini değiştirdin. Bu mevcut paketin devamı mı, yoksa yeni bir paket mi (sayaç sıfırlanır, ciroya yeni ödeme olarak yazılır)?
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => handleSubmit(false)} disabled={saving}>
                Devamı
              </Button>
              <Button className="flex-1" onClick={() => handleSubmit(true)} disabled={saving}>
                Yeni paket başlat
              </Button>
            </div>
          </div>
        ) : (
          <Button size="lg" onClick={() => handleSubmit(!hadPackage && totalSessionsNum > 0)} disabled={saving}>
            {saving ? "Kaydediliyor..." : isEdit ? "Kaydet" : "Üyeyi ekle"}
          </Button>
        )}
      </div>
    </Modal>
  );
}
