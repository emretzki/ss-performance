import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { mockDB } from "@/lib/mockStore";
import { Button } from "@/components/ui/Button";
import logo from "@/assets/logo.webp";

export function LoginScreen() {
  const { profile, signInMock, authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (profile) return <Navigate to="/calendar" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured || !supabase) return;
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) setError("Giriş yapılamadı. E-posta veya şifre hatalı.");
  }

  const demoProfiles = mockDB.get().profiles;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--color-paper)] px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <img src={logo} alt="SportScience" className="h-24 w-24 object-contain" />

        <div className="text-center">
          <h1 className="font-display text-[26px] font-bold leading-none text-[var(--color-ink)]">SportScience</h1>
          <p className="mt-1.5 text-[13px] text-[var(--color-ash)]">Performance &amp; Coaching · Yönetim Paneli</p>
        </div>

        {isSupabaseConfigured ? (
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">E-posta</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] focus:border-[var(--color-gold)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Şifre</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] focus:border-[var(--color-gold)]"
              />
            </div>
            {(error || authError) && <p className="text-[13px] text-[var(--color-danger)]">{error ?? authError}</p>}
            <Button type="submit" size="lg" disabled={loading} className="mt-2">
              {loading ? "Giriş yapılıyor..." : "Giriş yap"}
            </Button>
          </form>
        ) : (
          <div className="flex w-full flex-col gap-3">
            <p className="text-center text-[13px] text-[var(--color-ash)]">
              Supabase henüz bağlı değil. Aşağıdaki demo hesaplardan biriyle devam edebilirsin.
            </p>
            <div className="flex flex-col gap-2">
              {demoProfiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => signInMock(p.id)}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] px-3.5 py-3 text-left transition-colors duration-100 hover:border-[var(--color-gold)]"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.avatarColor }} />
                  <span className="flex-1">
                    <span className="block text-[14px] font-medium text-[var(--color-ink)]">{p.fullName}</span>
                    <span className="block text-[12px] text-[var(--color-ash)]">
                      {p.role === "super_admin" ? "Süper admin" : p.role === "owner" ? "Şube sahibi" : "PT"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
