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

/** What a pre-login visitor is allowed to know about a tenant: branding
 * only, via the public_organization_branding() RPC — never owner_auth_id or
 * created_at, which are only visible to that org's own members. */
export interface PublicOrgBranding {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  accentColor: string;
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
  /** From auth.users, real mode only — not stored on profiles and not present in mock mode. */
  email?: string | null;
}

export interface Trainer extends Profile {
  // A branch owner who also personally coaches gets a trainers row too (see
  // ensureTrainerRecordExists in api.ts), so this is the real profile role,
  // not always literally "trainer" — used to exempt owner-given sessions from
  // commission math.
  role: Role;
  branchId: string;
  bio: string | null;
  badgeColor: string;
  /** Percent of a session's revenue this trainer keeps (owner sets it per PT).
   * Meaningless for a branch owner's own sessions — those are commission-exempt. */
  commissionRate: number;
}

export interface Member {
  id: string;
  branchId: string;
  fullName: string;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  /** Free-form package the member bought — no catalog, entered per member. */
  packageName: string | null;
  packageTotalPrice: number | null;
  packageTotalSessions: number | null;
  /** Maintained server-side (DB trigger on sessions), not client math: bumped
   * when a non-cancelled session is logged against this member, credited
   * back on cancel. Reset to 0 whenever the package fields are (re)set. */
  packageSessionsUsed: number;
  /** When the current package was paid for — revenue counts toward this
   * month, not whichever month the sessions actually happen in (fees are
   * collected in bulk up front, per the owner). Null if no package yet. */
  packagePaidAt: string | null;
}

/** One payment event — created whenever a member's package is first set or
 * renewed (never on a mere correction to the same package). This is what
 * revenue reporting sums, not live session activity, so a later renewal can
 * never rewrite an earlier month's ciro. */
export interface Payment {
  id: string;
  memberId: string;
  branchId: string;
  amount: number;
  packageName: string | null;
  totalSessions: number | null;
  paidAt: string; // date, YYYY-MM-DD
  createdAt: string;
}

/** A standing monthly cost (kira, elektrik, vb.) the owner enters once and
 * which applies every month going forward — not a per-month ledger entry. */
export interface BranchExpense {
  id: string;
  branchId: string;
  name: string;
  amount: number;
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
