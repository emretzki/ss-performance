import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { createOrganization } from "@/lib/api";
import { tenantUrl } from "@/lib/tenant";
import { Button } from "@/components/ui/Button";

const inputClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] focus:border-[var(--color-gold)]";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SignupScreen() {
  const { profile, signInMock } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [orgName, setOrgName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accentColor, setAccentColor] = useState("#96792C");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (profile) return <Navigate to="/calendar" replace />;

  function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      let logoBase64: string | null = null;
      let logoContentType: string | null = null;
      if (logoFile) {
        logoBase64 = await fileToBase64(logoFile);
        logoContentType = logoFile.type;
      }

      const { userId, slug } = await createOrganization({
        email,
        password,
        fullName,
        orgName,
        logoBase64,
        logoContentType,
        accentColor,
        branchAddress: null,
      });

      if (isSupabaseConfigured && supabase) {
        // Subdomains are separate origins, so there's no session to carry
        // over — send them to their new tenant's own login page.
        window.location.href = tenantUrl(slug);
        return;
      }
      signInMock(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salon oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--color-paper)] px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="font-display text-[26px] font-bold leading-none text-[var(--color-ink)]">Yeni salon oluştur</h1>
          <p className="mt-1.5 text-[13px] text-[var(--color-ash)]">Kendi markanla, kendi yönetim panelin.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[12px] text-[var(--color-ash)]"
          >
            {logoPreview ? <img src={logoPreview} alt="" className="h-full w-full object-cover" /> : "Logo ekle"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Salon adı</label>
            <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} className={inputClass} placeholder="Fitness Farm" />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Marka rengi</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)]"
              />
              <span className="text-[13px] text-[var(--color-ash)]">{accentColor}</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Ad Soyad (sen)</label>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">E-posta</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Şifre</label>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </div>

          {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}

          <Button type="submit" size="lg" disabled={saving} className="mt-2">
            {saving ? "Oluşturuluyor..." : "Salonu oluştur"}
          </Button>

          <a href="/" className="text-center text-[13px] font-medium text-[var(--color-ink-soft)]">
            Zaten bir salonun var mı? Giriş yap
          </a>
        </form>
      </div>
    </div>
  );
}
