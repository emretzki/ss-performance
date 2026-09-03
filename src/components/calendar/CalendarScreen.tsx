import { useEffect, useMemo, useState } from "react";
import { useNavigate as useRouterNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { listMembers, listSessions, listTrainers, subscribeToSessions } from "@/lib/api";
import { startOfWeek, weekDays, isSameDay, type ZoomLevel } from "@/lib/calendarGrid";
import type { GymSession } from "@/lib/types";
import { CalendarToolbar, type CalendarView } from "./CalendarToolbar";
import { TrainerFilterChips } from "./TrainerFilterChips";
import { TimeGrid } from "./TimeGrid";
import { AddSessionSheet } from "./AddSessionSheet";
import { ManageSessionSheet } from "./ManageSessionSheet";
import { SlotDetailsPanel } from "./SlotDetailsPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { useIsDesktop } from "@/hooks/useMediaQuery";

const ZOOM_KEY = "sportscience-calendar-zoom";

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

  const trainerColor = (trainerId: string) => {
    if (trainerId === profile?.id) return "var(--color-gold)";
    return trainers.find((t) => t.id === trainerId)?.badgeColor ?? "var(--color-ash)";
  };

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

  const isTrainer = profile?.role === "trainer";

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
          trainerColor={trainerColor}
          onSlotClick={handleSlotClick}
          showDayHeaders={view === "week" || isDesktop}
        />
      </div>

      {selectedSlot &&
        profile &&
        isTrainer &&
        (() => {
          const ownSession = selectedSlot.sessions.find((s) => s.trainerId === profile.id && s.status !== "cancelled");
          if (ownSession) {
            return (
              <ManageSessionSheet
                day={selectedSlot.day}
                hour={selectedSlot.hour}
                minute={selectedSlot.minute}
                session={ownSession}
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
              profile={profile}
              branchId={activeBranchId}
              onClose={() => setSelectedSlot(null)}
              onCreated={() => qc.invalidateQueries({ queryKey: ["sessions", activeBranchId] })}
              onJumpTo={handleJumpTo}
            />
          );
        })()}

      {selectedSlot && profile && !isTrainer && (
        <SlotDetailsPanel
          day={selectedSlot.day}
          hour={selectedSlot.hour}
          minute={selectedSlot.minute}
          sessions={selectedSlot.sessions}
          trainers={trainers}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </div>
  );
}
