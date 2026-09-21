import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { mockDB } from "@/lib/mockStore";
import { clearHandoffHash, readSessionHandoffFromHash } from "@/lib/tenant";
import type { Profile } from "@/lib/types";

const SESSION_KEY = "sportscience-mock-session";

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  authError: string | null;
  passwordRecovery: boolean;
  signInMock: (profileId: string) => void;
  signOut: () => void;
  setAvatarUrl: (url: string) => void;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const client = supabase;

      // Arriving from a cross-subdomain login handoff (see src/lib/tenant.ts)?
      // Establish the session here before anything else runs.
      const handoff = readSessionHandoffFromHash();
      if (handoff) {
        clearHandoffHash();
        client.auth.setSession({ access_token: handoff.accessToken, refresh_token: handoff.refreshToken });
      }

      const { data: sub } = client.auth.onAuthStateChange(async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setPasswordRecovery(true);
          setLoading(false);
          return;
        }
        if (!session) {
          setProfile(null);
          setLoading(false);
          return;
        }
        const { data: p, error } = await client.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
        if (error || !p) {
          setAuthError("Bu hesap için henüz bir profil kaydı yok. Süper admin, profiles tablosuna bu kullanıcıyı eklemeli.");
          setProfile(null);
          setLoading(false);
          return;
        }
        setAuthError(null);
        setProfile({
          id: p.id,
          organizationId: p.organization_id,
          branchId: p.branch_id,
          role: p.role,
          fullName: p.full_name,
          phone: p.phone,
          avatarColor: "var(--color-gold)",
          avatarUrl: p.avatar_url ?? null,
        });
        setLoading(false);
      });

      return () => sub.subscription.unsubscribe();
    }

    const storedId = localStorage.getItem(SESSION_KEY);
    if (storedId) {
      const p = mockDB.get().profiles.find((pr) => pr.id === storedId) ?? null;
      setProfile(p);
    }
    setLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      loading,
      authError,
      passwordRecovery,
      clearPasswordRecovery: () => setPasswordRecovery(false),
      signInMock: (profileId: string) => {
        localStorage.setItem(SESSION_KEY, profileId);
        const p = mockDB.get().profiles.find((pr) => pr.id === profileId) ?? null;
        setProfile(p);
      },
      signOut: () => {
        localStorage.removeItem(SESSION_KEY);
        setProfile(null);
        if (isSupabaseConfigured && supabase) supabase.auth.signOut();
      },
      setAvatarUrl: (url: string) => {
        setProfile((prev) => (prev ? { ...prev, avatarUrl: url } : prev));
      },
    }),
    [profile, loading, authError, passwordRecovery],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
