import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { createPersonWithRole } from "@/lib/api";
import type { Branch, Role } from "@/lib/types";

const inputClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] focus:border-[var(--color-gold)]";

interface AddPersonFormProps {
  organizationId: string;
  branches: Branch[];
  defaultBranchId: string;
  canChooseRole: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function randomPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function AddPersonForm({ organizationId, branches, defaultBranchId, canChooseRole, onClose, onCreated }: AddPersonFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(randomPassword);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Extract<Role, "owner" | "trainer">>("trainer");
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  async function handleSubmit() {
    if (!email.trim() || !fullName.trim()) {
      setError("E-posta ve ad soyad gerekli.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPersonWithRole({ email: email.trim(), password, fullName: fullName.trim(), phone: phone.trim() || null, role, branchId, organizationId });
      onCreated();
      setCreated({ email: email.trim(), password });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt eklenemedi, tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <Modal title="Hesap oluşturuldu" onClose={onClose}>
        <div className="flex flex-col gap-4">
          <p className="text-[14px] text-[var(--color-ink)]">
            Bu giriş bilgilerini {created.email.split("@")[0]}'e ilet, ilk girişte kullanacak:
          </p>
          <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
            <div>
              <p className="text-[11px] text-[var(--color-ash)]">E-posta</p>
              <p className="text-[14px] font-medium tabular-nums text-[var(--color-ink)]">{created.email}</p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--color-ash)]">Şifre</p>
              <p className="text-[14px] font-medium tabular-nums text-[var(--color-ink)]">{created.password}</p>
            </div>
          </div>
          <Button size="lg" onClick={onClose}>
            Tamam
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="PT / şube sahibi ekle" subtitle="Bir hesap oluşturulur, giriş bilgilerini sonra kişiye iletirsin." onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Ad Soyad</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">E-posta</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Geçici şifre</label>
          <div className="flex gap-2">
            <input value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            <button
              type="button"
              onClick={() => setPassword(randomPassword())}
              className="shrink-0 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] px-3 text-[13px] font-medium text-[var(--color-ink-soft)]"
            >
              Yenile
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Telefon (opsiyonel)</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </div>

        {canChooseRole && (
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Rol</label>
            <div className="flex gap-2">
              {(["trainer", "owner"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`h-10 flex-1 rounded-[var(--radius-md)] text-[14px] font-medium transition-colors duration-100 ${
                    role === r ? "bg-[var(--color-ink)] text-[var(--color-paper)]" : "border border-[var(--color-line-strong)] text-[var(--color-ink-soft)]"
                  }`}
                >
                  {r === "trainer" ? "PT" : "Şube sahibi"}
                </button>
              ))}
            </div>
          </div>
        )}

        {canChooseRole && branches.length > 1 && (
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">Şube</label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputClass}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}
        <Button size="lg" onClick={handleSubmit} disabled={saving}>
          {saving ? "Ekleniyor..." : "Hesap oluştur"}
        </Button>
      </div>
    </Modal>
  );
}
