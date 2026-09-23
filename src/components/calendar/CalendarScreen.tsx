import { useEffect, useMemo, useState } from "react";
import { useNavigate as useRouterNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { listMembers, listSessions, listTrainers, listWorkoutTypes, subscribeToSessions } from "@/lib/api";
import { startOfWeek, weekDays, isSameDay, type ZoomLevel } from "@/lib/calendarGrid";
import { DEFAULT_MAX_SESSIONS_PER_SLOT, type GymSession } from "@/lib/types";
import { CalendarToolbar, type CalendarView } from "./CalendarToolbar";
import { TrainerFilterChips } from "./TrainerFilterChips";
import { TimeGrid } from "./TimeGrid";
import { AddSessionSheet } from "./AddSessionSheet";
import { ManageSessionSheet } from "./ManageSessionSheet";
import { SlotDetailsPanel } from "./SlotDetailsPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import type { TrainerVisual } from "./SlotCell";

const ZOOM_KEY = "gymkoc-calendar-zoom";

interface SelectedSlot {
  day: Date;
  hour: number;
  minute: number;
  sessions: GymSession[];
}

export function CalendarScreen() {
  const { profile } = useAuth();
  const { activeBranchId, branches } = useBranch();
  const isDesktop = useIsDesktop();
  const qc = useQueryClient();
  const goTo = useRouterNavigate();

  const [view, setView] = useState<CalendarView>("day");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [zoom, setZoom] = useState<ZoomLevel>(() => (localStorage.getItem(ZOOM_KEY) as ZoomLevel) || "normal");
  const [selectedTrainerIds, setSelectedTrainerIds] = useState<Set<string> | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);

  useEffect(() => localStorage.setItem(ZOOM_KEY, zoom), [zoom]);

  const days = useMemo(() => (view === "day" ? [anchorDate] : weekDays(anchorDate)), [view, anchorDate]);
  const rangeStart = useMemo(() => (view === "day" ? new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate()) : startOfWeek(anchorDate)), [view, anchorDate]);
  const rangeEnd = useMemo(() => {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + (view === "day" ? 1 : 7));
    return d;
  }, [rangeStart, view]);

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const capacity = activeBranch?.maxConcurrentSessions ?? DEFAULT_MAX_SESSIONS_PER_SLOT;

  const { data: trainers = [] } = useQuery({
    queryKey: ["trainers", activeBranchId],
    queryFn: () => listTrainers(activeBranchId as string),
    enabled: Boolean(activeBranchId),
  });

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

  const sessionsQueryKey = ["sessions", activeBranchId, rangeStart.toISOString(), rangeEnd.toISOString()];
  const { data: sessions = [] } = useQuery({
    queryKey: sessionsQueryKey,
    queryFn: () => listSessions(activeBranchId as string, rangeStart, rangeEnd),
    enabled: Boolean(activeBranchId),
  });

  useEffect(() => {
    if (!activeBranchId) return;
    return subscribeToSessions(activeBranchId, () => {
      qc.invalidateQueries({ queryKey: ["sessions", activeBranchId] });
    });
  }, [activeBranchId, qc]);

  const activeTrainerIds = selectedTrainerIds ?? new Set(trainers.map((t) => t.id));
  const filteredSessions = sessions.filter((s) => activeTrainerIds.has(s.trainerId));

  const trainerVisual = (trainerId: string): TrainerVisual => {
    const t = trainers.find((tr) => tr.id === trainerId);
    const isSelf = trainerId === profile?.id;
    return {
      initial: t?.fullName?.charAt(0)?.toUpperCase() ?? "?",
      color: isSelf ? "var(--color-gold)" : (t?.badgeColor ?? "var(--color-ash)"),
      avatarUrl: t?.avatarUrl ?? null,
    };
  };

  const workoutTypeColor = (workoutTypeId: string | null): string | null =>
    workoutTypeId ? (workoutTypes.find((w) => w.id === workoutTypeId)?.color ?? null) : null;

  function navigate(delta: number) {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + delta * (view === "day" ? 1 : 7));
    setAnchorDate(d);
  }

  function handleSlotClick(day: Date, hour: number, minute: number, slotSessions: GymSession[]) {
    setSelectedSlot({ day, hour, minute, sessions: slotSessions });
  }

  function handleJumpTo(iso: string) {
    const d = new Date(iso);
    setAnchorDate(d);
    setView("day");
  }

  // Trainers always log their own sessions. Owners who also personally coach
  // (a common case: a small gym's owner is often its lead PT too) get the same
  // self-logging flow — the backend lazily creates their trainers row on first
  // use. super_admin stays on the read-only summary panel.
  const canSelfLog = profile?.role === "trainer" || profile?.role === "owner";

  if (!activeBranchId) {
    if (profile?.role === "super_admin" && branches.length === 0) {
      return (
        <EmptyState
          message="Henüz hiç şube eklenmedi. Önce bir şube oluşturman gerekiyor."
          action={{ label: "Ekip → Şubeler'e git", onClick: () => goTo("/team") }}
        />
      );
    }
    return <EmptyState message="Şube bilgisi yükleniyor." />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row lg:gap-6 lg:p-6">
      <aside className="hidden shrink-0 flex-col gap-6 lg:flex lg:w-56">
        <div>
          <p className="mb-3 text-[13px] font-medium text-[var(--color-ink-soft)]">PT Filtrele</p>
          <TrainerFilterChips
            trainers={trainers}
            selected={activeTrainerIds}
            currentProfileId={profile?.id ?? null}
            onToggle={(id) => {
              const next = new Set(activeTrainerIds);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              setSelectedTrainerIds(next);
            }}
          />
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col lg:rounded-[var(--radius-lg)] lg:border lg:border-[var(--color-line)]">
        <CalendarToolbar
          view={view}
          onViewChange={setView}
          anchorDate={anchorDate}
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
          onToday={() => setAnchorDate(new Date())}
          zoom={zoom}
          onZoomChange={setZoom}
        />
        <div className="lg:hidden">
          <TrainerFilterChips
            trainers={trainers}
            selected={activeTrainerIds}
            currentProfileId={profile?.id ?? null}
            onToggle={(id) => {
              const next = new Set(activeTrainerIds);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              setSelectedTrainerIds(next);
            }}
          />
        </div>

        {sessions.length === 0 && isSameDay(anchorDate, new Date()) && view === "day" && (
          <p className="border-b border-[var(--color-line)] px-4 py-3 text-[13px] text-[var(--color-ash)] lg:px-0">
            Bugün için henüz ders girilmedi. Bir saate dokunup ilk dersi ekle.
          </p>
        )}
        <TimeGrid
          days={days}
          sessions={filteredSessions}
          zoom={zoom}
          capacity={capacity}
          trainerVisual={trainerVisual}
          workoutTypeColor={workoutTypeColor}
          onSlotClick={handleSlotClick}
          showDayHeaders={view === "week" || isDesktop}
        />
      </div>

      {selectedSlot &&
        profile &&
        canSelfLog &&
        (() => {
          const ownSession = selectedSlot.sessions.find((s) => s.trainerId === profile.id && s.status !== "cancelled");
          if (ownSession) {
            return (
              <ManageSessionSheet
                day={selectedSlot.day}
                hour={selectedSlot.hour}
                minute={selectedSlot.minute}
                session={ownSession}
                workoutTypes={workoutTypes}
                colleagues={trainers.filter((t) => t.id !== profile.id)}
                onClose={() => setSelectedSlot(null)}
                onChanged={() => qc.invalidateQueries({ queryKey: ["sessions", activeBranchId] })}
              />
            );
          }
          return (
            <AddSessionSheet
              day={selectedSlot.day}
              hour={selectedSlot.hour}
              minute={selectedSlot.minute}
              existingSessions={selectedSlot.sessions}
              members={members}
              workoutTypes={workoutTypes}
              profile={profile}
              branchId={activeBranchId}
              capacity={capacity}
              onClose={() => setSelectedSlot(null)}
              onCreated={() => {
                // A first self-logged session (owner or a brand-new trainer)
                // lazily creates their trainers row server-side; refetch it
                // too, or the new session is invisible until next reload
                // (filtered out by the stale trainer id set).
                qc.invalidateQueries({ queryKey: ["sessions", activeBranchId] });
                qc.invalidateQueries({ queryKey: ["trainers", activeBranchId] });
              }}
              onJumpTo={handleJumpTo}
            />
          );
        })()}

      {selectedSlot && profile && !canSelfLog && (
        <SlotDetailsPanel
          day={selectedSlot.day}
          hour={selectedSlot.hour}
          minute={selectedSlot.minute}
          sessions={selectedSlot.sessions}
          trainers={trainers}
          workoutTypes={workoutTypes}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </div>
  );
}
