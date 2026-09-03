import { isSupabaseConfigured, supabase } from "./supabase";
import { mockDB, subscribeMockDB } from "./mockStore";
import { MAX_SESSIONS_PER_SLOT, PT_BADGE_COLORS, type Branch, type GymSession, type Member, type Profile, type Role, type Trainer } from "./types";

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

export async function listBranches(): Promise<Branch[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("branches").select("*").order("name");
    if (error) throw error;
    return data.map((r) => ({ id: r.id, name: r.name, address: r.address, createdAt: r.created_at }));
  }
  return mockDB.get().branches;
}

export async function createBranch(input: { name: string; address: string | null }): Promise<Branch> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("branches").insert({ name: input.name, address: input.address }).select().single();
    if (error) throw error;
    return { id: data.id, name: data.name, address: data.address, createdAt: data.created_at };
  }
  const branch: Branch = { id: `b${Date.now()}`, name: input.name, address: input.address, createdAt: new Date().toISOString() };
  mockDB.addBranch(branch);
  return branch;
}

export async function listTrainers(branchId: string): Promise<Trainer[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("trainers")
      .select("id, branch_id, bio, badge_color, profiles(full_name, phone)")
      .eq("branch_id", branchId);
    if (error) throw error;
    return data.map((r) => {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return {
        id: r.id,
        branchId: r.branch_id,
        role: "trainer" as const,
        fullName: p?.full_name ?? "",
        phone: p?.phone ?? null,
        avatarColor: r.badge_color,
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

export async function listSessions(branchId: string, rangeStart: Date, rangeEnd: Date): Promise<GymSession[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("branch_id", branchId)
      .gte("starts_at", rangeStart.toISOString())
      .lt("starts_at", rangeEnd.toISOString());
    if (error) throw error;
    return data.map((r) => ({
      id: r.id,
      branchId: r.branch_id,
      trainerId: r.trainer_id,
      memberId: r.member_id,
      memberName: r.member_name ?? null,
      title: r.title,
      startsAt: r.starts_at,
      durationMin: r.duration_min,
      status: r.status,
      notes: r.notes ?? null,
      createdBy: r.created_by,
      createdAt: r.created_at,
    }));
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

export async function createSession(input: CreateSessionInput): Promise<GymSession> {
  const dayStart = new Date(input.startsAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const existing = await listSessions(input.branchId, dayStart, dayEnd);
  const newStart = new Date(input.startsAt).getTime();
  const newEnd = newStart + input.durationMin * 60_000;

  const overlapping = existing.filter((s) => {
    if (s.status === "cancelled") return false;
    const sStart = new Date(s.startsAt).getTime();
    const sEnd = sStart + s.durationMin * 60_000;
    return overlaps(newStart, newEnd, sStart, sEnd);
  });

  if (overlapping.length >= MAX_SESSIONS_PER_SLOT) {
    throw new SlotFullError(findNearestAvailable(existing, newStart, input.durationMin));
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        branch_id: input.branchId,
        trainer_id: input.trainerId,
        member_id: input.memberId,
        member_name: input.memberName,
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
        throw new SlotFullError(findNearestAvailable(existing, newStart, input.durationMin));
      }
      throw error;
    }
    return {
      id: data.id,
      branchId: data.branch_id,
      trainerId: data.trainer_id,
      memberId: data.member_id,
      memberName: data.member_name,
      title: data.title,
      startsAt: data.starts_at,
      durationMin: data.duration_min,
      status: data.status,
      notes: data.notes ?? null,
      createdBy: data.created_by,
      createdAt: data.created_at,
    };
  }

  const session: GymSession = {
    id: `s${Date.now()}`,
    branchId: input.branchId,
    trainerId: input.trainerId,
    memberId: input.memberId,
    memberName: input.memberName,
    title: "Bire bir PT",
    startsAt: input.startsAt,
    durationMin: input.durationMin,
    status: "scheduled",
    notes: input.notes,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  };
  mockDB.addSession(session);
  return session;
}

function findNearestAvailable(daySessions: GymSession[], fromMs: number, durationMin: number): string | null {
  const durationMs = durationMin * 60_000;
  for (let candidate = fromMs + 30 * 60_000; candidate < fromMs + 8 * 60 * 60_000; candidate += 30 * 60_000) {
    const candidateEnd = candidate + durationMs;
    const count = daySessions.filter((s) => {
      if (s.status === "cancelled") return false;
      const sStart = new Date(s.startsAt).getTime();
      const sEnd = sStart + s.durationMin * 60_000;
      return overlaps(candidate, candidateEnd, sStart, sEnd);
    }).length;
    if (count < MAX_SESSIONS_PER_SLOT) return new Date(candidate).toISOString();
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

export interface TrainerStats {
  trainerId: string;
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  lastMonth: number;
  byDay: { date: string; count: number }[];
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

  return {
    trainerId,
    thisWeek: count(weekStart, new Date(weekStart.getTime() + 7 * 86400000)),
    lastWeek: count(lastWeekStart, weekStart),
    thisMonth: count(monthStart, new Date(now.getFullYear(), now.getMonth() + 1, 1)),
    lastMonth: count(lastMonthStart, monthStart),
    byDay,
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
