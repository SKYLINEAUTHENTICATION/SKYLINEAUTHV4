import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ManageAppsPage from "@/pages/manage-apps";
import LicensesPage from "@/pages/licenses";
import AppUsersPage from "@/pages/app-users";
import TokensPage from "@/pages/tokens";
import AppSettingsPage from "@/pages/app-settings";
import StatisticsPage from "@/pages/statistics";
import PanelUsersPage from "@/pages/panel-users";
import ChatPage from "@/pages/chat";
import AnnouncementsPage from "@/pages/announcements";
import FilesPage from "@/pages/files";
import ResellersPage from "@/pages/resellers";
import PortalPage from "@/pages/portal";
import ProfilePage from "@/pages/profile";
import NotFound from "@/pages/not-found";

function IdleTimerBar({ onLogout }: { onLogout: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(180);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onLogout]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const pct = (secondsLeft / 180) * 100;
  const isWarning = secondsLeft <= 30;

  return (
    <div
      data-testid="idle-timer-bar"
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "3px 12px",
        background: isWarning ? "rgba(239,68,68,0.08)" : "rgba(124,58,237,0.06)",
        border: `1px solid ${isWarning ? "rgba(239,68,68,0.3)" : "rgba(139,92,246,0.18)"}`,
        borderRadius: 20,
        transition: "all 0.4s",
      }}
    >
      <div style={{
        width: 6, height: 6, borderRadius: "50%",
        background: isWarning ? "#ef4444" : "#a78bfa",
        animation: isWarning ? "pulse-dot 1s ease-in-out infinite" : "none",
      }} />
      <span style={{
        fontSize: 11, fontWeight: 600,
        color: isWarning ? "#ef4444" : "#71717a",
        fontFamily: "monospace",
        minWidth: 36,
      }} data-testid="text-idle-timer">
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
      <div style={{
        width: 60, height: 3, borderRadius: 2,
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 2,
          background: isWarning ? "#ef4444" : "linear-gradient(90deg,#7c3aed,#a78bfa)",
          width: `${pct}%`,
          transition: "width 1s linear, background 0.4s",
        }} />
      </div>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header
            className="sticky top-0 z-50 flex items-center gap-4 px-4 py-2"
            style={{
              background: "rgba(0,0,0,0.85)",
              borderBottom: "1px solid rgba(139,92,246,0.18)",
              backdropFilter: "blur(12px)",
              justifyContent: "space-between",
            }}
          >
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <IdleTimerBar onLogout={() => logout()} />
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuthenticatedApp() {
  const { isUser } = useAuth();
  return (
    <DashboardLayout>
      <Switch>
        {/* App users (role=user) get community-only access */}
        {isUser ? (
          <>
            <Route path="/dashboard/announcements" component={AnnouncementsPage} />
            <Route path="/dashboard/chat" component={ChatPage} />
            <Route path="/dashboard/files" component={FilesPage} />
            <Route path="/dashboard/profile" component={ProfilePage} />
            <Route path="/dashboard">
              <Redirect to="/dashboard/announcements" />
            </Route>
            <Route path="/">
              <Redirect to="/dashboard/announcements" />
            </Route>
          </>
        ) : (
          <>
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/dashboard/apps" component={ManageAppsPage} />
            <Route path="/dashboard/licenses" component={LicensesPage} />
            <Route path="/dashboard/users" component={AppUsersPage} />
            <Route path="/dashboard/tokens" component={TokensPage} />
            <Route path="/dashboard/settings" component={AppSettingsPage} />
            <Route path="/dashboard/statistics" component={StatisticsPage} />
            <Route path="/dashboard/panel-users" component={PanelUsersPage} />
            <Route path="/dashboard/chat" component={ChatPage} />
            <Route path="/dashboard/announcements" component={AnnouncementsPage} />
            <Route path="/dashboard/files" component={FilesPage} />
            <Route path="/dashboard/resellers" component={ResellersPage} />
            <Route path="/dashboard/profile" component={ProfilePage} />
            <Route path="/">
              <Redirect to="/dashboard" />
            </Route>
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div style={{ background: "#000", position: "relative" }} className="flex h-screen items-center justify-center">
        <div style={{
          width: "55%",
          height: 3,
          background: "rgba(30,0,60,0.5)",
          borderRadius: 2,
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            background: "linear-gradient(90deg, #4c1d95, #7c3aed, #a855f7, #7c3aed, #4c1d95)",
            backgroundSize: "200% auto",
            animation: "loading-bar-fill 1.8s cubic-bezier(0.4,0,0.2,1) forwards, loading-bar-shimmer 1.2s linear infinite",
            boxShadow: "0 0 8px rgba(124,58,237,0.70), 0 0 20px rgba(124,58,237,0.40)",
            borderRadius: 2,
          }} />
        </div>
        <style>{`
          @keyframes loading-bar-fill {
            0%   { width: 0%; }
            40%  { width: 60%; }
            70%  { width: 82%; }
            90%  { width: 94%; }
            100% { width: 100%; }
          }
          @keyframes loading-bar-shimmer {
            0%   { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
        `}</style>
      </div>
    );
  }

  if (location === "/portal") {
    return <PortalPage />;
  }

  if (user) {
    if (location === "/login") {
      return <Redirect to="/dashboard" />;
    }
    return <AuthenticatedApp />;
  }

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/portal" component={PortalPage} />
      <Route path="/">
        <Redirect to="/login" />
      </Route>
      <Route component={LoginPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
