import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { createMember } from "@/lib/api";

const inputClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] focus:border-[var(--color-gold)]";

interface AddMemberFormProps {
  branchId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddMemberForm({ branchId, onClose, onCreated }: AddMemberFormProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!fullName.trim()) {
      setError("Üye adı gerekli.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createMember({ branchId, fullName: fullName.trim(), phone: phone.trim() || null, notes: notes.trim() || null });
      onCreated();
      onClose();
    } catch {
      setError("Üye eklenemedi, tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Yeni üye ekle" onClose={onClose}>
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
        {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}
        <Button size="lg" onClick={handleSubmit} disabled={saving}>
          {saving ? "Ekleniyor..." : "Üyeyi ekle"}
        </Button>
      </div>
    </Modal>
  );
}
