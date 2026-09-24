import { useState } from "react";
import clsx from "clsx";
import { X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { cancelSession, displayStatus, reassignSessionTrainer, updateSessionNote } from "@/lib/api";
import { formatHourLabel } from "@/lib/calendarGrid";
import type { GymSession, Trainer, WorkoutType } from "@/lib/types";

interface ManageSessionSheetProps {
  day: Date;
  hour: number;
  minute: number;
  session: GymSession;
  workoutTypes: WorkoutType[];
  /** Branch colleagues this session can be handed off to — excludes the
   * current trainer themselves, since "devret" only makes sense to someone else. */
  colleagues: Trainer[];
  onClose: () => void;
  onChanged: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Planlandı",
  in_progress: "Devam ediyor",
  done: "Tamamlandı",
  cancelled: "İptal edildi",
};

export function ManageSessionSheet({ day, hour, minute, session, workoutTypes, colleagues, onClose, onChanged }: ManageSessionSheetProps) {
  const isDesktop = useIsDesktop();
  useEscapeClose(onClose);
  const [notes, setNotes] = useState(session.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [handoffTo, setHandoffTo] = useState("");
  const [handingOff, setHandingOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = displayStatus(session);
  const workoutType = workoutTypes.find((w) => w.id === session.workoutTypeId);

  async function handleSaveNote() {
    setSaving(true);
    setError(null);
    try {
      await updateSessionNote(session.id, notes.trim() || null);
      onChanged();
      onClose();
    } catch {
      setError("Not kaydedilemedi, tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    setSaving(true);
    setError(null);
    try {
      await cancelSession(session.id);
      onChanged();
      onClose();
    } catch {
      setError("Ders iptal edilemedi, tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  async function handleHandoff() {
    if (!handoffTo) return;
    setHandingOff(true);
    setError(null);
    try {
      await reassignSessionTrainer(session.id, handoffTo);
      onChanged();
      onClose();
    } catch {
      setError("Ders devredilemedi, tekrar dene.");
    } finally {
      setHandingOff(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[var(--color-paper)]/72 transition-opacity duration-200" onClick={onClose} />
      <div
        className={clsx(
          "relative z-10 flex w-full flex-col gap-5 bg-[var(--color-surface)] p-5 shadow-[var(--shadow-float)] transition-transform duration-200",
          isDesktop ? "max-w-sm rounded-[var(--radius-lg)]" : "max-h-[90dvh] rounded-t-[var(--radius-lg)] pb-[max(20px,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-display text-[22px] font-bold leading-none tabular-nums">{formatHourLabel(hour, minute)}</p>
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  status === "in_progress" && "bg-[var(--color-gold-tint)] text-[var(--color-gold-deep)]",
                  status === "done" && "bg-[var(--color-surface-2)] text-[var(--color-ash)]",
                  status === "scheduled" && "border border-[var(--color-line-strong)] text-[var(--color-ink-soft)]",
                )}
              >
                {STATUS_LABEL[status]}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-[var(--color-ash)]">
              {day.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })} · {session.durationMin} dk
              {workoutType ? ` · ${workoutType.name}` : ""}
              {session.memberName ? ` · ${session.memberName}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ash)] hover:bg-[var(--color-surface-2)]" aria-label="Kapat">
            <X size={18} />
          </button>
        </div>

        {confirmingCancel ? (
          <div className="flex flex-col gap-4">
            <p className="text-[14px] text-[var(--color-ink)]">
              Bu dersi iptal etmek istediğine emin misin? Üyenin paketinden bu ders geri sayılır — dersin gerçekten
              verildiğini fark edersen üye kartından tekrar geri yükleyebilirsin.
            </p>
            {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setConfirmingCancel(false)} className="flex-1">
                Vazgeç
              </Button>
              <Button onClick={handleCancel} disabled={saving} className="flex-1 !bg-[var(--color-danger)] hover:!bg-[var(--color-danger)]">
                {saving ? "İptal ediliyor..." : "Dersi iptal et"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Not</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Örn. sırt egzersizlerine ağırlık ver"
                rows={3}
                className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ash)] focus:border-[var(--color-gold)]"
              />
            </div>

            {colleagues.length > 0 && (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-3">
                <p className="mb-1.5 text-[13px] font-medium text-[var(--color-ink-soft)]">Dersi devret</p>
                <p className="mb-2.5 text-[12px] text-[var(--color-ash)]">
                  Bu dersi bir meslektaşına devredersen, prim de o kişiye yazılır.
                </p>
                <div className="flex gap-2">
                  <select
                    value={handoffTo}
                    onChange={(e) => setHandoffTo(e.target.value)}
                    className="h-11 min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] focus:border-[var(--color-gold)]"
                  >
                    <option value="" disabled>
                      PT seç
                    </option>
                    {colleagues.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                  <Button variant="secondary" onClick={handleHandoff} disabled={!handoffTo || handingOff} className="shrink-0">
                    {handingOff ? "Devrediliyor..." : "Devret"}
                  </Button>
                </div>
              </div>
            )}

            {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}

            <div className="flex flex-col gap-2">
              <Button variant="secondary" size="lg" onClick={handleSaveNote} disabled={saving}>
                {saving ? "Kaydediliyor..." : "Notu kaydet"}
              </Button>
              <button onClick={() => setConfirmingCancel(true)} className="h-10 text-[13px] font-medium text-[var(--color-danger)]">
                Dersi iptal et
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
