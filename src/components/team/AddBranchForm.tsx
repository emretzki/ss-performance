import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { createBranch } from "@/lib/api";

const inputClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] focus:border-[var(--color-gold)]";

interface AddBranchFormProps {
  organizationId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddBranchForm({ organizationId, onClose, onCreated }: AddBranchFormProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Şube adı gerekli.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createBranch({ organizationId, name: name.trim(), address: address.trim() || null });
      onCreated();
      onClose();
    } catch {
      setError("Şube eklenemedi, tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Yeni şube ekle" subtitle="Yeni bir şubeyi sisteme kaydet." onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Şube adı</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Beşiktaş şubesi" className={inputClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Adres (opsiyonel)</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        </div>
        {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}
        <Button size="lg" onClick={handleSubmit} disabled={saving}>
          {saving ? "Ekleniyor..." : "Şubeyi ekle"}
        </Button>
      </div>
    </Modal>
  );
}
