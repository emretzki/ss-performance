import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { updateTrainerCommissionRate } from "@/lib/api";
import type { Trainer } from "@/lib/types";

interface EditTrainerFormProps {
  trainer: Trainer;
  onClose: () => void;
  onSaved: () => void;
}

export function EditTrainerForm({ trainer, onClose, onSaved }: EditTrainerFormProps) {
  const [rate, setRate] = useState(trainer.commissionRate.toString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const value = Number(rate);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      setError("Prim oranı 0-100 arasında bir sayı olmalı.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateTrainerCommissionRate(trainer.id, value);
      onSaved();
      onClose();
    } catch {
      setError("Kaydedilemedi, tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={trainer.fullName} subtitle="Prim oranı" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Prim oranı (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] focus:border-[var(--color-gold)]"
          />
          <p className="mt-1.5 text-[12px] text-[var(--color-ash)]">
            Bu PT'nin verdiği bir dersten alacağı pay. Örn. ders birim fiyatı 1.300 TL ve oran %40 ise, PT 520 TL, salon 780 TL kazanır.
          </p>
        </div>
        {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}
        <Button size="lg" onClick={handleSave} disabled={saving}>
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </Modal>
  );
}
