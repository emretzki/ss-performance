import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  owner_email: string;
  branch_count: number;
  trainer_count: number;
  session_count: number;
  session_count_this_month: number;
  last_session_at: string | null;
}

type Phase = "checking" | "login" | "unauthorized" | "ready";

const inputClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] focus:border-[var(--color-gold)]";

export function AdminScreen() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);

  async function loadDashboard() {
    if (!supabase) return;
    // Checked as its own explicit step rather than inferred from the list
    // RPC's result: that RPC never errors for a non-admin caller, it just
    // returns zero rows (by design) — indistinguishable in JS from a real
    // admin whose org list happens to be empty (an empty array is truthy).
    // Without this check, the wrong account logging in saw a "ready"
    // dashboard with everything at 0 instead of a clear access-denied screen.
    const { data: isAdmin, error: adminError } = await supabase.rpc("is_platform_admin");
    if (adminError || !isAdmin) {
      setPhase("unauthorized");
      return;
    }
    const { data, error } = await supabase.rpc("platform_admin_list_organizations");
    if (error || !data) {
      setPhase("unauthorized");
      return;
    }
    setOrgs(data as OrgRow[]);
    setPhase("ready");
  }

  async function checkAccess() {
    if (!isSupabaseConfigured || !supabase) {
      setPhase("unauthorized");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPhase("login");
      return;
    }
    await loadDashboard();
  }

  useEffect(() => {
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoginError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setLoginError(error.message === "Invalid login credentials" ? "E-posta veya şifre hatalı." : error.message);
        return;
      }
      await loadDashboard();
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase?.auth.signOut();
    setEmail("");
    setPassword("");
    setPhase("login");
  }

  if (phase === "checking") return null;

  if (phase === "login") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--color-paper)] px-6 py-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="text-center">
            <h1 className="font-display text-[24px] font-bold text-[var(--color-ink)]">Platform admin</h1>
            <p className="mt-1 text-[13px] text-[var(--color-ash)]">Yalnızca yetkili hesaplar girebilir.</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">E-posta</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Şifre</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </div>
            {loginError && <p className="text-[13px] text-[var(--color-danger)]">{loginError}</p>}
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Giriş yapılıyor..." : "Giriş yap"}
            </Button>
          </form>
          <Link to="/" className="text-center text-[13px] font-medium text-[var(--color-ink-soft)]">
            gymkoc.com'a dön
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "unauthorized") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-[var(--color-paper)] px-6 text-center">
        <p className="font-display text-[20px] font-bold text-[var(--color-ink)]">Bu hesabın admin yetkisi yok</p>
        <p className="max-w-[36ch] text-[13px] text-[var(--color-ash)]">Bu panele yalnızca platform admin olarak işaretlenmiş hesaplar erişebilir.</p>
        <button onClick={handleSignOut} className="text-[13px] font-medium text-[var(--color-gold-deep)] underline underline-offset-4">
          Çıkış yap ve tekrar dene
        </button>
      </div>
    );
  }

  const totals = orgs.reduce(
    (acc, o) => ({
      branches: acc.branches + o.branch_count,
      trainers: acc.trainers + o.trainer_count,
      sessions: acc.sessions + o.session_count,
      sessionsThisMonth: acc.sessionsThisMonth + o.session_count_this_month,
    }),
    { branches: 0, trainers: 0, sessions: 0, sessionsThisMonth: 0 },
  );

  return (
    <div className="min-h-[100dvh] bg-[var(--color-paper)] px-4 py-8 text-[var(--color-ink)] lg:px-8">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-[26px] font-bold leading-none">Platform genel bakış</h1>
            <p className="mt-1.5 text-[13px] text-[var(--color-ash)]">Tüm salonlar, tek ekrandan.</p>
          </div>
          <button onClick={handleSignOut} className="text-[13px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
            Çıkış yap
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Toplam salon" value={orgs.length} />
          <StatCard label="Toplam şube" value={totals.branches} />
          <StatCard label="Toplam PT" value={totals.trainers} />
          <StatCard label="Bu ay girilen ders" value={totals.sessionsThisMonth} />
        </div>

        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-line)]">
          <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-[12px] font-medium text-[var(--color-ash)]">
                <th className="px-4 py-3">Salon</th>
                <th className="px-4 py-3">Sahip</th>
                <th className="px-4 py-3">Oluşturulma</th>
                <th className="px-4 py-3 text-right">Şube</th>
                <th className="px-4 py-3 text-right">PT</th>
                <th className="px-4 py-3 text-right">Ders (toplam)</th>
                <th className="px-4 py-3 text-right">Ders (bu ay)</th>
                <th className="px-4 py-3">Son aktivite</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} className="border-b border-[var(--color-line)] last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--color-ink)]">{o.name}</p>
                    <p className="text-[11px] text-[var(--color-ash)]">{o.slug}.gymkoc.com</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-soft)]">{o.owner_email}</td>
                  <td className="px-4 py-3 tabular-nums text-[var(--color-ink-soft)]">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{o.branch_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{o.trainer_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{o.session_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-[var(--color-gold)]">{o.session_count_this_month}</td>
                  <td className="px-4 py-3 tabular-nums text-[var(--color-ink-soft)]">{o.last_session_at ? formatDate(o.last_session_at) : "—"}</td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-ash)]">
                    Henüz salon yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <p className="text-[12px] font-medium text-[var(--color-ash)]">{label}</p>
      <p className="font-display text-[28px] font-bold leading-none tabular-nums text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}
