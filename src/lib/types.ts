export type Role = "super_admin" | "owner" | "trainer";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  accentColor: string;
  ownerAuthId: string;
  createdAt: string;
  /** Day of month the PT commission/payout period starts on (1-28) — a
   * calendar-month "bu ay" rarely matches an owner's actual payday. */
  commissionPeriodStartDay: number;
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
  /** The PT this member belongs to — every member should have one, so a PT's
   * own profile page can show their roster and an owner can see who's
   * carrying how many students. A specific session can still be logged
   * under a different (colleague) trainer; this is the member's "home" PT. */
  assignedTrainerId: string | null;
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

/** One package purchase/renewal event — this is both the revenue ledger
 * (cash-basis: what reporting sums, never rewritten by a later renewal) and
 * the package history a member sees. Lifecycle:
 *   "active"    — the package `Member.package*` currently tracks
 *   "upcoming"  — paid for in advance, queued, not started yet
 *   "completed" — finished and archived; sessionsUsed freezes its final count
 * At most one "active" row per member — session logging (server-side
 * trigger in real mode, bumpMemberUsage in mock mode) archives it and
 * promotes the earliest "upcoming" row automatically once sessions run out. */
export interface Payment {
  id: string;
  memberId: string;
  branchId: string;
  amount: number;
  packageName: string | null;
  totalSessions: number | null;
  paidAt: string; // date, YYYY-MM-DD
  createdAt: string;
  status: "active" | "upcoming" | "completed";
  /** Snapshot of Member.packageSessionsUsed at the moment this package was
   * archived. Null while "active"/"upcoming". */
  sessionsUsed: number | null;
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

export const PT_BADGE_COLORS = [
  "var(--color-pt-clay)",
  "var(--color-pt-moss)",
  "var(--color-pt-slate)",
  "var(--color-pt-plum)",
  "var(--color-pt-stone)",
] as const;
