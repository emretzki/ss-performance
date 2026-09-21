import { useRef, useState, type ChangeEvent } from "react";
import { Camera } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { Button } from "@/components/ui/Button";
import { uploadAvatar } from "@/lib/api";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Süper admin",
  owner: "Şube sahibi",
  trainer: "PT",
};

export function ProfileScreen() {
  const { profile, signOut, setAvatarUrl } = useAuth();
  const { branches } = useBranch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  const branchName = branches.find((b) => b.id === profile.branchId)?.name;

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadAvatar(profile.id, file);
      setAvatarUrl(url);
    } catch {
      setError("Fotoğraf yüklenemedi, tekrar dene.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 pt-6 text-center">
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
        {error && <p className="text-[12px] text-[var(--color-danger)]">{error}</p>}

        <div>
          <p className="font-display text-[22px] font-bold text-[var(--color-ink)]">{profile.fullName}</p>
          <p className="mt-1 text-[13px] text-[var(--color-ash)]">
            {ROLE_LABEL[profile.role]}
            {branchName ? ` · ${branchName}` : ""}
          </p>
        </div>
        {profile.phone && <p className="text-[13px] text-[var(--color-ink-soft)]">{profile.phone}</p>}
        <Button variant="secondary" onClick={signOut} className="mt-4 w-full">
          Çıkış yap
        </Button>
      </div>
    </div>
  );
}
