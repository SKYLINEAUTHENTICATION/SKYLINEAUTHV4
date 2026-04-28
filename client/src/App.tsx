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
import { useEffect, useRef, useState, useCallback, useMemo } from "react";

/**
 * Global scroll-reveal: re-runs IntersectionObserver on every route change.
 * Finds all .reveal-* elements that aren't yet .is-visible and observes them.
 */
function useGlobalScrollReveal(location: string) {
  useEffect(() => {
    // Small delay so the new page DOM is rendered
    const timer = setTimeout(() => {
      const targets = document.querySelectorAll(
        ".reveal-fade:not(.is-visible), .reveal-slide-up:not(.is-visible), .reveal-scale:not(.is-visible), .reveal-slide-left:not(.is-visible), .reveal-slide-right:not(.is-visible)"
      );
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -20px 0px" }
      );
      targets.forEach((el) => observer.observe(el));
      return () => observer.disconnect();
    }, 60);
    return () => clearTimeout(timer);
  }, [location]);
}

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
import InstagramFollowersPage from "@/pages/instagram-followers";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import { SnowDrift } from "@/components/snow-drift";

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
        background: isWarning ? "rgba(239,68,68,0.08)" : "rgba(102,0,255,0.06)",
        border: `1px solid ${isWarning ? "rgba(239,68,68,0.3)" : "rgba(102,0,255,0.22)"}`,
        borderRadius: 20,
        transition: "all 0.4s",
      }}
    >
      <div style={{
        width: 6, height: 6, borderRadius: "50%",
        background: isWarning ? "#ef4444" : "#aa00ff",
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
          background: isWarning ? "#ef4444" : "linear-gradient(90deg,#6600ff,#aa00ff)",
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

/* ── Starfield for dashboard layout ────────────────────── */
function LayoutStarfield({ mx, my }: { mx: number; my: number }) {
  const stars = useMemo(() =>
    Array.from({ length: 55 }, (_, i) => ({
      id: i,
      x: (Math.sin(i * 137.5) * 0.5 + 0.5) * 100,
      y: (Math.cos(i * 137.5) * 0.5 + 0.5) * 100,
      size: (Math.sin(i * 7.3) * 0.5 + 0.5) * 1.6 + 0.4,
      opacity: (Math.sin(i * 3.1) * 0.5 + 0.5) * 0.45 + 0.06,
      twinkle: (Math.sin(i * 2.7) * 0.5 + 0.5) * 5 + 2.5,
      delay: (Math.sin(i * 1.9) * 0.5 + 0.5) * 5,
      depth: (Math.sin(i * 4.3) * 0.5 + 0.5) * 0.06 + 0.01,
    })),
    []
  );
  const dx = (mx - 0.5) * 40;
  const dy = (my - 0.5) * 40;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }} aria-hidden>
      {stars.map((s) => (
        <div key={s.id} style={{
          position: "absolute",
          left: `calc(${s.x}% + ${dx * s.depth}px)`,
          top:  `calc(${s.y}% + ${dy * s.depth}px)`,
          width: s.size, height: s.size,
          borderRadius: "50%",
          background: `rgba(200,160,255,${s.opacity})`,
          animation: `star-twinkle ${s.twinkle}s ease-in-out ${s.delay}s infinite`,
          transition: "left 0.30s ease-out, top 0.30s ease-out",
        }} />
      ))}
    </div>
  );
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const rafRef = useRef<number>(0);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const layoutRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();
  useGlobalScrollReveal(location);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = layoutRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMouse({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });
    });
  }, []);

  const dx = mouse.x - 0.5;
  const dy = mouse.y - 0.5;

  /* 6 orb layers — intensities carefully spaced for depth illusion */
  const orbs = [
    { bg: "153,0,255", a: 0.14, w: "75vw", cx: "55%",  cy: "-18%", mi: -120, t: "0.22s" },
    { bg: "102,0,255", a: 0.11, w: "58vw", cx: "15%",  cy: "85%",  mi:  90,  t: "0.18s" },
    { bg: "200,50,255",a: 0.09, w: "42vw", cx: "85%",  cy: "55%",  mi: -65,  t: "0.15s" },
    { bg: "80,0,200",  a: 0.07, w: "28vw", cx: "30%",  cy: "30%",  mi:  45,  t: "0.12s" },
    { bg: "255,80,255",a: 0.06, w: "18vw", cx: "65%",  cy: "78%",  mi: -30,  t: "0.09s" },
    { bg: "153,0,255", a: 0.10, w: "10vw", cx: "40%",  cy: "50%",  mi: 200,  t: "0.06s" },
  ];

  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div
        ref={layoutRef}
        onMouseMove={handleMouseMove}
        className="flex h-screen w-full"
        style={{ position: "relative", overflow: "hidden" }}
      >
        {/* ── Deep starfield layer ──────────────────── */}
        <LayoutStarfield mx={mouse.x} my={mouse.y} />

        {/* ── 6-depth-layer parallax orbs ──────────── */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          {/* Drifting grid */}
          <div className="absolute inset-0 bg-grid-lines opacity-30" aria-hidden />

          {orbs.map((o, i) => (
            <div key={i} style={{
              position: "absolute",
              borderRadius: "50%",
              width: o.w, height: o.w,
              left: `calc(${o.cx} + ${dx * o.mi}px)`,
              top:  `calc(${o.cy} + ${dy * o.mi}px)`,
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(ellipse, rgba(${o.bg},${o.a}) 0%, transparent 68%)`,
              transition: `left ${o.t} ease-out, top ${o.t} ease-out`,
              willChange: "left, top",
            }} />
          ))}

          {/* Single recurring scan sweep */}
          <div className="scan-line" style={{ animationDuration: "12s", animationDelay: "4s" }} aria-hidden />
        </div>

        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden" style={{ position: "relative", zIndex: 1 }}>
          <header
            className="sticky top-0 z-50 flex items-center gap-4 px-4 py-2"
            style={{
              background: "rgba(0,0,0,0.85)",
              borderBottom: "1px solid rgba(102,0,255,0.22)",
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
            <Route path="/dashboard/instagram-followers" component={InstagramFollowersPage} />
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
            background: "linear-gradient(90deg, #4400cc, #6600ff, #9900ff, #6600ff, #4400cc)",
            backgroundSize: "200% auto",
            animation: "loading-bar-fill 1.8s cubic-bezier(0.4,0,0.2,1) forwards, loading-bar-shimmer 1.2s linear infinite",
            boxShadow: "0 0 8px rgba(102,0,255,0.70), 0 0 20px rgba(153,0,255,0.40)",
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
          <SnowDrift count={55} />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
