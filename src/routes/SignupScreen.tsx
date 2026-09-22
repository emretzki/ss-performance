import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { createOrganization, signInAtRootAndGetHandoff } from "@/lib/api";
import { tenantUrl } from "@/lib/tenant";
import { ensureLandingAssets, removeLandingAssets } from "@/lib/landingAssets";

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

  // Reached from the marketing landing page (both "Ücretsiz salonunu
  // oluştur" and its own root domain), so it shares that page's dark/lime
  // visual language rather than the app's own light management-panel theme
  // — otherwise the pre-login experience would switch brands mid-flow.
  useEffect(() => {
    ensureLandingAssets().catch((err) => console.error(err));
    return () => removeLandingAssets();
  }, []);

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
        // Sign them straight into their brand-new tenant instead of making
        // them log in again with credentials they just typed.
        const result = await signInAtRootAndGetHandoff(email, password);
        window.location.href = result.ok ? result.handoffUrl : tenantUrl(slug);
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
    <div className="gk-signup">
      <div className="gk-signup-card">
        <div className="gk-signup-mark">
          <svg viewBox="0 0 32 32" fill="none">
            <path d="M17 3 L8 18 L14.5 18 L13 29 L25 13 L18 13 Z" fill="#B8F028" />
          </svg>
          <span>Gymkoç</span>
        </div>
        <h1>Yeni salon oluştur</h1>
        <p className="gk-signup-sub">Kendi markanla, kendi yönetim panelin.</p>

        <form onSubmit={handleSubmit}>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="gk-signup-logo">
            {logoPreview ? <img src={logoPreview} alt="" /> : "Logo ekle"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />

          <div className="gk-login-field">
            <label htmlFor="signup-org-name">Salon adı</label>
            <input id="signup-org-name" required value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          </div>

          <div className="gk-login-field">
            <label>Marka rengi</label>
            <div className="gk-signup-color-row">
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
              <span>{accentColor}</span>
            </div>
          </div>

          <div className="gk-login-field">
            <label htmlFor="signup-full-name">Ad Soyad (sen)</label>
            <input id="signup-full-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className="gk-login-field">
            <label htmlFor="signup-email">E-posta</label>
            <input id="signup-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="gk-login-field">
            <label htmlFor="signup-password">Şifre</label>
            <input id="signup-password" required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {error && <p className="gk-login-error">{error}</p>}

          <button type="submit" className="gk-login-submit" disabled={saving}>
            {saving ? "Oluşturuluyor..." : "Salonu oluştur"}
          </button>

          <a href="/" className="gk-signup-foot">
            Zaten bir salonun var mı? Giriş yap
          </a>
        </form>
      </div>
    </div>
  );
}
