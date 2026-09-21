import { useState, type FormEvent } from "react";
import { Barbell } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

export function ResetPasswordScreen() {
  const { clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase!.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--color-paper)] px-6 py-10 text-center">
        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-ink)] text-[var(--color-paper)]"><Barbell size={26} weight="fill" /></span>
          <h1 className="font-display text-[22px] font-bold text-[var(--color-ink)]">Şifre güncellendi</h1>
          <p className="text-[13px] text-[var(--color-ash)]">Artık yeni şifrenle giriş yapabilirsin.</p>
          <Button size="lg" onClick={() => clearPasswordRecovery()} className="mt-2 w-full">
            Girişe dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--color-paper)] px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-ink)] text-[var(--color-paper)]"><Barbell size={26} weight="fill" /></span>
        <div className="text-center">
          <h1 className="font-display text-[22px] font-bold leading-none text-[var(--color-ink)]">Yeni şifre belirle</h1>
          <p className="mt-1.5 text-[13px] text-[var(--color-ash)]">Bu hesap için yeni bir şifre gir.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Yeni şifre</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] focus:border-[var(--color-gold)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Yeni şifre (tekrar)</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] focus:border-[var(--color-gold)]"
            />
          </div>
          {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}
          <Button type="submit" size="lg" disabled={saving} className="mt-2">
            {saving ? "Kaydediliyor..." : "Şifreyi kaydet"}
          </Button>
        </form>
      </div>
    </div>
  );
}
