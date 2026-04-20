import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AppWindow, Key, Users, Coins, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { TiltCard } from "@/components/tilt-card";
import type { Application, License, AppUser, Token } from "@shared/schema";

/* ─── Global scroll-reveal ─────────────────────────── */
function useScrollReveal(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const targets = container.querySelectorAll(
      ".reveal-fade:not(.is-visible),.reveal-slide-up:not(.is-visible),.reveal-scale:not(.is-visible)"
    );
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } }),
      { threshold: 0.08, rootMargin: "0px 0px -20px 0px" }
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ref]);
}

/* ─── Page-level mouse parallax ────────────────────── */
function usePageMouse(ref: React.RefObject<HTMLElement | null>) {
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number>(0);

  const onMove = useCallback((e: MouseEvent) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      setMouse({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });
    });
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("mousemove", onMove, { passive: true });
    return () => { el.removeEventListener("mousemove", onMove); cancelAnimationFrame(rafRef.current); };
  }, [onMove, ref]);

  return mouse;
}

/* ─── Dashboard ambient orbs ───────────────────────── */
function DashboardOrbs({ mx, my }: { mx: number; my: number }) {
  const dx = mx - 0.5;
  const dy = my - 0.5;

  const orbs = [
    { bg: "153,0,255", a: 0.16, w: "55vw", cx: "70%",  cy: "-10%", mi: 140 },
    { bg: "102,0,255", a: 0.12, w: "40vw", cx: "10%",  cy: "80%",  mi: -100 },
    { bg: "200,50,255",a: 0.10, w: "28vw", cx: "50%",  cy: "60%",  mi: 80  },
    { bg: "80,0,200",  a: 0.08, w: "18vw", cx: "80%",  cy: "70%",  mi: -55 },
    { bg: "255,100,255",a:0.06, w: "12vw", cx: "20%",  cy: "20%",  mi: 40  },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden style={{ zIndex: 0 }}>
      {orbs.map((o, i) => (
        <div key={i} style={{
          position: "absolute",
          borderRadius: "50%",
          width: o.w, height: o.w,
          left: `calc(${o.cx} + ${dx * o.mi}px)`,
          top:  `calc(${o.cy} + ${dy * o.mi}px)`,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(ellipse, rgba(${o.bg},${o.a}) 0%, transparent 68%)`,
          transition: `left ${0.10 + i * 0.03}s ease-out, top ${0.10 + i * 0.03}s ease-out`,
          willChange: "left, top",
        }} />
      ))}
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid-lines opacity-40" />
    </div>
  );
}

/* ─── Floating particle mini-system ────────────────── */
function MiniParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: (Math.sin(i * 73.1) * 0.5 + 0.5) * 100,
      y: (Math.cos(i * 51.7) * 0.5 + 0.5) * 100,
      size: (Math.abs(Math.sin(i * 7.1)) * 0.5 + 0.5) * 5 + 2,
      dur: (Math.abs(Math.sin(i * 3.3)) * 0.5 + 0.5) * 7 + 4,
      delay: (Math.abs(Math.sin(i * 2.1)) * 0.5 + 0.5) * 5,
      alpha: (Math.abs(Math.sin(i * 8.2)) * 0.5 + 0.5) * 0.35 + 0.08,
    })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden style={{ zIndex: 0 }}>
      {particles.map((p) => (
        <div key={p.id} style={{
          position: "absolute",
          width: p.size, height: p.size,
          borderRadius: "50%",
          left: `${p.x}%`,
          top:  `${p.y}%`,
          background: `radial-gradient(circle, rgba(153,0,255,${p.alpha}) 0%, transparent 70%)`,
          animation: `float-particle ${p.dur}s ${p.delay}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

/* ─── Enhanced stat card using TiltCard ────────────── */
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  href: string;
  isLoading: boolean;
  delay?: string;
}

function StatCard({ label, value, icon: Icon, color, bg, href, isLoading, delay = "0s" }: StatCardProps) {
  return (
    <Link href={href}>
      <TiltCard
        maxDeg={18}
        glowIntensity={0.25}
        className="reveal-slide-up cursor-pointer glass border border-border/60 rounded-lg p-5 group"
        style={{ transitionDelay: delay }}
        data-testid={`stat-card-${label.toLowerCase()}`}
      >
        {/* Top pulse line */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <p
              className="text-xs font-semibold text-muted-foreground"
              style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.10em", textTransform: "uppercase" }}
            >
              {label}
            </p>
            {isLoading ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p
                className="mt-1 text-3xl font-bold tabular-nums counter-pop"
                style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.02em" }}
                data-testid={`stat-${label.toLowerCase()}`}
              >
                {value}
              </p>
            )}
          </div>

          {/* Icon — zooms + glows on hover */}
          <div
            className={`rounded-md p-2.5 ${bg} transition-all duration-300 group-hover:scale-125 group-hover:shadow-[0_0_20px_rgba(102,0,255,0.38)]`}
          >
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>

        {/* Bottom glow line */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
      </TiltCard>
    </Link>
  );
}

/* ─── Row item with hover float ────────────────────── */
function HoverRow({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`transition-all duration-250 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(102,0,255,0.18)] ${className}`}
      style={{ transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }}
      {...props}
    >
      {children}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);
  useScrollReveal(pageRef as React.RefObject<HTMLElement | null>);
  const mouse = usePageMouse(pageRef as React.RefObject<HTMLElement | null>);

  const { data: apps,     isLoading: appsLoading }     = useQuery<Application[]>({ queryKey: ["/api/applications"] });
  const { data: licenses, isLoading: licensesLoading } = useQuery<License[]>({ queryKey: ["/api/licenses"] });
  const { data: appUsers, isLoading: usersLoading }    = useQuery<AppUser[]>({ queryKey: ["/api/app-users"] });
  const { data: tokens,   isLoading: tokensLoading }   = useQuery<Token[]>({ queryKey: ["/api/tokens"] });

  const isLoading = appsLoading || licensesLoading || usersLoading || tokensLoading;

  const stats = [
    { label: "Applications", value: apps?.length ?? 0,     icon: AppWindow, color: "text-blue-400",    bg: "bg-blue-500/10",    href: "/dashboard/apps" },
    { label: "Licenses",     value: licenses?.length ?? 0, icon: Key,       color: "text-emerald-400", bg: "bg-emerald-500/10", href: "/dashboard/licenses" },
    { label: "Users",        value: appUsers?.length ?? 0, icon: Users,     color: "text-amber-400",   bg: "bg-amber-500/10",   href: "/dashboard/users" },
    { label: "Tokens",       value: tokens?.length ?? 0,   icon: Coins,     color: "text-purple-400",  bg: "bg-purple-500/10",  href: "/dashboard/tokens" },
  ];

  return (
    <div ref={pageRef} className="relative p-6 lg:p-8 animate-fade-in" style={{ minHeight: "100%" }}>

      {/* ── Ambient orbs that track mouse ──────────── */}
      <DashboardOrbs mx={mouse.x} my={mouse.y} />

      {/* ── Floating particles ─────────────────────── */}
      <MiniParticles />

      {/* ── Slow scan line ─────────────────────────── */}
      <div className="scan-line" style={{ animationDelay: "3s", animationDuration: "10s" }} aria-hidden />

      {/* ── Content (above the orbs) ───────────────── */}
      <div className="relative" style={{ zIndex: 2 }}>

        {/* Header */}
        <div className="mb-8">
          <h1
            className="reveal-slide-up text-2xl font-bold"
            style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.04em" }}
            data-testid="text-dashboard-title"
          >
            Welcome back,{" "}
            <span
              className="bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent"
              style={{ filter: "drop-shadow(0 0 12px rgba(153,0,255,0.45))" }}
            >
              {user?.firstName || user?.username || "Developer"}
            </span>
          </h1>
          <p className="reveal-fade delay-1 mt-1 text-sm text-muted-foreground font-medium">
            Here&apos;s an overview of your licensing platform.
          </p>
        </div>

        {/* Stat cards — each with full 3D TiltCard */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <StatCard
              key={stat.label}
              {...stat}
              isLoading={isLoading}
              delay={`${i * 0.07}s`}
            />
          ))}
        </div>

        {/* Recent panels */}
        <div className="mt-8 grid gap-4 lg:grid-cols-2">

          {/* Recent Applications */}
          <TiltCard
            maxDeg={8}
            glowIntensity={0.14}
            className="reveal-slide-up glass border border-border/60 rounded-lg p-5 group"
            style={{ transitionDelay: "0.24s" }}
          >
            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="font-bold tracking-wide" style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.06em" }}>
                  Recent Applications
                </h3>
                <Link href="/dashboard/apps">
                  <Button variant="ghost" size="sm" data-testid="link-view-all-apps" className="btn-glow text-xs font-semibold" style={{ letterSpacing: "0.06em" }}>
                    View all <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>

              {appsLoading ? (
                <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : apps && apps.length > 0 ? (
                <div className="space-y-2">
                  {apps.slice(0, 5).map((app, i) => (
                    <HoverRow
                      key={app.id}
                      className="reveal-slide-up flex items-center justify-between gap-4 rounded-md border border-border/60 p-3 glass"
                      style={{ transitionDelay: `${0.3 + i * 0.05}s` }}
                      data-testid={`app-row-${app.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-primary/10 p-2 transition-all duration-300 group-hover:bg-primary/20">
                          <AppWindow className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ fontFamily: "Rajdhani, sans-serif" }}>{app.name}</p>
                          <p className="text-xs text-muted-foreground">v{app.version}</p>
                        </div>
                      </div>
                      <Badge variant={app.enabled ? "secondary" : "destructive"} className="text-xs font-semibold" style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.06em" }}>
                        {app.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </HoverRow>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AppWindow className="mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground font-medium">No applications yet. Create your first one.</p>
                  <Link href="/dashboard/apps">
                    <Button size="sm" className="mt-3 btn-glow font-semibold" data-testid="button-create-first-app">Create Application</Button>
                  </Link>
                </div>
              )}
            </div>
          </TiltCard>

          {/* Recent Licenses */}
          <TiltCard
            maxDeg={8}
            glowIntensity={0.14}
            className="reveal-slide-up glass border border-border/60 rounded-lg p-5 group"
            style={{ transitionDelay: "0.30s" }}
          >
            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="font-bold tracking-wide" style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.06em" }}>
                  Recent Licenses
                </h3>
                <Link href="/dashboard/licenses">
                  <Button variant="ghost" size="sm" data-testid="link-view-all-licenses" className="btn-glow text-xs font-semibold" style={{ letterSpacing: "0.06em" }}>
                    View all <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>

              {licensesLoading ? (
                <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : licenses && licenses.length > 0 ? (
                <div className="space-y-2">
                  {licenses.slice(0, 5).map((lic, i) => (
                    <HoverRow
                      key={lic.id}
                      className="reveal-slide-up flex items-center justify-between gap-4 rounded-md border border-border/60 p-3 glass"
                      style={{ transitionDelay: `${0.36 + i * 0.05}s` }}
                      data-testid={`license-row-${lic.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-emerald-500/10 p-2">
                          <Key className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-mono text-xs font-semibold">{lic.licenseKey.slice(0, 24)}…</p>
                          <p className="text-xs text-muted-foreground">{lic.note || "No note"}</p>
                        </div>
                      </div>
                      <Badge variant={lic.enabled ? "secondary" : "destructive"} className="text-xs font-semibold" style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.06em" }}>
                        {lic.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </HoverRow>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Key className="mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground font-medium">No licenses yet. Generate some for your apps.</p>
                  <Link href="/dashboard/licenses">
                    <Button size="sm" className="mt-3 btn-glow font-semibold" data-testid="button-create-first-license">Generate Licenses</Button>
                  </Link>
                </div>
              )}
            </div>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}
