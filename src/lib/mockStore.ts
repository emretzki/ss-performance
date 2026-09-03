import type { Branch, GymSession, Member, Profile, Trainer } from "./types";
import { PT_BADGE_COLORS } from "./types";

const STORAGE_KEY = "sportscience-mock-db-v1";

interface MockDB {
  branches: Branch[];
  profiles: Profile[];
  trainers: Trainer[];
  members: Member[];
  sessions: GymSession[];
}

function todayIso(hour: number, minute: number, dayOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function seed(): MockDB {
  const branches: Branch[] = [
    { id: "b1", name: "SportScience Kadıköy", address: "Caferağa Mah. Moda Cad. No:12", createdAt: new Date().toISOString() },
    { id: "b2", name: "SportScience Ataşehir", address: "Barbaros Mah. Ünlü Sok. No:4", createdAt: new Date().toISOString() },
  ];

  const trainers: Trainer[] = [
    { id: "t1", branchId: "b1", role: "trainer", fullName: "Emre Korkmaz", phone: "0532 000 00 01", avatarColor: PT_BADGE_COLORS[0], bio: null, badgeColor: PT_BADGE_COLORS[0] },
    { id: "t2", branchId: "b1", role: "trainer", fullName: "Deniz Aksoy", phone: "0532 000 00 02", avatarColor: PT_BADGE_COLORS[1], bio: null, badgeColor: PT_BADGE_COLORS[1] },
    { id: "t3", branchId: "b1", role: "trainer", fullName: "Cem Yıldız", phone: "0532 000 00 03", avatarColor: PT_BADGE_COLORS[2], bio: null, badgeColor: PT_BADGE_COLORS[2] },
    { id: "t4", branchId: "b2", role: "trainer", fullName: "Selin Kara", phone: "0532 000 00 04", avatarColor: PT_BADGE_COLORS[0], bio: null, badgeColor: PT_BADGE_COLORS[0] },
  ];

  const profiles: Profile[] = [
    { id: "owner1", branchId: "b1", role: "owner", fullName: "Ayşe Sport (Şube Sahibi)", phone: null, avatarColor: "var(--color-gold)" },
    { id: "super1", branchId: null, role: "super_admin", fullName: "Onur (Süper Admin)", phone: null, avatarColor: "var(--color-ink)" },
    ...trainers.map((t): Profile => ({ id: t.id, branchId: t.branchId, role: "trainer", fullName: t.fullName, phone: t.phone, avatarColor: t.avatarColor })),
  ];

  const members: Member[] = [
    { id: "m1", branchId: "b1", fullName: "Kerem Uslu", phone: "0533 111 22 33", notes: null, createdAt: new Date().toISOString() },
    { id: "m2", branchId: "b1", fullName: "Naz Yavuz", phone: "0533 222 33 44", notes: "Diz sakatlığı geçmişi var", createdAt: new Date().toISOString() },
    { id: "m3", branchId: "b1", fullName: "Barış Ete", phone: "0533 333 44 55", notes: null, createdAt: new Date().toISOString() },
  ];

  const sessions: GymSession[] = [
    { id: "s1", branchId: "b1", trainerId: "t1", memberId: "m1", memberName: "Kerem Uslu", title: "Bire bir PT", startsAt: todayIso(9, 0), durationMin: 60, status: "scheduled", notes: null, createdBy: "t1", createdAt: new Date().toISOString() },
    { id: "s2", branchId: "b1", trainerId: "t2", memberId: "m2", memberName: "Naz Yavuz", title: "Bire bir PT", startsAt: todayIso(9, 0), durationMin: 60, status: "scheduled", notes: null, createdBy: "t2", createdAt: new Date().toISOString() },
    { id: "s3", branchId: "b1", trainerId: "t3", memberId: null, memberName: "Deneme dersi", title: "Bire bir PT", startsAt: todayIso(9, 0), durationMin: 30, status: "scheduled", notes: null, createdBy: "t3", createdAt: new Date().toISOString() },
    { id: "s4", branchId: "b1", trainerId: "t1", memberId: "m3", memberName: "Barış Ete", title: "Bire bir PT", startsAt: todayIso(11, 0), durationMin: 45, status: "scheduled", notes: "Sırt egzersizlerine ağırlık ver", createdBy: "t1", createdAt: new Date().toISOString() },
    { id: "s5", branchId: "b1", trainerId: "t2", memberId: null, memberName: null, title: "Bire bir PT", startsAt: todayIso(16, 30), durationMin: 60, status: "scheduled", notes: null, createdBy: "t2", createdAt: new Date().toISOString() },
    { id: "s6", branchId: "b1", trainerId: "t1", memberId: "m1", memberName: "Kerem Uslu", title: "Bire bir PT", startsAt: todayIso(10, 0, -1), durationMin: 60, status: "done", notes: null, createdBy: "t1", createdAt: new Date().toISOString() },
    { id: "s7", branchId: "b1", trainerId: "t1", memberId: "m2", memberName: "Naz Yavuz", title: "Bire bir PT", startsAt: todayIso(10, 0, -3), durationMin: 60, status: "done", notes: null, createdBy: "t1", createdAt: new Date().toISOString() },
    { id: "s8", branchId: "b1", trainerId: "t1", memberId: "m3", memberName: "Barış Ete", title: "Bire bir PT", startsAt: todayIso(10, 0, -8), durationMin: 60, status: "done", notes: null, createdBy: "t1", createdAt: new Date().toISOString() },
  ];

  return { branches, profiles, trainers, members, sessions };
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

export function subscribeMockDB(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const mockDB = {
  get(): MockDB {
    return db;
  },
  addSession(session: GymSession) {
    db = { ...db, sessions: [...db.sessions, session] };
    persist();
  },
  updateSession(id: string, patch: Partial<Pick<GymSession, "notes" | "status">>) {
    db = { ...db, sessions: db.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
    persist();
  },
  updateProfileAvatar(profileId: string, avatarUrl: string) {
    db = { ...db, profiles: db.profiles.map((p) => (p.id === profileId ? { ...p, avatarUrl } : p)) };
    persist();
  },
  addBranch(branch: Branch) {
    db = { ...db, branches: [...db.branches, branch] };
    persist();
  },
  addMember(member: Member) {
    db = { ...db, members: [...db.members, member] };
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
  resetToSeed() {
    db = seed();
    persist();
  },
};
