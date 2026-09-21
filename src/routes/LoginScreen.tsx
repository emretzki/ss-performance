import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Barbell } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { mockDB } from "@/lib/mockStore";
import { Button } from "@/components/ui/Button";

export function LoginScreen() {
  const { profile, signInMock, authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot" | "forgot-sent">("login");
  const [resetSending, setResetSending] = useState(false);

  if (profile) return <Navigate to="/calendar" replace />;

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase) return;
    setResetSending(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetSending(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMode("forgot-sent");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured || !supabase) return;
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      if (authError.message.toLowerCase().includes("invalid login credentials")) {
        setError("Giriş yapılamadı. E-posta veya şifre hatalı.");
      } else if (authError.message.toLowerCase().includes("email not confirmed")) {
        setError("Bu e-posta henüz onaylanmamış. Supabase Dashboard → Authentication → Users'ta hesabı 'Confirm email' ile onayla.");
      } else {
        setError(`Giriş yapılamadı: ${authError.message}`);
      }
    }
  }

  const demoProfiles = mockDB.get().profiles;
  const demoOrgs = mockDB.get().organizations;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--color-paper)] px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-ink)] text-[var(--color-paper)]">
          <Barbell size={28} weight="fill" />
        </span>

        <div className="text-center">
          <h1 className="font-display text-[26px] font-bold leading-none text-[var(--color-ink)]">Salon Yönetim Paneli</h1>
          <p className="mt-1.5 text-[13px] text-[var(--color-ash)]">Şubeni, ekibini ve dersleri tek yerden yönet.</p>
        </div>

        {isSupabaseConfigured && mode === "forgot-sent" ? (
          <div className="flex w-full flex-col items-center gap-4 text-center">
            <p className="text-[14px] text-[var(--color-ink)]">
              <span className="font-medium">{email}</span> adresine bir sıfırlama bağlantısı gönderdik. Gelen kutunu (ve spam klasörünü) kontrol et.
            </p>
            <button onClick={() => setMode("login")} className="text-[13px] font-medium text-[var(--color-gold-deep)] underline underline-offset-4">
              Girişe dön
            </button>
          </div>
        ) : isSupabaseConfigured && mode === "forgot" ? (
          <form onSubmit={handleForgotSubmit} className="flex w-full flex-col gap-3">
            <p className="text-[13px] text-[var(--color-ash)]">E-postanı gir, şifreni sıfırlaman için bir bağlantı gönderelim.</p>
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
            {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}
            <Button type="submit" size="lg" disabled={resetSending} className="mt-2">
              {resetSending ? "Gönderiliyor..." : "Sıfırlama bağlantısı gönder"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className="text-[13px] font-medium text-[var(--color-ink-soft)]"
            >
              Vazgeç
            </button>
          </form>
        ) : isSupabaseConfigured ? (
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
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[13px] font-medium text-[var(--color-ink-soft)]">Şifre</label>
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setError(null);
                  }}
                  className="text-[12px] font-medium text-[var(--color-gold-deep)]"
                >
                  Şifremi unuttum
                </button>
              </div>
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
            <Link to="/signup" className="text-center text-[13px] font-medium text-[var(--color-ink-soft)]">
              Yeni salon oluştur
            </Link>
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
                      {p.role === "super_admin" ? "Süper admin" : p.role === "owner" ? "Şube sahibi" : "PT"} ·{" "}
                      {demoOrgs.find((o) => o.id === p.organizationId)?.name}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <Link to="/signup" className="text-center text-[13px] font-medium text-[var(--color-ink-soft)]">
              Yeni salon oluştur (mock)
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
