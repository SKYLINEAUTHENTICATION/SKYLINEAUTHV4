import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AppWindow, Key, Users, Coins, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import type { Application, License, AppUser, Token } from "@shared/schema";

/* ─── Scroll-reveal helper ─────────────────────────────── */
function useScrollReveal(containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const targets = container.querySelectorAll(
      ".reveal-fade, .reveal-slide-up, .reveal-scale"
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
  }, [containerRef]);
}

/* ─── Stat card component ──────────────────────────────── */
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
      <Card
        className="group card-glow card-glow-stat reveal-slide-up relative overflow-hidden p-5 cursor-pointer glass border-border/60"
        style={{ transitionDelay: delay }}
        data-testid={`stat-card-${label.toLowerCase()}`}
      >
        {/* Subtle top-border accent */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground font-medium tracking-wide" style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.06em" }}>
              {label}
            </p>
            {isLoading ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p
                className="mt-1 text-3xl font-bold tabular-nums"
                style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.02em" }}
                data-testid={`stat-${label.toLowerCase()}`}
              >
                {value}
              </p>
            )}
          </div>

          {/* Icon badge */}
          <div
            className={`rounded-md p-2.5 ${bg} transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_16px_rgba(102,0,255,0.3)]`}
          >
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>

        {/* Bottom glow line on hover */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </Card>
    </Link>
  );
}

/* ─── Main page ────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);
  useScrollReveal(pageRef as React.RefObject<HTMLElement | null>);

  const { data: apps, isLoading: appsLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });
  const { data: licenses, isLoading: licensesLoading } = useQuery<License[]>({
    queryKey: ["/api/licenses"],
  });
  const { data: appUsers, isLoading: usersLoading } = useQuery<AppUser[]>({
    queryKey: ["/api/app-users"],
  });
  const { data: tokens, isLoading: tokensLoading } = useQuery<Token[]>({
    queryKey: ["/api/tokens"],
  });

  const isLoading = appsLoading || licensesLoading || usersLoading || tokensLoading;

  const stats = [
    { label: "Applications", value: apps?.length ?? 0,     icon: AppWindow, color: "text-blue-400",    bg: "bg-blue-500/10",    href: "/dashboard/apps" },
    { label: "Licenses",     value: licenses?.length ?? 0, icon: Key,       color: "text-emerald-400", bg: "bg-emerald-500/10", href: "/dashboard/licenses" },
    { label: "Users",        value: appUsers?.length ?? 0, icon: Users,     color: "text-amber-400",   bg: "bg-amber-500/10",   href: "/dashboard/users" },
    { label: "Tokens",       value: tokens?.length ?? 0,   icon: Coins,     color: "text-purple-400",  bg: "bg-purple-500/10",  href: "/dashboard/tokens" },
  ];

  return (
    <div ref={pageRef} className="p-6 lg:p-8 animate-fade-in">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="mb-8">
        <h1
          className="reveal-slide-up text-2xl font-bold tracking-tight"
          style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.04em" }}
          data-testid="text-dashboard-title"
        >
          Welcome back,{" "}
          <span className="bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">
            {user?.firstName || user?.username || "Developer"}
          </span>
        </h1>
        <p className="reveal-fade delay-1 mt-1 text-sm text-muted-foreground font-medium">
          Here&apos;s an overview of your licensing platform.
        </p>
      </div>

      {/* ── Stat cards ─────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <StatCard
            key={stat.label}
            {...stat}
            isLoading={isLoading}
            delay={`${i * 0.06}s`}
          />
        ))}
      </div>

      {/* ── Recent panels ──────────────────────────────── */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">

        {/* Recent Applications */}
        <Card
          className="reveal-slide-up p-5 glass border-border/60"
          style={{ transitionDelay: "0.22s" }}
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="font-bold tracking-wide" style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.06em" }}>
              Recent Applications
            </h3>
            <Link href="/dashboard/apps">
              <Button
                variant="ghost"
                size="sm"
                data-testid="link-view-all-apps"
                className="btn-glow text-xs font-semibold tracking-wider"
                style={{ letterSpacing: "0.06em" }}
              >
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>

          {appsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : apps && apps.length > 0 ? (
            <div className="space-y-2">
              {apps.slice(0, 5).map((app, i) => (
                <div
                  key={app.id}
                  className="reveal-slide-up card-glow flex items-center justify-between gap-4 rounded-md border border-border/60 p-3"
                  style={{ transitionDelay: `${0.28 + i * 0.05}s` }}
                  data-testid={`app-row-${app.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-primary/10 p-2 transition-all duration-200 group-hover:bg-primary/20">
                      <AppWindow className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ fontFamily: "Rajdhani, sans-serif" }}>{app.name}</p>
                      <p className="text-xs text-muted-foreground">v{app.version}</p>
                    </div>
                  </div>
                  <Badge
                    variant={app.enabled ? "secondary" : "destructive"}
                    className="text-xs font-semibold"
                    style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.06em" }}
                  >
                    {app.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AppWindow className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground font-medium">
                No applications yet. Create your first one.
              </p>
              <Link href="/dashboard/apps">
                <Button
                  size="sm"
                  className="mt-3 btn-glow font-semibold tracking-wider"
                  data-testid="button-create-first-app"
                  style={{ letterSpacing: "0.06em" }}
                >
                  Create Application
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Recent Licenses */}
        <Card
          className="reveal-slide-up p-5 glass border-border/60"
          style={{ transitionDelay: "0.28s" }}
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="font-bold tracking-wide" style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.06em" }}>
              Recent Licenses
            </h3>
            <Link href="/dashboard/licenses">
              <Button
                variant="ghost"
                size="sm"
                data-testid="link-view-all-licenses"
                className="btn-glow text-xs font-semibold tracking-wider"
                style={{ letterSpacing: "0.06em" }}
              >
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>

          {licensesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : licenses && licenses.length > 0 ? (
            <div className="space-y-2">
              {licenses.slice(0, 5).map((lic, i) => (
                <div
                  key={lic.id}
                  className="reveal-slide-up card-glow flex items-center justify-between gap-4 rounded-md border border-border/60 p-3"
                  style={{ transitionDelay: `${0.34 + i * 0.05}s` }}
                  data-testid={`license-row-${lic.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-emerald-500/10 p-2">
                      <Key className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-semibold">
                        {lic.licenseKey.slice(0, 24)}…
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lic.note || "No note"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={lic.enabled ? "secondary" : "destructive"}
                    className="text-xs font-semibold"
                    style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.06em" }}
                  >
                    {lic.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Key className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground font-medium">
                No licenses yet. Generate some for your apps.
              </p>
              <Link href="/dashboard/licenses">
                <Button
                  size="sm"
                  className="mt-3 btn-glow font-semibold tracking-wider"
                  data-testid="button-create-first-license"
                  style={{ letterSpacing: "0.06em" }}
                >
                  Generate Licenses
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
