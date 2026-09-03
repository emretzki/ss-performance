export type Role = "super_admin" | "owner" | "trainer";

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  createdAt: string;
}

export interface Profile {
  id: string;
  branchId: string | null;
  role: Role;
  fullName: string;
  phone: string | null;
  avatarColor: string;
  avatarUrl?: string | null;
}

export interface Trainer extends Profile {
  role: "trainer";
  branchId: string;
  bio: string | null;
  badgeColor: string;
}

export interface Member {
  id: string;
  branchId: string;
  fullName: string;
  phone: string | null;
  notes: string | null;
  createdAt: string;
}

export type SessionStatus = "scheduled" | "done" | "cancelled";

export interface GymSession {
  id: string;
  branchId: string;
  trainerId: string;
  memberId: string | null;
  memberName: string | null;
  title: string;
  startsAt: string; // ISO
  durationMin: number;
  status: SessionStatus;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export const SLOT_MINUTES = 30;
export const MAX_SESSIONS_PER_SLOT = 3;

export const PT_BADGE_COLORS = [
  "var(--color-pt-clay)",
  "var(--color-pt-moss)",
  "var(--color-pt-slate)",
  "var(--color-pt-plum)",
  "var(--color-pt-stone)",
] as const;
