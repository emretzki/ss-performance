import { useState } from "react";
import clsx from "clsx";
import { X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { createSession, SlotFullError } from "@/lib/api";
import { formatHourLabel } from "@/lib/calendarGrid";
import type { GymSession, Member, Profile } from "@/lib/types";

interface AddSessionSheetProps {
  day: Date;
  hour: number;
  minute: number;
  existingSessions: GymSession[];
  members: Member[];
  profile: Profile;
  branchId: string;
  onClose: () => void;
  onCreated: () => void;
  onJumpTo: (iso: string) => void;
}

const DURATIONS = [30, 45, 60, 90];

export function AddSessionSheet({ day, hour, minute, existingSessions, members, profile, branchId, onClose, onCreated, onJumpTo }: AddSessionSheetProps) {
  const isDesktop = useIsDesktop();
  useEscapeClose(onClose);
  const [duration, setDuration] = useState(60);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nearest, setNearest] = useState<string | null>(null);

  const slotDate = new Date(day);
  slotDate.setHours(hour, minute, 0, 0);
  const full = existingSessions.filter((s) => s.status !== "cancelled").length >= 3;

  const filteredMembers = memberQuery.trim()
    ? members.filter((m) => m.fullName.toLowerCase().includes(memberQuery.trim().toLowerCase()))
    : members;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const member = members.find((m) => m.id === memberId);
      await createSession({
        branchId,
        trainerId: profile.id,
        memberId: member?.id ?? null,
        memberName: member?.fullName ?? null,
        startsAt: slotDate.toISOString(),
        durationMin: duration,
        notes: notes.trim() || null,
        createdBy: profile.id,
      });
      onCreated();
      onClose();
    } catch (e) {
      if (e instanceof SlotFullError) {
        setError(`Bu saat dolu (3/3). ${e.nearestAvailable ? "En yakın müsait saat gösteriliyor." : "Yakında müsait saat bulunamadı."}`);
        setNearest(e.nearestAvailable);
      } else {
        setError("Ders kaydedilemedi. Bu saat az önce doldu, farklı bir saat seçin.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[var(--color-ink)]/30 transition-opacity duration-200" onClick={onClose} />
      <div
        className={clsx(
          "relative z-10 flex w-full flex-col gap-5 bg-[var(--color-surface)] p-5 shadow-[var(--shadow-float)] transition-transform duration-200",
          isDesktop ? "max-w-sm rounded-[var(--radius-lg)]" : "max-h-[90dvh] rounded-t-[var(--radius-lg)] pb-[max(20px,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-[22px] font-bold leading-none tabular-nums">{formatHourLabel(hour, minute)}</p>
            <p className="mt-1 text-[13px] text-[var(--color-ash)]">{day.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ash)] hover:bg-[var(--color-surface-2)]" aria-label="Kapat">
            <X size={18} />
          </button>
        </div>

        {full ? (
          <div className="flex flex-col gap-4">
            <p className="text-[14px] text-[var(--color-ink)]">
              Bu saat dolu <span className="text-[var(--color-ash)]">(3/3)</span>. Aynı anda en fazla 3 ders yapılabiliyor.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                if (nearest) onJumpTo(nearest);
                onClose();
              }}
            >
              En yakın müsait saate git
            </Button>
          </div>
        ) : (
          <>
            <div>
              <p className="mb-2 text-[13px] font-medium text-[var(--color-ink-soft)]">Süre</p>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={clsx(
                      "h-10 flex-1 rounded-[var(--radius-md)] text-[14px] font-medium transition-colors duration-100",
                      duration === d
                        ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                        : "border border-[var(--color-line-strong)] text-[var(--color-ink-soft)]",
                    )}
                  >
                    {d} dk
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium text-[var(--color-ink-soft)]">Üye (opsiyonel)</p>
              <input
                value={memberQuery}
                onChange={(e) => {
                  setMemberQuery(e.target.value);
                  setMemberId(null);
                }}
                placeholder="İsimle ara"
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ash)] focus:border-[var(--color-gold)]"
              />
              {memberQuery && !memberId && (
                <div className="mt-1.5 flex max-h-32 flex-col overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-line)]">
                  {filteredMembers.length === 0 ? (
                    <p className="px-3 py-2 text-[13px] text-[var(--color-ash)]">Eşleşen üye yok, boş bırakabilirsin.</p>
                  ) : (
                    filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setMemberId(m.id);
                          setMemberQuery(m.fullName);
                        }}
                        className="px-3 py-2 text-left text-[14px] hover:bg-[var(--color-surface-2)]"
                      >
                        {m.fullName}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium text-[var(--color-ink-soft)]">Not (opsiyonel)</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Örn. sırt egzersizlerine ağırlık ver"
                rows={2}
                className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ash)] focus:border-[var(--color-gold)]"
              />
            </div>

            {error && (
              <p className="rounded-[var(--radius-md)] bg-[var(--color-danger-tint)] px-3 py-2 text-[13px] text-[var(--color-danger)]">{error}</p>
            )}

            <Button size="lg" onClick={handleSave} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Dersi Ekle"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
