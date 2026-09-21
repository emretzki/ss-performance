import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { isSupabaseConfigured } from "@/lib/supabase";
import { BranchProvider } from "@/contexts/BranchContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { AppShell } from "@/components/layout/AppShell";
import { LandingScreen } from "@/routes/LandingScreen";
import { LoginScreen } from "@/routes/LoginScreen";
import { SignupScreen } from "@/routes/SignupScreen";
import { PrivacyScreen } from "@/routes/PrivacyScreen";
import { TermsScreen } from "@/routes/TermsScreen";
import { ResetPasswordScreen } from "@/routes/ResetPasswordScreen";
import { CalendarScreen } from "@/components/calendar/CalendarScreen";
import { OverviewScreen } from "@/routes/OverviewScreen";
import { ReportsScreen } from "@/routes/ReportsScreen";
import { TeamScreen } from "@/routes/TeamScreen";
import { SettingsScreen } from "@/routes/SettingsScreen";
import { ProfileScreen } from "@/routes/ProfileScreen";
import { Barbell } from "@phosphor-icons/react";

function RequireAuth({ children }: { children: ReactNode }) {
  const { profile, loading, passwordRecovery } = useAuth();
  if (loading) return null;
  if (passwordRecovery) return <ResetPasswordScreen />;
  if (!profile) return <Navigate to="/login" replace />;
  return (
    <OrganizationProvider>
      <BranchProvider>{children}</BranchProvider>
    </OrganizationProvider>
  );
}

function TenantNotFound({ slug }: { slug: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-[var(--color-paper)] px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-ink)] text-[var(--color-paper)]">
        <Barbell size={24} weight="fill" />
      </span>
      <p className="font-display text-[20px] font-bold text-[var(--color-ink)]">"{slug}" adında bir salon bulamadık</p>
      <a href="https://gymkoc.com" className="text-[13px] font-medium text-[var(--color-gold-deep)] underline underline-offset-4">
        gymkoc.com'a dön
      </a>
    </div>
  );
}

export default function App() {
  const { passwordRecovery } = useAuth();
  const tenant = useTenant();

  if (tenant.status === "loading") return null;

  if (tenant.status === "landing") {
    return (
      <Routes>
        <Route path="/" element={<LandingScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/gizlilik-politikasi" element={<PrivacyScreen />} />
        <Route path="/kullanim-kosullari" element={<TermsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (tenant.status === "not-found") {
    return <TenantNotFound slug={tenant.slug} />;
  }

  return (
    <Routes>
      <Route path="/login" element={passwordRecovery ? <ResetPasswordScreen /> : <LoginScreen />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
      {!isSupabaseConfigured && <Route path="/signup" element={<SignupScreen />} />}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/calendar" element={<CalendarScreen />} />
        <Route path="/overview" element={<OverviewScreen />} />
        <Route path="/reports" element={<ReportsScreen />} />
        <Route path="/team" element={<TeamScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="*" element={<Navigate to="/calendar" replace />} />
      </Route>
    </Routes>
  );
}
