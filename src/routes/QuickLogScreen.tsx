import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { CheckCircle, Fire, Lightning, Bell } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { createSession, getLastSessionForTrainer, getTrainerStreak, listMembers, listSessions, listWorkoutTypes, SlotFullError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PT_BADGE_COLORS } from "@/lib/types";

const DURATIONS = [30, 45, 60, 90];

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}

function memberBadgeColor(memberId: string): string {
  let hash = 0;
  for (let i = 0; i < memberId.length; i++) hash = (hash * 31 + memberId.charCodeAt(i)) >>> 0;
  return PT_BADGE_COLORS[hash % PT_BADGE_COLORS.length];
}

function computeStartsAt(when: "now" | "yesterday"): string {
  const d = new Date();
  if (when === "yesterday") d.setDate(d.getDate() - 1);
  const stepMs = 15 * 60_000;
  return new Date(Math.round(d.getTime() / stepMs) * stepMs).toISOString();
}

export function QuickLogScreen() {
  const { profile } = useAuth();
  const { activeBranchId } = useBranch();
  const qc = useQueryClient();
  const trainerId = profile?.id ?? "";
  const now = new Date();

  const { data: members = [] } = useQuery({
    queryKey: ["members", activeBranchId],
    queryFn: () => listMembers(activeBranchId as string),
    enabled: Boolean(activeBranchId),
  });
  const { data: workoutTypes = [] } = useQuery({
    queryKey: ["workout-types", profile?.organizationId],
    queryFn: () => listWorkoutTypes(profile!.organizationId),
    enabled: Boolean(profile?.organizationId),
  });
  const { data: lastSession, isLoading: lastSessionLoading } = useQuery({
    queryKey: ["last-session", trainerId, activeBranchId],
    queryFn: () => getLastSessionForTrainer(trainerId, activeBranchId as string),
    enabled: Boolean(trainerId && activeBranchId),
  });
  const { data: streak = 0 } = useQuery({
    queryKey: ["trainer-streak", trainerId, activeBranchId],
    queryFn: () => getTrainerStreak(trainerId, activeBranchId as string),
    enabled: Boolean(trainerId && activeBranchId),
  });

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const weekAgoStart = useMemo(() => {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - 6);
    return d;
  }, [todayStart]);
  const tomorrowStart = useMemo(() => {
    const d = new Date(todayStart);
    d.setDate(d.getDate() + 1);
    return d;
  }, [todayStart]);

  const { data: weekSessions = [] } = useQuery({
    queryKey: ["sessions-week-mine", activeBranchId, trainerId],
    queryFn: () => listSessions(activeBranchId as string, weekAgoStart, tomorrowStart),
    enabled: Boolean(activeBranchId && trainerId),
  });

  const myTodayCount = weekSessions.filter(
    (s) => s.trainerId === trainerId && s.status !== "cancelled" && new Date(s.startsAt) >= todayStart,
  ).length;

  const activityDays = useMemo(() => {
    const mine = weekSessions.filter((s) => s.trainerId === trainerId && s.status !== "cancelled");
    const daySet = new Set(mine.map((s) => new Date(s.startsAt).toDateString()));
    const days: boolean[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(daySet.has(d.toDateString()));
    }
    return days;
  }, [weekSessions, trainerId]);

  const myMembers = members.filter((m) => m.assignedTrainerId === trainerId);
  const lastMember = lastSession?.memberId ? members.find((m) => m.id === lastSession.memberId) : null;

  const [when, setWhen] = useState<"now" | "yesterday">("now");
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [workoutTypeId, setWorkoutTypeId] = useState<string | null>(null);
  const [duration, setDuration] = useState(60);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<number | null>(null);

  useEffect(() => {
    if (workoutTypeId !== null || lastSessionLoading) return;
    if (lastSession) {
      setWorkoutTypeId(lastSession.workoutTypeId);
      setDuration(lastSession.durationMin);
      return;
    }
    if (workoutTypes[0]) setWorkoutTypeId(workoutTypes[0].id);
  }, [lastSession, lastSessionLoading, workoutTypes, workoutTypeId]);

  const otherMembers = memberQuery.trim()
    ? members.filter((m) => !myMembers.some((mine) => mine.id === m.id) && m.fullName.toLowerCase().includes(memberQuery.trim().toLowerCase()))
    : [];

  async function submit(input: { memberId: string | null; memberName: string | null; workoutTypeId: string | null; duration: number }) {
    if (!activeBranchId || !profile) return;
    setSaving(true);
    setError(null);
    try {
      await createSession({
        branchId: activeBranchId,
        trainerId: profile.id,
        memberId: input.memberId,
        memberName: input.memberName,
        workoutTypeId: input.workoutTypeId,
        startsAt: computeStartsAt(when),
        durationMin: input.duration,
        notes: notes.trim() || null,
        createdBy: profile.id,
      });
      const newCount = myTodayCount + 1;
      qc.invalidateQueries({ queryKey: ["sessions-week-mine", activeBranchId, trainerId] });
      qc.invalidateQueries({ queryKey: ["last-session", trainerId, activeBranchId] });
      qc.invalidateQueries({ queryKey: ["trainer-streak", trainerId, activeBranchId] });
      qc.invalidateQueries({ queryKey: ["trainers", activeBranchId] });
      setMemberId(null);
      setMemberQuery("");
      setNotes("");
      setNotesOpen(false);
      setWhen("now");
      setJustSaved(newCount);
      navigator.vibrate?.(12);
      setTimeout(() => setJustSaved(null), 2600);
    } catch (e) {
      if (e instanceof SlotFullError) {
        setError(`Bu saat dolu. ${e.nearestAvailable ? "Takvim'den farklı bir saat seçebilirsin." : "Yakında müsait saat bulunamadı."}`);
      } else {
        setError("Ders kaydedilemedi, tekrar dene.");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleManualSave() {
    const picked = members.find((m) => m.id === memberId);
    submit({
      memberId: picked?.id ?? null,
      memberName: picked?.fullName ?? (memberQuery.trim() || null),
      workoutTypeId,
      duration,
    });
  }

  function handleQuickRepeat() {
    if (!lastSession) return;
    submit({ memberId: lastSession.memberId, memberName: lastSession.memberName, workoutTypeId: lastSession.workoutTypeId, duration: lastSession.durationMin });
  }

  if (!activeBranchId) return <EmptyState message="Şube bilgisi yükleniyor." />;

  const showReminder = now.getHours() >= 14 && myTodayCount === 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <div
          className={clsx(
            "overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--color-gold-tint)] transition-all duration-300 ease-out",
            justSaved !== null ? "max-h-24 border-[var(--color-gold)] opacity-100" : "max-h-0 border-transparent opacity-0",
          )}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <CheckCircle size={22} weight="fill" className="shrink-0 text-[var(--color-gold-deep)]" />
            <p className="text-[14px] font-medium text-[var(--color-ink)]">
              Kaydedildi — bugün <span className="tabular-nums">{justSaved}.</span> dersin
            </p>
          </div>
        </div>

        <div>
          <h1 className="font-display text-[24px] font-bold text-[var(--color-ink)]">
            {greeting(now)}, {profile?.fullName?.split(" ")[0] ?? ""}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--color-ash)]">Bugün nasıl geçiyor?</p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <Fire size={22} weight="fill" className="text-[var(--color-gold)]" />
            <p className="font-display text-[22px] font-bold leading-none text-[var(--color-ink)]">
              {streak} <span className="font-sans text-[13px] font-medium text-[var(--color-ash)]">gündür üst üste</span>
            </p>
          </div>
          <div className="flex gap-1">
            {activityDays.map((active, i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full"
                style={{ background: active ? "var(--color-gold)" : "var(--color-line-strong)" }}
              />
            ))}
          </div>
        </div>

        {showReminder && (
          <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-gold)] bg-[var(--color-gold-tint)] px-4 py-3">
            <Bell size={20} className="shrink-0 text-[var(--color-gold-deep)]" />
            <p className="text-[13px] text-[var(--color-ink)]">Bugün henüz ders girmedin.</p>
          </div>
        )}

        {lastSession && lastMember !== undefined && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ash)]">Son dersini tekrarla</p>
            <div className="flex flex-col gap-3.5 rounded-[var(--radius-lg)] border border-[var(--color-gold-soft)] bg-[var(--color-gold-tint)] p-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-semibold text-[var(--color-paper)]"
                  style={{ background: lastMember ? memberBadgeColor(lastMember.id) : "var(--color-ash)" }}
                >
                  {(lastMember?.fullName ?? lastSession.memberName ?? "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-[var(--color-ink)]">{lastMember?.fullName ?? lastSession.memberName ?? "İsimsiz üye"}</p>
                  <p className="text-[12px] text-[var(--color-gold-deep)]">
                    {workoutTypes.find((w) => w.id === lastSession.workoutTypeId)?.name ?? "Ders"} · {lastSession.durationMin} dk
                  </p>
                </div>
              </div>
              <Button onClick={handleQuickRepeat} disabled={saving} className="w-full gap-2">
                <Lightning size={16} weight="fill" />
                Şimdi tekrarla
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--color-line)]" />
          <span className="text-[11px] text-[var(--color-ash)]">veya elle gir</span>
          <div className="h-px flex-1 bg-[var(--color-line)]" />
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-[var(--color-ink-soft)]">Ne zaman</p>
            <div className="flex gap-2">
              {(["now", "yesterday"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setWhen(opt)}
                  className={clsx(
                    "h-10 flex-1 rounded-[var(--radius-md)] text-[14px] font-medium transition-colors duration-100",
                    when === opt
                      ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                      : "border border-[var(--color-line-strong)] text-[var(--color-ink-soft)]",
                  )}
                >
                  {opt === "now" ? "Şimdi" : "Dün"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-[var(--color-ink-soft)]">Kim</p>
            {myMembers.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {myMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMemberId(m.id);
                      setMemberQuery("");
                    }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full font-semibold text-[var(--color-paper)] transition-[box-shadow] duration-150"
                      style={{
                        background: memberBadgeColor(m.id),
                        boxShadow: memberId === m.id ? "0 0 0 3px var(--color-gold)" : "none",
                      }}
                    >
                      {m.fullName.charAt(0).toUpperCase()}
                    </span>
                    <span className={clsx("text-[11px]", memberId === m.id ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-ash)]")}>
                      {m.fullName.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-2.5">
              <input
                value={memberQuery}
                onChange={(e) => {
                  setMemberQuery(e.target.value);
                  setMemberId(null);
                }}
                placeholder="Listede yoksa isimle ara"
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ash)] focus:border-[var(--color-gold)]"
              />
              {otherMembers.length > 0 && (
                <div className="mt-1.5 flex max-h-32 flex-col overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-line)]">
                  {otherMembers.map((m) => (
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
                  ))}
                </div>
              )}
            </div>
          </div>

          {workoutTypes.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-medium text-[var(--color-ink-soft)]">Ne</p>
              <div className="flex flex-wrap gap-2">
                {workoutTypes.map((wt) => (
                  <button
                    key={wt.id}
                    onClick={() => setWorkoutTypeId(wt.id)}
                    className={clsx(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-100",
                      workoutTypeId === wt.id
                        ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
                        : "border-[var(--color-line-strong)] text-[var(--color-ink-soft)]",
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: workoutTypeId === wt.id ? "currentColor" : wt.color }} />
                    {wt.name}
                  </button>
                ))}
              </div>
            </div>
          )}

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

          {notesOpen ? (
            <div>
              <p className="mb-2 text-[13px] font-medium text-[var(--color-ink-soft)]">Not (opsiyonel)</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Örn. sırt egzersizlerine ağırlık ver"
                rows={2}
                autoFocus
                className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ash)] focus:border-[var(--color-gold)]"
              />
            </div>
          ) : (
            <button onClick={() => setNotesOpen(true)} className="self-start text-[12px] font-medium text-[var(--color-gold-deep)]">
              + Not ekle
            </button>
          )}

          {error && <p className="rounded-[var(--radius-md)] bg-[var(--color-danger-tint)] px-3 py-2 text-[13px] text-[var(--color-danger)]">{error}</p>}

          <Button size="lg" onClick={handleManualSave} disabled={saving}>
            {saving ? "Kaydediliyor..." : "Dersi Kaydet"}
          </Button>
        </div>
      </div>
    </div>
  );
}
