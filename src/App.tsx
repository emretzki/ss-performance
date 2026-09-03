import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { AppShell } from "@/components/layout/AppShell";
import { LoginScreen } from "@/routes/LoginScreen";
import { ResetPasswordScreen } from "@/routes/ResetPasswordScreen";
import { CalendarScreen } from "@/components/calendar/CalendarScreen";
import { OverviewScreen } from "@/routes/OverviewScreen";
import { ReportsScreen } from "@/routes/ReportsScreen";
import { TeamScreen } from "@/routes/TeamScreen";
import { ProfileScreen } from "@/routes/ProfileScreen";

function RequireAuth({ children }: { children: ReactNode }) {
  const { profile, loading, passwordRecovery } = useAuth();
  if (loading) return null;
  if (passwordRecovery) return <ResetPasswordScreen />;
  if (!profile) return <Navigate to="/login" replace />;
  return <BranchProvider>{children}</BranchProvider>;
}

export default function App() {
  const { passwordRecovery } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={passwordRecovery ? <ResetPasswordScreen /> : <LoginScreen />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
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
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="*" element={<Navigate to="/calendar" replace />} />
      </Route>
    </Routes>
  );
}
