import { describe, expect, it } from "vitest";
import { computeRevenue, displayStatus, getCommissionPeriod } from "./api";
import type { BranchExpense, GymSession, Member, Payment, Trainer } from "./types";

function trainer(overrides: Partial<Trainer> & Pick<Trainer, "id">): Trainer {
  return {
    organizationId: "org1",
    branchId: "b1",
    role: "trainer",
    fullName: "Test PT",
    phone: null,
    avatarColor: "var(--color-gold)",
    bio: null,
    badgeColor: "var(--color-gold)",
    commissionRate: 50,
    ...overrides,
  };
}

function member(overrides: Partial<Member> & Pick<Member, "id">): Member {
  return {
    branchId: "b1",
    fullName: "Test Üye",
    phone: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    assignedTrainerId: null,
    packageName: null,
    packageTotalPrice: null,
    packageTotalSessions: null,
    packageSessionsUsed: 0,
    packagePaidAt: null,
    ...overrides,
  };
}

function session(overrides: Partial<GymSession> & Pick<GymSession, "id" | "trainerId" | "memberId">): GymSession {
  return {
    branchId: "b1",
    memberName: null,
    title: "Bire bir PT",
    workoutTypeId: null,
    startsAt: "2020-01-01T09:00:00.000Z", // safely in the past regardless of when the suite runs
    durationMin: 60,
    status: "done",
    notes: null,
    startedAt: null,
    endedAt: null,
    createdBy: "t1",
    createdAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeRevenue", () => {
  const owner = trainer({ id: "owner1", role: "owner" });
  const t1 = trainer({ id: "t1", commissionRate: 50 });
  const t2 = trainer({ id: "t2", commissionRate: 40 });
  const memberWithPackage = member({ id: "m1", packageTotalPrice: 8000, packageTotalSessions: 10 }); // 800/ders
  const memberWithoutPackage = member({ id: "m2" });

  const payments: Payment[] = [
    {
      id: "pay1",
      memberId: "m1",
      branchId: "b1",
      amount: 8000,
      packageName: "10 Ders Paketi",
      totalSessions: 10,
      paidAt: "2020-01-01",
      createdAt: "2020-01-01T00:00:00.000Z",
      status: "active",
      sessionsUsed: null,
    },
  ];
  const expenses: BranchExpense[] = [{ id: "exp1", branchId: "b1", name: "Kira", amount: 3000, createdAt: "2020-01-01T00:00:00.000Z" }];

  it("sums ciro, giderler ve owner karı doğru hesaplar", () => {
    const result = computeRevenue([], [memberWithPackage], [t1, t2, owner], payments, expenses);
    expect(result.totalRevenue).toBe(8000);
    expect(result.totalExpenses).toBe(3000);
    expect(result.ownerProfit).toBe(8000 - 0 - 3000);
  });

  it("her PT için ders bazında prim hesaplar, iptal edilenleri ve gelecekteki dersleri hariç tutar", () => {
    const sessions: GymSession[] = [
      session({ id: "s1", trainerId: "t1", memberId: "m1", status: "done" }),
      session({ id: "s2", trainerId: "t1", memberId: "m1", status: "cancelled" }), // iptal — hariç
      session({ id: "s3", trainerId: "t2", memberId: "m1", status: "scheduled" }),
      session({ id: "s4", trainerId: "t1", memberId: "m2" }), // paketsiz üye — hariç
      session({ id: "s5", trainerId: "t1", memberId: "m1", startsAt: "2099-01-01T09:00:00.000Z" }), // gelecek — hariç
    ];

    const result = computeRevenue(sessions, [memberWithPackage, memberWithoutPackage], [t1, t2, owner], payments, expenses);

    expect(result.commissionPayable).toBe(400 + 320); // %50 ve %40 üzerinden 800 TL birim fiyat
    expect(result.byTrainer).toEqual(
      expect.arrayContaining([
        { trainerId: "t1", sessionCount: 1, sessionValue: 800, commission: 400 },
        { trainerId: "t2", sessionCount: 1, sessionValue: 800, commission: 320 },
      ]),
    );
    expect(result.byTrainer).toHaveLength(2);
  });

  it("owner'ın kendi verdiği dersler hiçbir zaman prime dahil olmaz", () => {
    const sessions: GymSession[] = [session({ id: "s1", trainerId: "owner1", memberId: "m1", status: "done" })];
    const result = computeRevenue(sessions, [memberWithPackage], [t1, owner], payments, expenses);
    expect(result.commissionPayable).toBe(0);
    expect(result.byTrainer).toHaveLength(0);
  });
});

describe("getCommissionPeriod", () => {
  it("referans tarih dönem başlangıç gününden sonraysa, dönem bu ay başlar", () => {
    const { start, end } = getCommissionPeriod(1, new Date(2026, 8, 15));
    expect(start).toEqual(new Date(2026, 8, 1));
    expect(end).toEqual(new Date(2026, 9, 1));
  });

  it("referans tarih dönem başlangıç gününden önceyse, dönem önceki aydan başlar", () => {
    const { start, end } = getCommissionPeriod(15, new Date(2026, 8, 10));
    expect(start).toEqual(new Date(2026, 7, 15));
    expect(end).toEqual(new Date(2026, 8, 15));
  });

  it("referans tarih dönem başlangıç günündeyse, dönem bugün başlar", () => {
    const { start, end } = getCommissionPeriod(15, new Date(2026, 8, 15));
    expect(start).toEqual(new Date(2026, 8, 15));
    expect(end).toEqual(new Date(2026, 9, 15));
  });

  it("ay sonu gün numaralarında (28) ay geçişini doğru hesaplar", () => {
    const { start, end } = getCommissionPeriod(28, new Date(2026, 0, 31));
    expect(start).toEqual(new Date(2026, 0, 28));
    expect(end).toEqual(new Date(2026, 1, 28));
  });

  it("geçersiz gün değerlerini 1-28 aralığına sıkıştırır", () => {
    const { start } = getCommissionPeriod(35, new Date(2026, 8, 15));
    expect(start.getDate()).toBe(28);
  });
});

describe("displayStatus", () => {
  it("devam eden bir ders 1 saati geçmediyse in_progress kalır", () => {
    const now = new Date(2026, 8, 15, 10, 0, 0);
    const startedAt = new Date(now.getTime() - 30 * 60_000).toISOString();
    const s = session({ id: "s1", trainerId: "t1", memberId: null, status: "in_progress", startedAt });
    expect(displayStatus(s, now)).toBe("in_progress");
  });

  it("devam eden bir ders 1 saati geçtiyse done olarak gösterilir", () => {
    const now = new Date(2026, 8, 15, 10, 0, 0);
    const startedAt = new Date(now.getTime() - 90 * 60_000).toISOString();
    const s = session({ id: "s1", trainerId: "t1", memberId: null, status: "in_progress", startedAt });
    expect(displayStatus(s, now)).toBe("done");
  });

  it("planlanmış bir ders olduğu gibi kalır", () => {
    const s = session({ id: "s1", trainerId: "t1", memberId: null, status: "scheduled" });
    expect(displayStatus(s)).toBe("scheduled");
  });
});
