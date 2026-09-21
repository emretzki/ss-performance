import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Barbell } from "@phosphor-icons/react";
import { findOrganizationSlugByEmail } from "@/lib/api";
import { tenantUrl } from "@/lib/tenant";
import { Button } from "@/components/ui/Button";

export function LandingScreen() {
  const [mode, setMode] = useState<"pitch" | "find">("pitch");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFind(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const slug = await findOrganizationSlugByEmail(email.trim());
      if (!slug) {
        setError("Bu e-postayla ilişkili bir salon bulamadık. Adresi kontrol et veya yeni bir salon oluştur.");
        return;
      }
      window.location.href = tenantUrl(slug);
    } catch {
      setError("Bir şeyler ters gitti, tekrar dene.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--color-paper)] px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-ink)] text-[var(--color-paper)]">
          <Barbell size={28} weight="fill" />
        </span>

        <div className="text-center">
          <h1 className="font-display text-[28px] font-bold leading-none text-[var(--color-ink)]">gymkoc</h1>
          <p className="mt-2 text-[14px] text-[var(--color-ash)]">
            Spor salonların için takvim, PT ve ders yönetimi — kendi markanla, kendi adresinde.
          </p>
        </div>

        {mode === "pitch" ? (
          <div className="flex w-full flex-col gap-3">
            <Link to="/signup">
              <Button size="lg" className="w-full">
                Salonunu oluştur
              </Button>
            </Link>
            <Button variant="secondary" size="lg" onClick={() => setMode("find")}>
              Salonuna giriş yap
            </Button>
          </div>
        ) : (
          <form onSubmit={handleFind} className="flex w-full flex-col gap-3">
            <p className="text-[13px] text-[var(--color-ash)]">
              Salonunun adresini (salonadi.gymkoc.com) hatırlamıyorsan, hesabına kayıtlı e-postayı gir, seni oraya yönlendirelim.
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e-posta@ornek.com"
              className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] focus:border-[var(--color-gold)]"
            />
            {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Aranıyor..." : "Salonumu bul"}
            </Button>
            <button type="button" onClick={() => setMode("pitch")} className="text-center text-[13px] font-medium text-[var(--color-ink-soft)]">
              Vazgeç
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
