import { describe, expect, it } from "vitest";
import { mockDB } from "./mockStore";
import type { GymSession, Member } from "./types";

// Mirrors the real DB's bump_member_package_usage trigger (migration
// 0021): cancelling only refunds a session to the member's package if it
// hadn't started yet — once it has (in_progress/done), the time was
// already used, and a later cancellation shouldn't hand back a free
// session. Restoring has to mirror whichever of those happened, never
// blindly re-charge.

function member(overrides: Partial<Member> & Pick<Member, "id">): Member {
  return {
    branchId: "b1",
    fullName: "Test Üye",
    phone: null,
    notes: null,
    createdAt: new Date().toISOString(),
    assignedTrainerId: "t1",
    packageName: "Test Paket",
    packageTotalPrice: 8000,
    packageTotalSessions: 10,
    packageSessionsUsed: 3,
    packagePaidAt: "2026-01-01",
    ...overrides,
  };
}

function session(overrides: Partial<GymSession> & Pick<GymSession, "id" | "memberId" | "startsAt">): GymSession {
  return {
    branchId: "b1",
    trainerId: "t1",
    memberName: "Test Üye",
    title: "Bire bir PT",
    workoutTypeId: null,
    durationMin: 60,
    status: "scheduled",
    notes: null,
    startedAt: null,
    endedAt: null,
    createdBy: "t1",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function usedFor(memberId: string): number {
  return mockDB.get().members.find((m) => m.id === memberId)!.packageSessionsUsed;
}

describe("mockDB.updateSession — cancel/restore package accounting", () => {
  it("henüz başlamamış bir dersi iptal etmek paketi iade eder", () => {
    const m = member({ id: "mc1", packageSessionsUsed: 3 });
    mockDB.addMember(m);
    const future = new Date(Date.now() + 60 * 60_000).toISOString(); // 1 saat sonra
    mockDB.addSession(session({ id: "sc1", memberId: m.id, startsAt: future, status: "scheduled" }));
    expect(usedFor(m.id)).toBe(4); // booking already counts it

    mockDB.updateSession("sc1", { status: "cancelled" });
    expect(usedFor(m.id)).toBe(3); // refunded
    expect(mockDB.get().sessions.find((s) => s.id === "sc1")?.cancelRefunded).toBe(true);
  });

  it("başlamış (geçmişteki) bir dersi iptal etmek paketi iade etmez", () => {
    const m = member({ id: "mc2", packageSessionsUsed: 3 });
    mockDB.addMember(m);
    const past = new Date(Date.now() - 60 * 60_000).toISOString(); // 1 saat önce
    mockDB.addSession(session({ id: "sc2", memberId: m.id, startsAt: past, status: "done" }));
    expect(usedFor(m.id)).toBe(4);

    mockDB.updateSession("sc2", { status: "cancelled" });
    expect(usedFor(m.id)).toBe(4); // iade edilmedi
    expect(mockDB.get().sessions.find((s) => s.id === "sc2")?.cancelRefunded).toBe(false);
  });

  it("iade edilmiş bir dersi geri yüklemek paketi tekrar tüketir", () => {
    const m = member({ id: "mc3", packageSessionsUsed: 3 });
    mockDB.addMember(m);
    const future = new Date(Date.now() + 60 * 60_000).toISOString();
    mockDB.addSession(session({ id: "sc3", memberId: m.id, startsAt: future, status: "scheduled" }));
    mockDB.updateSession("sc3", { status: "cancelled" });
    expect(usedFor(m.id)).toBe(3);

    mockDB.updateSession("sc3", { status: "done" });
    expect(usedFor(m.id)).toBe(4); // tekrar sayıldı
    expect(mockDB.get().sessions.find((s) => s.id === "sc3")?.cancelRefunded).toBeNull();
  });

  it("iade edilmemiş bir dersi geri yüklemek paketi tekrar tüketmez (çifte tüketimi önler)", () => {
    const m = member({ id: "mc4", packageSessionsUsed: 3 });
    mockDB.addMember(m);
    const past = new Date(Date.now() - 60 * 60_000).toISOString();
    mockDB.addSession(session({ id: "sc4", memberId: m.id, startsAt: past, status: "done" }));
    mockDB.updateSession("sc4", { status: "cancelled" });
    expect(usedFor(m.id)).toBe(4); // hâlâ 4, iade edilmemişti

    mockDB.updateSession("sc4", { status: "done" });
    expect(usedFor(m.id)).toBe(4); // ikinci kez düşülmedi
  });
});
