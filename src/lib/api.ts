import { isSupabaseConfigured, supabase } from "./supabase";
import { mockDB, subscribeMockDB } from "./mockStore";
import { slugify, tenantHandoffUrl } from "./tenant";
import {
  DEFAULT_MAX_SESSIONS_PER_SLOT,
  LIVE_SESSION_AUTO_END_MIN,
  PT_BADGE_COLORS,
  type Branch,
  type BranchExpense,
  type GymSession,
  type Member,
  type Organization,
  type Payment,
  type Profile,
  type PublicOrgBranding,
  type Role,
  type SessionStatus,
  type Trainer,
  type WorkoutType,
} from "./types";

// supabase-js throws a generic "Edge Function returned a non-2xx status
// code" for any function-level error response, discarding the JSON body the
// function actually sent back. Read the real { error: "..." } message from
// the underlying Response so the user sees why it failed, not just that it did.
async function edgeFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: Response } | null)?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (body && typeof body.error === "string") return body.error;
    } catch {
      // response wasn't JSON; fall through to the generic message below
    }
  }
  return error instanceof Error ? error.message : fallback;
}

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
export async function getOrganizationBySlug(slug: string): Promise<PublicOrgBranding | null> {
  if (isSupabaseConfigured && supabase) {
    // Pre-login, so only what public_organization_branding() exposes: no
    // owner_auth_id, no created_at, nothing beyond what a login screen needs
    // to show a tenant's own logo/name/color before anyone signs in.
    const { data, error } = await supabase.rpc("public_organization_branding", { org_slug: slug });
    if (error) throw error;
    const row = data?.[0];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logo_url,
      accentColor: row.accent_color,
    };
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
    if (error) throw new Error(await edgeFunctionErrorMessage(error, "Salon oluşturulamadı."));
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

function mapTrainerRow(r: {
  id: string;
  branch_id: string;
  bio: string | null;
  badge_color: string;
  commission_rate: number;
  profiles: { organization_id: string; full_name: string; phone: string | null; avatar_url: string | null; role: string } | { organization_id: string; full_name: string; phone: string | null; avatar_url: string | null; role: string }[] | null;
}): Trainer {
  const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
  return {
    id: r.id,
    organizationId: p?.organization_id ?? "",
    branchId: r.branch_id,
    role: (p?.role ?? "trainer") as Role,
    fullName: p?.full_name ?? "",
    phone: p?.phone ?? null,
    avatarColor: r.badge_color,
    avatarUrl: p?.avatar_url ?? null,
    badgeColor: r.badge_color,
    bio: r.bio,
    commissionRate: r.commission_rate,
  };
}

export async function listTrainers(branchId: string): Promise<Trainer[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("trainers")
      .select("id, branch_id, bio, badge_color, commission_rate, profiles(organization_id, full_name, phone, avatar_url, role)")
      .eq("branch_id", branchId);
    if (error) throw error;
    return data.map(mapTrainerRow);
  }
  return mockDB.get().trainers.filter((t) => t.branchId === branchId);
}

/** Every trainer across every branch in the org — used for the "Tüm
 * şubeler" (whole-company) report view. Owner/super_admin only; RLS blocks
 * a trainer's own JWT from reading other branches' trainers regardless. */
export async function listTrainersForOrg(organizationId: string): Promise<Trainer[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("trainers")
      .select("id, branch_id, bio, badge_color, commission_rate, profiles!inner(organization_id, full_name, phone, avatar_url, role)")
      .eq("profiles.organization_id", organizationId);
    if (error) throw error;
    return data.map(mapTrainerRow);
  }
  return mockDB.get().trainers.filter((t) => t.organizationId === organizationId);
}

export async function updateTrainerCommissionRate(trainerId: string, commissionRate: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("trainers").update({ commission_rate: commissionRate }).eq("id", trainerId);
    if (error) throw error;
    return;
  }
  mockDB.updateTrainerCommission(trainerId, commissionRate);
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
    if (error) throw new Error(await edgeFunctionErrorMessage(error, "Kişi oluşturulamadı."));
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
      ? { ...profile, role: "trainer", branchId: input.branchId, bio: null, badgeColor: profile.avatarColor, commissionRate: 50 }
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

function mapMember(r: Record<string, unknown>): Member {
  return {
    id: r.id as string,
    branchId: r.branch_id as string,
    fullName: r.full_name as string,
    phone: r.phone as string | null,
    notes: r.notes as string | null,
    createdAt: r.created_at as string,
    packageName: (r.package_name as string | null) ?? null,
    packageTotalPrice: (r.package_total_price as number | null) ?? null,
    packageTotalSessions: (r.package_total_sessions as number | null) ?? null,
    packageSessionsUsed: (r.package_sessions_used as number | undefined) ?? 0,
    packagePaidAt: (r.package_paid_at as string | null) ?? null,
  };
}

export async function listMembers(branchId: string): Promise<Member[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("members").select("*").eq("branch_id", branchId).order("full_name");
    if (error) throw error;
    return data.map(mapMember);
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
    return mapMember(data);
  }
  const member: Member = {
    id: `m${Date.now()}`,
    branchId: input.branchId,
    fullName: input.fullName,
    phone: input.phone,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    packageName: null,
    packageTotalPrice: null,
    packageTotalSessions: null,
    packageSessionsUsed: 0,
    packagePaidAt: null,
  };
  mockDB.addMember(member);
  return member;
}

export interface UpdateMemberInput {
  fullName?: string;
  phone?: string | null;
  notes?: string | null;
  /** Reassigns which branch this member belongs to — only relevant for a
   * multi-branch org, and only owner/super_admin can change it (RLS-enforced). */
  branchId?: string;
  /** Plain corrections to the current package's own fields — a typo fix, not
   * a new purchase. Never touches the payments ledger or the usage counter;
   * use addMemberPackage for an actual new, renewed, or queued package. */
  packageName?: string | null;
  packageTotalPrice?: number | null;
  packageTotalSessions?: number | null;
}

export async function updateMember(id: string, input: UpdateMemberInput): Promise<Member> {
  if (isSupabaseConfigured && supabase) {
    const patch: Record<string, unknown> = {};
    if (input.fullName !== undefined) patch.full_name = input.fullName;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.branchId !== undefined) patch.branch_id = input.branchId;
    if (input.packageName !== undefined) patch.package_name = input.packageName;
    if (input.packageTotalPrice !== undefined) patch.package_total_price = input.packageTotalPrice;
    if (input.packageTotalSessions !== undefined) patch.package_total_sessions = input.packageTotalSessions;
    const { data, error } = await supabase.from("members").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return mapMember(data);
  }
  mockDB.updateMember(id, {
    ...(input.fullName !== undefined && { fullName: input.fullName }),
    ...(input.phone !== undefined && { phone: input.phone }),
    ...(input.branchId !== undefined && { branchId: input.branchId }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.packageName !== undefined && { packageName: input.packageName }),
    ...(input.packageTotalPrice !== undefined && { packageTotalPrice: input.packageTotalPrice }),
    ...(input.packageTotalSessions !== undefined && { packageTotalSessions: input.packageTotalSessions }),
  });
  const updated = mockDB.get().members.find((m) => m.id === id);
  if (!updated) throw new Error("Üye bulunamadı.");
  return updated;
}

// ---------------------------------------------------------------------------
// Payments & branch expenses (revenue reporting)
// ---------------------------------------------------------------------------

function mapPayment(r: Record<string, unknown>): Payment {
  return {
    id: r.id as string,
    memberId: r.member_id as string,
    branchId: r.branch_id as string,
    amount: r.amount as number,
    packageName: (r.package_name as string | null) ?? null,
    totalSessions: (r.total_sessions as number | null) ?? null,
    paidAt: r.paid_at as string,
    createdAt: r.created_at as string,
    status: r.status as Payment["status"],
    sessionsUsed: (r.sessions_used as number | null) ?? null,
  };
}

// Cash-basis ciro: every payment counts toward the month it was paid in,
// regardless of lifecycle status — a package paid for in advance still
// counts as revenue now, even though it won't become "active" until later.
export async function listPayments(branchId: string, from: Date, to: Date): Promise<Payment[]> {
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("branch_id", branchId)
      .gte("paid_at", fromStr)
      .lt("paid_at", toStr);
    if (error) throw error;
    return data.map(mapPayment);
  }
  return mockDB.get().payments.filter((p) => p.branchId === branchId && p.paidAt >= fromStr && p.paidAt < toStr);
}

/** A member's full package history — the currently active package, any
 * queued upcoming ones, and archived completed ones — newest paid_at first. */
export async function listMemberPackageHistory(memberId: string): Promise<Payment[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("member_id", memberId)
      .order("paid_at", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data.map(mapPayment);
  }
  return [...mockDB.get().payments]
    .filter((p) => p.memberId === memberId)
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt) || b.createdAt.localeCompare(a.createdAt));
}

export interface AddMemberPackageInput {
  memberId: string;
  branchId: string;
  name: string;
  totalPrice: number;
  totalSessions: number;
  paidAt: string;
  /** true: starts immediately, archiving whatever package is currently
   * active. false: queued as "upcoming" — paid for now, doesn't touch the
   * member's active package until it naturally runs out. */
  startNow: boolean;
}

/** The one way to give a member a new package — first-ever, a renewal, or a
 * paid-in-advance one queued for later. Never call updateMember for this:
 * that's for correcting an existing package's own fields, not purchasing a
 * new one. */
export async function addMemberPackage(input: AddMemberPackageInput): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    if (input.startNow) {
      const { data: memberRow, error: fetchErr } = await supabase
        .from("members")
        .select("package_sessions_used")
        .eq("id", input.memberId)
        .single();
      if (fetchErr) throw fetchErr;
      const { error: archiveErr } = await supabase
        .from("payments")
        .update({ status: "completed", sessions_used: memberRow.package_sessions_used })
        .eq("member_id", input.memberId)
        .eq("status", "active");
      if (archiveErr) throw archiveErr;
      const { error: memberErr } = await supabase
        .from("members")
        .update({
          package_name: input.name,
          package_total_price: input.totalPrice,
          package_total_sessions: input.totalSessions,
          package_sessions_used: 0,
          package_paid_at: input.paidAt,
        })
        .eq("id", input.memberId);
      if (memberErr) throw memberErr;
    }
    const { error: insertErr } = await supabase.from("payments").insert({
      member_id: input.memberId,
      branch_id: input.branchId,
      amount: input.totalPrice,
      package_name: input.name,
      total_sessions: input.totalSessions,
      paid_at: input.paidAt,
      status: input.startNow ? "active" : "upcoming",
    });
    if (insertErr) throw insertErr;
    return;
  }

  const payment: Payment = {
    id: `pay${Date.now()}`,
    memberId: input.memberId,
    branchId: input.branchId,
    amount: input.totalPrice,
    packageName: input.name,
    totalSessions: input.totalSessions,
    paidAt: input.paidAt,
    createdAt: new Date().toISOString(),
    status: input.startNow ? "active" : "upcoming",
    sessionsUsed: null,
  };
  if (input.startNow) mockDB.startPackageNow(input.memberId, payment);
  else mockDB.queuePackage(payment);
}

/** Cancels a package that was paid for in advance but hasn't started yet.
 * Only meaningful for "upcoming" rows — an active or completed one is real
 * history and isn't deletable from here. */
export async function deleteUpcomingPackage(paymentId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("payments").delete().eq("id", paymentId).eq("status", "upcoming");
    if (error) throw error;
    return;
  }
  mockDB.deletePayment(paymentId);
}

function mapBranchExpense(r: Record<string, unknown>): BranchExpense {
  return { id: r.id as string, branchId: r.branch_id as string, name: r.name as string, amount: r.amount as number, createdAt: r.created_at as string };
}

export async function listBranchExpenses(branchId: string): Promise<BranchExpense[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("branch_expenses").select("*").eq("branch_id", branchId).order("created_at");
    if (error) throw error;
    return data.map(mapBranchExpense);
  }
  return mockDB.get().branchExpenses.filter((e) => e.branchId === branchId);
}

export async function createBranchExpense(input: { branchId: string; name: string; amount: number }): Promise<BranchExpense> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("branch_expenses")
      .insert({ branch_id: input.branchId, name: input.name, amount: input.amount })
      .select()
      .single();
    if (error) throw error;
    return mapBranchExpense(data);
  }
  const expense: BranchExpense = { id: `exp${Date.now()}`, branchId: input.branchId, name: input.name, amount: input.amount, createdAt: new Date().toISOString() };
  mockDB.addBranchExpense(expense);
  return expense;
}

export async function deleteBranchExpense(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("branch_expenses").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  mockDB.deleteBranchExpense(id);
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

// A şube sahibi (owner) who also personally coaches has no `trainers` row by
// default — only accounts created with role "trainer" get one. sessions.trainer_id
// is a foreign key into trainers, not profiles, so logging a session under
// their own name would otherwise fail outright. Create that row lazily, the
// first time they actually try to log a session themselves, instead of
// requiring a separate setup step.
async function ensureTrainerRecordExists(trainerId: string, branchId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data: existing } = await supabase.from("trainers").select("id").eq("id", trainerId).maybeSingle();
    if (existing) return;
    const { error } = await supabase.from("trainers").insert({ id: trainerId, branch_id: branchId, badge_color: randomBadgeColor() });
    if (error) throw error;
    return;
  }
  const db = mockDB.get();
  if (db.trainers.some((t) => t.id === trainerId)) return;
  const p = db.profiles.find((pr) => pr.id === trainerId);
  if (!p) return;
  const badgeColor = randomBadgeColor();
  mockDB.upsertPerson(p, {
    id: p.id,
    organizationId: p.organizationId,
    branchId,
    // The real profile role (owner or trainer) — a self-logging owner's
    // sessions must stay identifiable as commission-exempt in revenue math.
    role: p.role,
    fullName: p.fullName,
    phone: p.phone,
    avatarColor: badgeColor,
    avatarUrl: p.avatarUrl,
    bio: null,
    badgeColor,
    commissionRate: 50,
  });
}

export async function createSession(input: CreateSessionInput): Promise<GymSession> {
  await ensureTrainerRecordExists(input.trainerId, input.branchId);

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

export interface RevenueSummary {
  /** Ciro: cash-basis, sum of payments whose paid_at falls in [from, to) —
   * fees are collected in bulk up front, so a package counts toward the
   * month it was PAID for, never the months its sessions happen to land in
   * (even if they spill past the end of that month). */
  totalRevenue: number;
  /** Standing monthly costs (kira, vb.) entered in Ayarlar. */
  totalExpenses: number;
  /** Ciro − PT primi − Giderler. */
  ownerProfit: number;
  /** Session-basis, on purpose, unlike ciro: a PT is paid for the lessons
   * they actually gave this window, sum of each realized session's
   * unitPrice * commissionRate. A branch owner's own sessions are exempt
   * (0% — no commission is paid out on them at all). */
  commissionPayable: number;
  byTrainer: { trainerId: string; sessionValue: number; commission: number }[];
}

function computeRevenue(
  sessions: GymSession[],
  members: Member[],
  trainers: Trainer[],
  payments: Payment[],
  expenses: BranchExpense[],
): RevenueSummary {
  const now = new Date();
  const memberById = new Map(members.map((m) => [m.id, m]));
  const trainerById = new Map(trainers.map((t) => [t.id, t]));

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  let commissionPayable = 0;
  const byTrainerMap = new Map<string, { sessionValue: number; commission: number }>();

  for (const s of sessions) {
    if (s.status === "cancelled" || new Date(s.startsAt) > now) continue;
    const member = s.memberId ? memberById.get(s.memberId) : undefined;
    if (!member?.packageTotalPrice || !member.packageTotalSessions) continue;

    const trainer = trainerById.get(s.trainerId);
    if (trainer?.role === "owner" || trainer?.role === "super_admin") continue; // no commission, ever

    const unitPrice = member.packageTotalPrice / member.packageTotalSessions;
    const rate = trainer?.commissionRate ?? 50;
    const commission = unitPrice * (rate / 100);
    commissionPayable += commission;
    const entry = byTrainerMap.get(s.trainerId) ?? { sessionValue: 0, commission: 0 };
    entry.sessionValue += unitPrice;
    entry.commission += commission;
    byTrainerMap.set(s.trainerId, entry);
  }

  return {
    totalRevenue,
    totalExpenses,
    ownerProfit: totalRevenue - commissionPayable - totalExpenses,
    commissionPayable,
    byTrainer: [...byTrainerMap.entries()].map(([trainerId, v]) => ({ trainerId, ...v })),
  };
}

/** Revenue/profit for a branch in [from, to). Ciro comes from the payments
 * ledger (cash-basis); commission still comes from sessions + members +
 * trainers (session-basis) exactly as before — the two halves of this report
 * deliberately use different bases, per how the business is actually run. */
export async function getBranchRevenue(branchId: string, from: Date, to: Date): Promise<RevenueSummary> {
  const [sessions, members, trainers, payments, expenses] = await Promise.all([
    listSessions(branchId, from, to),
    listMembers(branchId),
    listTrainers(branchId),
    listPayments(branchId, from, to),
    listBranchExpenses(branchId),
  ]);
  return computeRevenue(sessions, members, trainers, payments, expenses);
}

/** Same as getBranchRevenue, but combined across every branch in the org —
 * the "Tüm şubeler" whole-company report view. Trainer ids are globally
 * unique (a trainer belongs to exactly one branch), so summing byTrainer
 * across branches never double-counts. */
export async function getOrgRevenue(branchIds: string[], from: Date, to: Date): Promise<RevenueSummary> {
  const perBranch = await Promise.all(
    branchIds.map((branchId) =>
      Promise.all([
        listSessions(branchId, from, to),
        listMembers(branchId),
        listTrainers(branchId),
        listPayments(branchId, from, to),
        listBranchExpenses(branchId),
      ]),
    ),
  );
  return computeRevenue(
    perBranch.flatMap((x) => x[0]),
    perBranch.flatMap((x) => x[1]),
    perBranch.flatMap((x) => x[2]),
    perBranch.flatMap((x) => x[3]),
    perBranch.flatMap((x) => x[4]),
  );
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
    // update_own_avatar_url, not a direct table write: profiles_write only lets
    // owner/super_admin write profiles, so a trainer uploading their own photo
    // would otherwise fail RLS outright.
    const { error: profileError } = await supabase.rpc("update_own_avatar_url", { new_avatar_url: url });
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

export async function updateOwnProfile(profileId: string, fullName: string, phone: string | null): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.rpc("update_own_profile", { new_full_name: fullName, new_phone: phone });
    if (error) throw error;
    return;
  }
  const patch: Partial<Pick<Profile, "fullName" | "phone">> = { phone: phone?.trim() || null };
  if (fullName.trim()) patch.fullName = fullName.trim();
  mockDB.updateProfileFields(profileId, patch);
}

export async function updateOwnPassword(newPassword: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return;
  }
  // No real auth in mock mode — nothing to update against.
}

export async function updateOwnEmail(newEmail: string): Promise<void> {
  if (!(isSupabaseConfigured && supabase)) {
    throw new Error("E-posta değişikliği yalnızca gerçek hesaplarda desteklenir.");
  }
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;
}
