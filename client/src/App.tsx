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
import NotFound from "@/pages/not-found";

function DashboardLayout({ children }: { children: React.ReactNode }) {
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
            }}
          >
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuthenticatedApp() {
  return (
    <DashboardLayout>
      <Switch>
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
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>
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
