import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Camera, Moon, Sun } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/Button";
import { isSupabaseConfigured } from "@/lib/supabase";
import { updateOwnEmail, updateOwnPassword, updateOwnProfile, uploadAvatar } from "@/lib/api";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Süper admin",
  owner: "Şube sahibi",
  trainer: "PT",
};

const inputClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] focus:border-[var(--color-gold)]";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-left">
      <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">{title}</p>
      {children}
    </section>
  );
}

export function ProfileScreen() {
  const { profile, signOut, setAvatarUrl, patchProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { branches } = useBranch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [newPasswordAgain, setNewPasswordAgain] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.fullName ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile?.fullName, profile?.phone]);

  if (!profile) return null;

  const branchName = branches.find((b) => b.id === profile.branchId)?.name;

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    setAvatarError(null);
    try {
      const url = await uploadAvatar(profile.id, file);
      setAvatarUrl(url);
    } catch {
      setAvatarError("Fotoğraf yüklenemedi, tekrar dene.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSaveInfo(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSavingInfo(true);
    setInfoError(null);
    setInfoSaved(false);
    try {
      await updateOwnProfile(profile.id, fullName, phone || null);
      patchProfile({ fullName: fullName.trim() || profile.fullName, phone: phone.trim() || null });
      setInfoSaved(true);
    } catch {
      setInfoError("Kaydedilemedi, tekrar dene.");
    } finally {
      setSavingInfo(false);
    }
  }

  async function handleSavePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword.length < 6) {
      setPasswordError("Şifre en az 6 karakter olmalı.");
      return;
    }
    if (newPassword !== newPasswordAgain) {
      setPasswordError("Şifreler eşleşmiyor.");
      return;
    }
    setSavingPassword(true);
    try {
      await updateOwnPassword(newPassword);
      setPasswordSaved(true);
      setNewPassword("");
      setNewPasswordAgain("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Şifre değiştirilemedi.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSaveEmail(e: FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailSent(false);
    setSavingEmail(true);
    try {
      await updateOwnEmail(newEmail.trim());
      setEmailSent(true);
      setNewEmail("");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "E-posta değiştirilemedi.");
    } finally {
      setSavingEmail(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 pt-6 pb-10 text-center">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full text-[24px] font-bold text-[var(--color-ink)]"
          style={{ background: profile.avatarColor }}
          aria-label="Profil fotoğrafını değiştir"
        >
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            profile.fullName.charAt(0)
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-[var(--color-ink)]/0 opacity-0 transition-opacity duration-150 group-hover:bg-[var(--color-ink)]/40 group-hover:opacity-100">
            <Camera size={20} className="text-[var(--color-paper)]" />
          </span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        {uploading && <p className="text-[12px] text-[var(--color-ash)]">Yükleniyor...</p>}
        {avatarError && <p className="text-[12px] text-[var(--color-danger)]">{avatarError}</p>}

        <div>
          <p className="font-display text-[22px] font-bold text-[var(--color-ink)]">{profile.fullName}</p>
          <p className="mt-1 text-[13px] text-[var(--color-ash)]">
            {ROLE_LABEL[profile.role]}
            {branchName ? ` · ${branchName}` : ""}
          </p>
        </div>

        <Card title="Bilgilerin">
          <form onSubmit={handleSaveInfo} className="flex flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Ad Soyad</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Telefon</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="0532 000 00 00" />
            </div>
            {infoError && <p className="text-[13px] text-[var(--color-danger)]">{infoError}</p>}
            {infoSaved && !infoError && <p className="text-[13px] text-[var(--color-success)]">Kaydedildi.</p>}
            <Button type="submit" disabled={savingInfo}>
              {savingInfo ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </form>
        </Card>

        <Card title="Şifre değiştir">
          <form onSubmit={handleSavePassword} className="flex flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Yeni şifre</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Yeni şifre (tekrar)</label>
              <input
                type="password"
                value={newPasswordAgain}
                onChange={(e) => setNewPasswordAgain(e.target.value)}
                className={inputClass}
              />
            </div>
            {passwordError && <p className="text-[13px] text-[var(--color-danger)]">{passwordError}</p>}
            {passwordSaved && !passwordError && <p className="text-[13px] text-[var(--color-success)]">Şifren değişti.</p>}
            <Button type="submit" disabled={savingPassword || !newPassword}>
              {savingPassword ? "Kaydediliyor..." : "Şifreyi güncelle"}
            </Button>
          </form>
        </Card>

        <Card title="Görünüm">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => theme !== "light" && toggleTheme()}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border py-2.5 text-[14px] font-medium transition-colors duration-100 ${
                theme === "light" ? "border-[var(--color-gold)] bg-[var(--color-gold-tint)] text-[var(--color-ink)]" : "border-[var(--color-line-strong)] text-[var(--color-ink-soft)]"
              }`}
            >
              <Sun size={17} />
              Açık
            </button>
            <button
              type="button"
              onClick={() => theme !== "dark" && toggleTheme()}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border py-2.5 text-[14px] font-medium transition-colors duration-100 ${
                theme === "dark" ? "border-[var(--color-gold)] bg-[var(--color-gold-tint)] text-[var(--color-ink)]" : "border-[var(--color-line-strong)] text-[var(--color-ink-soft)]"
              }`}
            >
              <Moon size={17} />
              Koyu
            </button>
          </div>
        </Card>

        {isSupabaseConfigured && (
          <Card title="E-posta">
            <p className="text-[13px] text-[var(--color-ink-soft)]">
              Şu anki adresin: <span className="font-medium text-[var(--color-ink)]">{profile.email ?? "—"}</span>
            </p>
            <form onSubmit={handleSaveEmail} className="flex flex-col gap-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Yeni e-posta</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={inputClass}
                  placeholder="yeni@eposta.com"
                />
              </div>
              {emailError && <p className="text-[13px] text-[var(--color-danger)]">{emailError}</p>}
              {emailSent && !emailError && (
                <p className="text-[13px] text-[var(--color-success)]">
                  Onay bağlantısı yeni adresine gönderildi — tıklayana kadar eski adresin geçerli kalır.
                </p>
              )}
              <Button type="submit" disabled={savingEmail || !newEmail}>
                {savingEmail ? "Gönderiliyor..." : "E-postayı değiştir"}
              </Button>
            </form>
          </Card>
        )}

        <Link
          to="/rehber"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] text-[14px] font-medium text-[var(--color-ink)] lg:hidden"
        >
          <BookOpen size={18} />
          Kullanım kılavuzu
        </Link>
        <Button variant="secondary" onClick={signOut} className="w-full">
          Çıkış yap
        </Button>
      </div>
    </div>
  );
}
