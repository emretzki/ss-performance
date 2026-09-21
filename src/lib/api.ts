import { isSupabaseConfigured, supabase } from "./supabase";
import { mockDB, subscribeMockDB } from "./mockStore";
import { slugify, tenantHandoffUrl } from "./tenant";
import {
  DEFAULT_MAX_SESSIONS_PER_SLOT,
  LIVE_SESSION_AUTO_END_MIN,
  PT_BADGE_COLORS,
  type Branch,
  type GymSession,
  type Member,
  type Organization,
  type Profile,
  type Role,
  type SessionStatus,
  type Trainer,
  type WorkoutType,
} from "./types";

export class SlotFullError extends Error {
  nearestAvailable: string | null;
  constructor(nearestAvailable: string | null) {
    super("Bu saat dolu");
    this.nearestAvailable = nearestAvailable;
  }
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

/** A session left running past its 1-hour cap displays as done even before the cron job persists it. */
export function displayStatus(session: GymSession, now: Date = new Date()): SessionStatus {
  if (session.status === "in_progress" && session.startedAt) {
    const startedMs = new Date(session.startedAt).getTime();
    if (now.getTime() - startedMs >= LIVE_SESSION_AUTO_END_MIN * 60_000) return "done";
  }
  return session.status;
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

function mapOrganization(r: Record<string, unknown>): Organization {
  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    logoUrl: r.logo_url as string | null,
    accentColor: r.accent_color as string,
    ownerAuthId: r.owner_auth_id as string,
    createdAt: r.created_at as string,
  };
}

export async function getMyOrganization(organizationId: string): Promise<Organization> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("organizations").select("*").eq("id", organizationId).single();
    if (error) throw error;
    return mapOrganization(data);
  }
  const org = mockDB.get().organizations.find((o) => o.id === organizationId);
  if (!org) throw new Error("Organizasyon bulunamadı.");
  return org;
}

/** Public lookup (no auth required) used to brand a tenant's login page before anyone signs in. */
export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("organizations").select("*").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return data ? mapOrganization(data) : null;
  }
  return mockDB.get().organizations.find((o) => o.slug === slug) ?? null;
}

/** "Salonumu bul" flow on the root landing page: email in, tenant slug out (or null). */
export async function findOrganizationSlugByEmail(email: string): Promise<string | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc("find_organization_slug_by_email", { input_email: email });
    if (error) throw error;
    return (data as string | null) ?? null;
  }
  const profile = mockDB.get().profiles[0]; // mock mode has no emails; just demo the flow with the first profile
  const org = mockDB.get().organizations.find((o) => o.id === profile?.organizationId);
  return org?.slug ?? null;
}

export type RootLoginResult =
  | { ok: true; handoffUrl: string }
  | { ok: false; error: string };

/**
 * The root gymkoc.com login: authenticate once here, then hand the session
 * off to the account's own tenant subdomain (see src/lib/tenant.ts) so the
 * person never has to know or type their gym's address.
 */
export async function signInAtRootAndGetHandoff(email: string, password: string): Promise<RootLoginResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: "Bu özellik sadece gymkoc.com'da çalışır." };
  }
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError || !signInData.session) {
    return { ok: false, error: "Giriş yapılamadı. E-posta veya şifre hatalı." };
  }

  const { data: p, error: profileError } = await supabase
    .from("profiles")
    .select("organizations(slug)")
    .eq("id", signInData.user.id)
    .single();
  if (profileError || !p) {
    await supabase.auth.signOut({ scope: "local" });
    return { ok: false, error: "Bu hesap için bir salon bulunamadı." };
  }
  const org = Array.isArray(p.organizations) ? p.organizations[0] : p.organizations;
  if (!org?.slug) {
    await supabase.auth.signOut({ scope: "local" });
    return { ok: false, error: "Bu hesap için bir salon bulunamadı." };
  }

  const handoffUrl = tenantHandoffUrl(org.slug, signInData.session.access_token, signInData.session.refresh_token);
  // Only clear this browser's local copy — the tokens we're handing off must stay valid.
  await supabase.auth.signOut({ scope: "local" });
  return { ok: true, handoffUrl };
}

export async function updateOrganization(
  id: string,
  input: { name: string; accentColor: string; logoUrl: string | null },
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("organizations")
      .update({ name: input.name, accent_color: input.accentColor, logo_url: input.logoUrl })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  mockDB.updateOrganization(id, { name: input.name, accentColor: input.accentColor, logoUrl: input.logoUrl });
}

export async function uploadOrgLogo(ownerAuthId: string, file: File): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${ownerAuthId}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage.from("org-logos").upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("org-logos").getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface CreateOrganizationInput {
  email: string;
  password: string;
  fullName: string;
  orgName: string;
  logoBase64: string | null;
  logoContentType: string | null;
  accentColor: string;
  branchAddress: string | null;
}

export async function createOrganization(input: CreateOrganizationInput): Promise<{ userId: string; slug: string }> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.functions.invoke<{ userId: string; slug: string; error?: string }>("create-organization", {
      body: input,
    });
    if (error) throw error;
    if (!data || data.error) throw new Error(data?.error ?? "Salon oluşturulamadı.");
    return { userId: data.userId, slug: data.slug };
  }

  const orgId = `org${Date.now()}`;
  const userId = `owner${Date.now()}`;
  const branchId = `b${Date.now()}`;
  const workoutTypeId = `wt${Date.now()}`;
  const logoUrl = input.logoBase64 && input.logoContentType ? `data:${input.logoContentType};base64,${input.logoBase64}` : null;
  const existingSlugs = new Set(mockDB.get().organizations.map((o) => o.slug));
  const base = slugify(input.orgName) || "salon";
  let slug = base;
  let n = 2;
  while (existingSlugs.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  mockDB.addOrganizationBundle(
    { id: orgId, name: input.orgName, slug, logoUrl, accentColor: input.accentColor, ownerAuthId: userId, createdAt: new Date().toISOString() },
    { id: branchId, organizationId: orgId, name: input.orgName, address: input.branchAddress, maxConcurrentSessions: DEFAULT_MAX_SESSIONS_PER_SLOT, createdAt: new Date().toISOString() },
    { id: userId, organizationId: orgId, branchId: null, role: "owner", fullName: input.fullName, phone: null, avatarColor: "var(--color-gold)" },
    { id: workoutTypeId, organizationId: orgId, name: "Bire bir PT", color: input.accentColor, createdAt: new Date().toISOString() },
  );
  return { userId, slug };
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

function mapBranch(r: Record<string, unknown>): Branch {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    name: r.name as string,
    address: r.address as string | null,
    maxConcurrentSessions: (r.max_concurrent_sessions as number) ?? DEFAULT_MAX_SESSIONS_PER_SLOT,
    createdAt: r.created_at as string,
  };
}

// organizationId is only used in mock mode (real Supabase scopes this via RLS
// automatically), so tenants stay isolated in local/demo mode too.
export async function listBranches(organizationId?: string): Promise<Branch[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("branches").select("*").order("name");
    if (error) throw error;
    return data.map(mapBranch);
  }
  const all = mockDB.get().branches;
  return organizationId ? all.filter((b) => b.organizationId === organizationId) : all;
}

export async function createBranch(input: { organizationId: string; name: string; address: string | null }): Promise<Branch> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("branches")
      .insert({ organization_id: input.organizationId, name: input.name, address: input.address })
      .select()
      .single();
    if (error) throw error;
    return mapBranch(data);
  }
  const branch: Branch = {
    id: `b${Date.now()}`,
    organizationId: input.organizationId,
    name: input.name,
    address: input.address,
    maxConcurrentSessions: DEFAULT_MAX_SESSIONS_PER_SLOT,
    createdAt: new Date().toISOString(),
  };
  mockDB.addBranch(branch);
  return branch;
}

export async function updateBranch(
  id: string,
  input: { name: string; address: string | null; maxConcurrentSessions: number },
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("branches")
      .update({ name: input.name, address: input.address, max_concurrent_sessions: input.maxConcurrentSessions })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  mockDB.updateBranch(id, input);
}

// ---------------------------------------------------------------------------
// Workout types
// ---------------------------------------------------------------------------

export async function listWorkoutTypes(organizationId: string): Promise<WorkoutType[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("workout_types").select("*").eq("organization_id", organizationId).order("name");
    if (error) throw error;
    return data.map((r) => ({ id: r.id, organizationId: r.organization_id, name: r.name, color: r.color, createdAt: r.created_at }));
  }
  return mockDB.get().workoutTypes.filter((w) => w.organizationId === organizationId);
}

export async function createWorkoutType(input: { organizationId: string; name: string; color: string }): Promise<WorkoutType> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("workout_types")
      .insert({ organization_id: input.organizationId, name: input.name, color: input.color })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id, organizationId: data.organization_id, name: data.name, color: data.color, createdAt: data.created_at };
  }
  const wt: WorkoutType = { id: `wt${Date.now()}`, organizationId: input.organizationId, name: input.name, color: input.color, createdAt: new Date().toISOString() };
  mockDB.addWorkoutType(wt);
  return wt;
}

export async function deleteWorkoutType(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("workout_types").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  mockDB.deleteWorkoutType(id);
}

// ---------------------------------------------------------------------------
// Trainers / people
// ---------------------------------------------------------------------------

export async function listTrainers(branchId: string): Promise<Trainer[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("trainers")
      .select("id, branch_id, bio, badge_color, profiles(organization_id, full_name, phone, avatar_url)")
      .eq("branch_id", branchId);
    if (error) throw error;
    return data.map((r) => {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return {
        id: r.id,
        organizationId: p?.organization_id ?? "",
        branchId: r.branch_id,
        role: "trainer" as const,
        fullName: p?.full_name ?? "",
        phone: p?.phone ?? null,
        avatarColor: r.badge_color,
        avatarUrl: p?.avatar_url ?? null,
        badgeColor: r.badge_color,
        bio: r.bio,
      };
    });
  }
  return mockDB.get().trainers.filter((t) => t.branchId === branchId);
}

export interface CreatePersonInput {
  email: string;
  password: string;
  fullName: string;
  phone: string | null;
  role: Extract<Role, "owner" | "trainer">;
  branchId: string;
  organizationId: string;
}

export async function createPersonWithRole(input: CreatePersonInput): Promise<Profile> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.functions.invoke<{ id: string; error?: string }>("create-person", {
      body: {
        email: input.email,
        password: input.password,
        fullName: input.fullName,
        phone: input.phone,
        role: input.role,
        branchId: input.branchId,
      },
    });
    if (error) throw error;
    if (!data || data.error) throw new Error(data?.error ?? "Kişi oluşturulamadı.");

    return {
      id: data.id,
      organizationId: input.organizationId,
      branchId: input.branchId,
      role: input.role,
      fullName: input.fullName,
      phone: input.phone,
      avatarColor: "var(--color-gold)",
    };
  }

  const id = `p${Date.now()}`;
  const profile: Profile = {
    id,
    organizationId: input.organizationId,
    branchId: input.branchId,
    role: input.role,
    fullName: input.fullName,
    phone: input.phone,
    avatarColor: input.role === "owner" ? "var(--color-gold)" : randomBadgeColor(),
  };
  const trainer: Trainer | null =
    input.role === "trainer"
      ? { ...profile, role: "trainer", branchId: input.branchId, bio: null, badgeColor: profile.avatarColor }
      : null;
  mockDB.upsertPerson(profile, trainer);
  return profile;
}

function randomBadgeColor(): string {
  return PT_BADGE_COLORS[Math.floor(Math.random() * PT_BADGE_COLORS.length)];
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export async function listMembers(branchId: string): Promise<Member[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("members").select("*").eq("branch_id", branchId).order("full_name");
    if (error) throw error;
    return data.map((r) => ({ id: r.id, branchId: r.branch_id, fullName: r.full_name, phone: r.phone, notes: r.notes, createdAt: r.created_at }));
  }
  return mockDB.get().members.filter((m) => m.branchId === branchId);
}

export async function createMember(input: { branchId: string; fullName: string; phone: string | null; notes: string | null }): Promise<Member> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("members")
      .insert({ branch_id: input.branchId, full_name: input.fullName, phone: input.phone, notes: input.notes })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id, branchId: data.branch_id, fullName: data.full_name, phone: data.phone, notes: data.notes, createdAt: data.created_at };
  }
  const member: Member = {
    id: `m${Date.now()}`,
    branchId: input.branchId,
    fullName: input.fullName,
    phone: input.phone,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  mockDB.addMember(member);
  return member;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

function mapSession(r: Record<string, unknown>): GymSession {
  return {
    id: r.id as string,
    branchId: r.branch_id as string,
    trainerId: r.trainer_id as string,
    memberId: r.member_id as string | null,
    memberName: (r.member_name as string | null) ?? null,
    title: r.title as string,
    workoutTypeId: (r.workout_type_id as string | null) ?? null,
    startsAt: r.starts_at as string,
    durationMin: r.duration_min as number,
    status: r.status as SessionStatus,
    notes: (r.notes as string | null) ?? null,
    startedAt: (r.started_at as string | null) ?? null,
    endedAt: (r.ended_at as string | null) ?? null,
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
  };
}

export async function listSessions(branchId: string, rangeStart: Date, rangeEnd: Date): Promise<GymSession[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("branch_id", branchId)
      .gte("starts_at", rangeStart.toISOString())
      .lt("starts_at", rangeEnd.toISOString());
    if (error) throw error;
    return data.map(mapSession);
  }
  return mockDB
    .get()
    .sessions.filter((s) => s.branchId === branchId && new Date(s.startsAt) >= rangeStart && new Date(s.startsAt) < rangeEnd);
}

export interface CreateSessionInput {
  branchId: string;
  trainerId: string;
  memberId: string | null;
  memberName: string | null;
  workoutTypeId: string | null;
  startsAt: string;
  durationMin: number;
  notes: string | null;
  createdBy: string;
}

export async function updateSessionNote(id: string, notes: string | null): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("sessions").update({ notes }).eq("id", id);
    if (error) throw error;
    return;
  }
  mockDB.updateSession(id, { notes });
}

export async function cancelSession(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("sessions").update({ status: "cancelled" }).eq("id", id);
    if (error) throw error;
    return;
  }
  mockDB.updateSession(id, { status: "cancelled" });
}

export async function startSession(id: string): Promise<void> {
  const startedAt = new Date().toISOString();
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("sessions").update({ status: "in_progress", started_at: startedAt }).eq("id", id);
    if (error) throw error;
    return;
  }
  mockDB.updateSession(id, { status: "in_progress", startedAt });
}

export async function endSession(id: string): Promise<void> {
  const endedAt = new Date().toISOString();
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("sessions").update({ status: "done", ended_at: endedAt }).eq("id", id);
    if (error) throw error;
    return;
  }
  mockDB.updateSession(id, { status: "done", endedAt });
}

async function getBranchCapacity(branchId: string): Promise<number> {
  const branches = await listBranches();
  return branches.find((b) => b.id === branchId)?.maxConcurrentSessions ?? DEFAULT_MAX_SESSIONS_PER_SLOT;
}

export async function createSession(input: CreateSessionInput): Promise<GymSession> {
  const dayStart = new Date(input.startsAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [existing, capacity] = await Promise.all([
    listSessions(input.branchId, dayStart, dayEnd),
    getBranchCapacity(input.branchId),
  ]);
  const newStart = new Date(input.startsAt).getTime();
  const newEnd = newStart + input.durationMin * 60_000;

  const overlapping = existing.filter((s) => {
    if (s.status === "cancelled") return false;
    const sStart = new Date(s.startsAt).getTime();
    const sEnd = sStart + s.durationMin * 60_000;
    return overlaps(newStart, newEnd, sStart, sEnd);
  });

  if (overlapping.length >= capacity) {
    throw new SlotFullError(findNearestAvailable(existing, newStart, input.durationMin, capacity));
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        branch_id: input.branchId,
        trainer_id: input.trainerId,
        member_id: input.memberId,
        member_name: input.memberName,
        workout_type_id: input.workoutTypeId,
        title: "Bire bir PT",
        starts_at: input.startsAt,
        duration_min: input.durationMin,
        status: "scheduled",
        notes: input.notes,
        created_by: input.createdBy,
      })
      .select()
      .single();
    if (error) {
      if (error.message.toLowerCase().includes("capacity")) {
        throw new SlotFullError(findNearestAvailable(existing, newStart, input.durationMin, capacity));
      }
      throw error;
    }
    return mapSession(data);
  }

  const session: GymSession = {
    id: `s${Date.now()}`,
    branchId: input.branchId,
    trainerId: input.trainerId,
    memberId: input.memberId,
    memberName: input.memberName,
    title: "Bire bir PT",
    workoutTypeId: input.workoutTypeId,
    startsAt: input.startsAt,
    durationMin: input.durationMin,
    status: "scheduled",
    notes: input.notes,
    startedAt: null,
    endedAt: null,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  };
  mockDB.addSession(session);
  return session;
}

function findNearestAvailable(daySessions: GymSession[], fromMs: number, durationMin: number, capacity: number): string | null {
  const durationMs = durationMin * 60_000;
  for (let candidate = fromMs + 30 * 60_000; candidate < fromMs + 8 * 60 * 60_000; candidate += 30 * 60_000) {
    const candidateEnd = candidate + durationMs;
    const count = daySessions.filter((s) => {
      if (s.status === "cancelled") return false;
      const sStart = new Date(s.startsAt).getTime();
      const sEnd = sStart + s.durationMin * 60_000;
      return overlaps(candidate, candidateEnd, sStart, sEnd);
    }).length;
    if (count < capacity) return new Date(candidate).toISOString();
  }
  return null;
}

export function subscribeToSessions(branchId: string, onChange: () => void): () => void {
  if (isSupabaseConfigured && supabase) {
    const client = supabase;
    const channel = client
      .channel(`sessions-${branchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `branch_id=eq.${branchId}` }, onChange)
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }
  return subscribeMockDB(onChange);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface TrainerStats {
  trainerId: string;
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  lastMonth: number;
  byDay: { date: string; count: number }[];
  byWorkoutType: { workoutTypeId: string; count: number }[];
}

export async function getTrainerStats(branchId: string, trainerId: string): Promise<TrainerStats> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const all = await listSessions(branchId, lastMonthStart, new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const done = all.filter((s) => s.trainerId === trainerId && s.status !== "cancelled" && new Date(s.startsAt) <= now);

  const weekStart = startOfWeek(now);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const count = (from: Date, to: Date) => done.filter((s) => new Date(s.startsAt) >= from && new Date(s.startsAt) < to).length;

  const byDay: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    byDay.push({ date: d.toISOString(), count: count(d, next) });
  }

  const byTypeMap = new Map<string, number>();
  for (const s of done.filter((s) => new Date(s.startsAt) >= monthStart)) {
    if (!s.workoutTypeId) continue;
    byTypeMap.set(s.workoutTypeId, (byTypeMap.get(s.workoutTypeId) ?? 0) + 1);
  }

  return {
    trainerId,
    thisWeek: count(weekStart, new Date(weekStart.getTime() + 7 * 86400000)),
    lastWeek: count(lastWeekStart, weekStart),
    thisMonth: count(monthStart, new Date(now.getFullYear(), now.getMonth() + 1, 1)),
    lastMonth: count(lastMonthStart, monthStart),
    byDay,
    byWorkoutType: [...byTypeMap.entries()].map(([workoutTypeId, count]) => ({ workoutTypeId, count })),
  };
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function uploadAvatar(profileId: string, file: File): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${profileId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    const { error: profileError } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", profileId);
    if (profileError) throw profileError;
    return url;
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  mockDB.updateProfileAvatar(profileId, dataUrl);
  return dataUrl;
}
