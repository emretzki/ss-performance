export type Role = "super_admin" | "owner" | "trainer";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  accentColor: string;
  ownerAuthId: string;
  createdAt: string;
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  address: string | null;
  maxConcurrentSessions: number;
  createdAt: string;
}

export interface Profile {
  id: string;
  organizationId: string;
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

export interface WorkoutType {
  id: string;
  organizationId: string;
  name: string;
  color: string;
  createdAt: string;
}

export type SessionStatus = "scheduled" | "in_progress" | "done" | "cancelled";

export interface GymSession {
  id: string;
  branchId: string;
  trainerId: string;
  memberId: string | null;
  memberName: string | null;
  title: string;
  workoutTypeId: string | null;
  startsAt: string; // ISO
  durationMin: number;
  status: SessionStatus;
  notes: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdBy: string;
  createdAt: string;
}

export const SLOT_MINUTES = 30;
export const DEFAULT_MAX_SESSIONS_PER_SLOT = 3;
export const LIVE_SESSION_AUTO_END_MIN = 60;

export const PT_BADGE_COLORS = [
  "var(--color-pt-clay)",
  "var(--color-pt-moss)",
  "var(--color-pt-slate)",
  "var(--color-pt-plum)",
  "var(--color-pt-stone)",
] as const;
