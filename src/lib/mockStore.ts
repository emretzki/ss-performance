import type { Branch, BranchExpense, GymSession, Member, Organization, Payment, Profile, Trainer, WorkoutType } from "./types";
import { PT_BADGE_COLORS } from "./types";

const STORAGE_KEY = "gymkoc-mock-db-v3";

interface MockDB {
  organizations: Organization[];
  branches: Branch[];
  profiles: Profile[];
  trainers: Trainer[];
  members: Member[];
  workoutTypes: WorkoutType[];
  sessions: GymSession[];
  payments: Payment[];
  branchExpenses: BranchExpense[];
}

function todayIso(hour: number, minute: number, dayOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function seed(): MockDB {
  const organizations: Organization[] = [
    { id: "org1", name: "Gymkoç Demo", slug: "gymkocdemo", logoUrl: null, accentColor: "#96792C", ownerAuthId: "owner1", createdAt: new Date().toISOString() },
    { id: "org2", name: "Fitness Farm", slug: "fitnessfarm", logoUrl: null, accentColor: "#C99A2E", ownerAuthId: "owner2", createdAt: new Date().toISOString() },
  ];

  const branches: Branch[] = [
    { id: "b1", organizationId: "org1", name: "Gymkoç Demo Kadıköy", address: "Caferağa Mah. Moda Cad. No:12", maxConcurrentSessions: 3, createdAt: new Date().toISOString() },
    { id: "b2", organizationId: "org1", name: "Gymkoç Demo Ataşehir", address: "Barbaros Mah. Ünlü Sok. No:4", maxConcurrentSessions: 3, createdAt: new Date().toISOString() },
    { id: "b3", organizationId: "org2", name: "Fitness Farm Merkez", address: "Strength & Conditioning", maxConcurrentSessions: 2, createdAt: new Date().toISOString() },
  ];

  const workoutTypes: WorkoutType[] = [
    { id: "wt1", organizationId: "org1", name: "Bire bir PT", color: "#96792C", createdAt: new Date().toISOString() },
    { id: "wt2", organizationId: "org1", name: "Boks", color: "#B0704A", createdAt: new Date().toISOString() },
    { id: "wt3", organizationId: "org1", name: "Kickbox", color: "#556478", createdAt: new Date().toISOString() },
    { id: "wt4", organizationId: "org2", name: "Fitness", color: "#C99A2E", createdAt: new Date().toISOString() },
    { id: "wt5", organizationId: "org2", name: "Hyrox", color: "#6F7D4F", createdAt: new Date().toISOString() },
  ];

  const trainers: Trainer[] = [
    { id: "t1", organizationId: "org1", branchId: "b1", role: "trainer", fullName: "Emre Korkmaz", phone: "0532 000 00 01", avatarColor: PT_BADGE_COLORS[0], bio: null, badgeColor: PT_BADGE_COLORS[0], commissionRate: 40 },
    { id: "t2", organizationId: "org1", branchId: "b1", role: "trainer", fullName: "Deniz Aksoy", phone: "0532 000 00 02", avatarColor: PT_BADGE_COLORS[1], bio: null, badgeColor: PT_BADGE_COLORS[1], commissionRate: 50 },
    { id: "t3", organizationId: "org1", branchId: "b1", role: "trainer", fullName: "Cem Yıldız", phone: "0532 000 00 03", avatarColor: PT_BADGE_COLORS[2], bio: null, badgeColor: PT_BADGE_COLORS[2], commissionRate: 50 },
    { id: "t4", organizationId: "org1", branchId: "b2", role: "trainer", fullName: "Selin Kara", phone: "0532 000 00 04", avatarColor: PT_BADGE_COLORS[0], bio: null, badgeColor: PT_BADGE_COLORS[0], commissionRate: 45 },
    { id: "t5", organizationId: "org2", branchId: "b3", role: "trainer", fullName: "Kaan Duru", phone: "0532 000 00 05", avatarColor: PT_BADGE_COLORS[3], bio: null, badgeColor: PT_BADGE_COLORS[3], commissionRate: 50 },
  ];

  const profiles: Profile[] = [
    { id: "owner1", organizationId: "org1", branchId: null, role: "owner", fullName: "Ayşe Sport (Şube Sahibi)", phone: null, avatarColor: "var(--color-gold)" },
    { id: "super1", organizationId: "org1", branchId: null, role: "super_admin", fullName: "Onur (Süper Admin)", phone: null, avatarColor: "var(--color-ink)" },
    { id: "owner2", organizationId: "org2", branchId: null, role: "owner", fullName: "Mert Çiftçi (Fitness Farm)", phone: null, avatarColor: "var(--color-gold)" },
    ...trainers.map((t): Profile => ({ id: t.id, organizationId: t.organizationId, branchId: t.branchId, role: "trainer", fullName: t.fullName, phone: t.phone, avatarColor: t.avatarColor })),
  ];

  const todayDate = new Date().toISOString().slice(0, 10);
  const members: Member[] = [
    { id: "m1", branchId: "b1", fullName: "Kerem Uslu", phone: "0533 111 22 33", notes: null, createdAt: new Date().toISOString(), packageName: "8 Ders Paketi", packageTotalPrice: 6400, packageTotalSessions: 8, packageSessionsUsed: 2, packagePaidAt: todayDate },
    { id: "m2", branchId: "b1", fullName: "Naz Yavuz", phone: "0533 222 33 44", notes: "Diz sakatlığı geçmişi var", createdAt: new Date().toISOString(), packageName: "12 Ders Paketi", packageTotalPrice: 9000, packageTotalSessions: 12, packageSessionsUsed: 1, packagePaidAt: todayDate },
    { id: "m3", branchId: "b1", fullName: "Barış Ete", phone: "0533 333 44 55", notes: null, createdAt: new Date().toISOString(), packageName: null, packageTotalPrice: null, packageTotalSessions: null, packageSessionsUsed: 0, packagePaidAt: null },
  ];

  const payments: Payment[] = [
    { id: "pay1", memberId: "m1", branchId: "b1", amount: 6400, packageName: "8 Ders Paketi", totalSessions: 8, paidAt: todayDate, createdAt: new Date().toISOString() },
    { id: "pay2", memberId: "m2", branchId: "b1", amount: 9000, packageName: "12 Ders Paketi", totalSessions: 12, paidAt: todayDate, createdAt: new Date().toISOString() },
  ];

  const branchExpenses: BranchExpense[] = [{ id: "exp1", branchId: "b1", name: "Kira", amount: 30000, createdAt: new Date().toISOString() }];

  const sessions: GymSession[] = [
    { id: "s1", branchId: "b1", trainerId: "t1", memberId: "m1", memberName: "Kerem Uslu", title: "Bire bir PT", workoutTypeId: "wt2", startsAt: todayIso(9, 0), durationMin: 60, status: "scheduled", notes: null, startedAt: null, endedAt: null, createdBy: "t1", createdAt: new Date().toISOString() },
    { id: "s2", branchId: "b1", trainerId: "t2", memberId: "m2", memberName: "Naz Yavuz", title: "Bire bir PT", workoutTypeId: "wt1", startsAt: todayIso(9, 0), durationMin: 60, status: "scheduled", notes: null, startedAt: null, endedAt: null, createdBy: "t2", createdAt: new Date().toISOString() },
    { id: "s3", branchId: "b1", trainerId: "t3", memberId: null, memberName: "Deneme dersi", title: "Bire bir PT", workoutTypeId: "wt3", startsAt: todayIso(9, 0), durationMin: 30, status: "scheduled", notes: null, startedAt: null, endedAt: null, createdBy: "t3", createdAt: new Date().toISOString() },
    { id: "s4", branchId: "b1", trainerId: "t1", memberId: "m3", memberName: "Barış Ete", title: "Bire bir PT", workoutTypeId: "wt1", startsAt: todayIso(11, 0), durationMin: 45, status: "scheduled", notes: "Sırt egzersizlerine ağırlık ver", startedAt: null, endedAt: null, createdBy: "t1", createdAt: new Date().toISOString() },
    { id: "s5", branchId: "b1", trainerId: "t2", memberId: null, memberName: null, title: "Bire bir PT", workoutTypeId: "wt2", startsAt: todayIso(16, 30), durationMin: 60, status: "scheduled", notes: null, startedAt: null, endedAt: null, createdBy: "t2", createdAt: new Date().toISOString() },
    { id: "s6", branchId: "b1", trainerId: "t1", memberId: "m1", memberName: "Kerem Uslu", title: "Bire bir PT", workoutTypeId: "wt1", startsAt: todayIso(10, 0, -1), durationMin: 60, status: "done", notes: null, startedAt: todayIso(10, 0, -1), endedAt: todayIso(11, 0, -1), createdBy: "t1", createdAt: new Date().toISOString() },
    { id: "s7", branchId: "b1", trainerId: "t1", memberId: "m2", memberName: "Naz Yavuz", title: "Bire bir PT", workoutTypeId: "wt3", startsAt: todayIso(10, 0, -3), durationMin: 60, status: "done", notes: null, startedAt: todayIso(10, 0, -3), endedAt: todayIso(11, 0, -3), createdBy: "t1", createdAt: new Date().toISOString() },
    { id: "s8", branchId: "b1", trainerId: "t1", memberId: "m3", memberName: "Barış Ete", title: "Bire bir PT", workoutTypeId: "wt1", startsAt: todayIso(10, 0, -8), durationMin: 60, status: "done", notes: null, startedAt: todayIso(10, 0, -8), endedAt: todayIso(11, 0, -8), createdBy: "t1", createdAt: new Date().toISOString() },
    { id: "s9", branchId: "b3", trainerId: "t5", memberId: null, memberName: "Deneme üye", title: "Bire bir PT", workoutTypeId: "wt5", startsAt: todayIso(9, 30), durationMin: 60, status: "in_progress", notes: null, startedAt: todayIso(9, 35), endedAt: null, createdBy: "t5", createdAt: new Date().toISOString() },
  ];

  return { organizations, branches, profiles, trainers, members, workoutTypes, sessions, payments, branchExpenses };
}

function load(): MockDB {
  if (typeof localStorage === "undefined") return seed();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const db = seed();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return db;
  }
  try {
    return JSON.parse(raw) as MockDB;
  } catch {
    return seed();
  }
}

let db = load();

function persist() {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
  listeners.forEach((fn) => fn());
}

const listeners = new Set<() => void>();

function bumpMemberUsage(memberId: string, delta: 1 | -1) {
  db = {
    ...db,
    members: db.members.map((m) =>
      m.id === memberId ? { ...m, packageSessionsUsed: Math.max(0, m.packageSessionsUsed + delta) } : m,
    ),
  };
}

export function subscribeMockDB(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const mockDB = {
  get(): MockDB {
    return db;
  },
  // Mirrors the real DB's bump_member_package_usage trigger, so mock mode
  // behaves the same way: package_sessions_used only ever moves in response
  // to an actual non-cancelled session existing for that member.
  addSession(session: GymSession) {
    db = { ...db, sessions: [...db.sessions, session] };
    if (session.memberId && session.status !== "cancelled") bumpMemberUsage(session.memberId, 1);
    persist();
  },
  updateSession(id: string, patch: Partial<Pick<GymSession, "notes" | "status" | "startedAt" | "endedAt">>) {
    const before = db.sessions.find((s) => s.id === id);
    db = { ...db, sessions: db.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
    if (before && patch.status && patch.status !== before.status && before.memberId) {
      if (before.status !== "cancelled" && patch.status === "cancelled") bumpMemberUsage(before.memberId, -1);
      else if (before.status === "cancelled" && patch.status !== "cancelled") bumpMemberUsage(before.memberId, 1);
    }
    persist();
  },
  updateProfileAvatar(profileId: string, avatarUrl: string) {
    db = { ...db, profiles: db.profiles.map((p) => (p.id === profileId ? { ...p, avatarUrl } : p)) };
    persist();
  },
  updateProfileFields(profileId: string, patch: Partial<Pick<Profile, "fullName" | "phone">>) {
    db = {
      ...db,
      profiles: db.profiles.map((p) => (p.id === profileId ? { ...p, ...patch } : p)),
      trainers: db.trainers.map((t) => (t.id === profileId ? { ...t, ...patch } : t)),
    };
    persist();
  },
  addBranch(branch: Branch) {
    db = { ...db, branches: [...db.branches, branch] };
    persist();
  },
  updateBranch(id: string, patch: Partial<Pick<Branch, "name" | "address" | "maxConcurrentSessions">>) {
    db = { ...db, branches: db.branches.map((b) => (b.id === id ? { ...b, ...patch } : b)) };
    persist();
  },
  updateOrganization(id: string, patch: Partial<Pick<Organization, "name" | "logoUrl" | "accentColor">>) {
    db = { ...db, organizations: db.organizations.map((o) => (o.id === id ? { ...o, ...patch } : o)) };
    persist();
  },
  addMember(member: Member) {
    db = { ...db, members: [...db.members, member] };
    persist();
  },
  updateMember(
    id: string,
    patch: Partial<
      Pick<
        Member,
        "fullName" | "phone" | "notes" | "packageName" | "packageTotalPrice" | "packageTotalSessions" | "packageSessionsUsed" | "packagePaidAt"
      >
    >,
  ) {
    db = { ...db, members: db.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) };
    persist();
  },
  updateTrainerCommission(trainerId: string, commissionRate: number) {
    db = { ...db, trainers: db.trainers.map((t) => (t.id === trainerId ? { ...t, commissionRate } : t)) };
    persist();
  },
  addPayment(payment: Payment) {
    db = { ...db, payments: [...db.payments, payment] };
    persist();
  },
  addBranchExpense(expense: BranchExpense) {
    db = { ...db, branchExpenses: [...db.branchExpenses, expense] };
    persist();
  },
  deleteBranchExpense(id: string) {
    db = { ...db, branchExpenses: db.branchExpenses.filter((e) => e.id !== id) };
    persist();
  },
  addWorkoutType(wt: WorkoutType) {
    db = { ...db, workoutTypes: [...db.workoutTypes, wt] };
    persist();
  },
  deleteWorkoutType(id: string) {
    db = { ...db, workoutTypes: db.workoutTypes.filter((w) => w.id !== id) };
    persist();
  },
  upsertPerson(profile: Profile, trainer: Trainer | null) {
    db = {
      ...db,
      profiles: [...db.profiles.filter((p) => p.id !== profile.id), profile],
      trainers: trainer ? [...db.trainers.filter((t) => t.id !== trainer.id), trainer] : db.trainers,
    };
    persist();
  },
  addOrganizationBundle(org: Organization, branch: Branch, ownerProfile: Profile, workoutType: WorkoutType) {
    db = {
      ...db,
      organizations: [...db.organizations, org],
      branches: [...db.branches, branch],
      profiles: [...db.profiles, ownerProfile],
      workoutTypes: [...db.workoutTypes, workoutType],
    };
    persist();
  },
  resetToSeed() {
    db = seed();
    persist();
  },
};
