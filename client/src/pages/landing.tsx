import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Shield,
  Key,
  Users,
  Zap,
  Lock,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Code2,
  Globe,
} from "lucide-react";

/* ─── Scroll-reveal hook ─────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll(
      ".reveal-fade, .reveal-slide-up, .reveal-scale, .reveal-slide-left, .reveal-slide-right"
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
      { threshold: 0.10, rootMargin: "0px 0px -30px 0px" }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ─── Mouse parallax hook ────────────────────────────────── */
function useMouseParallax(ref: React.RefObject<HTMLElement | null>) {
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  const onMove = useCallback((e: MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [onMove, ref]);

  return mouse;
}

/* ─── Scroll parallax hook (background layers) ───────────── */
function useScrollParallax() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handle = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);
  return scrollY;
}

/* ─── Data ───────────────────────────────────────────────── */
const features = [
  {
    icon: Shield,
    title: "Application Security",
    description:
      "Protect your software with industry-standard licensing. Prevent unauthorized access and piracy.",
  },
  {
    icon: Key,
    title: "License Management",
    description:
      "Generate, distribute, and manage license keys with granular control over duration, levels, and limits.",
  },
  {
    icon: Users,
    title: "User Management",
    description:
      "Track authenticated users, monitor sessions, ban abusers, and manage hardware ID locks.",
  },
  {
    icon: Zap,
    title: "Token System",
    description:
      "Create single-use registration tokens for controlled user onboarding and track usage in real time.",
  },
  {
    icon: Lock,
    title: "HWID Locking",
    description:
      "Bind licenses to specific hardware IDs. Prevent account sharing and enforce per-device policies.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Real-time insights into usage, active users, license activations, and token redemptions.",
  },
];

const languages = [
  "C#", "C++", "Java", "Python", "PHP", "JavaScript", "TypeScript",
  "VB.Net", "Rust", "Go", "Lua", "Ruby", "Perl",
];

/* ─── Floating particle (pure CSS) ──────────────────────── */
function Particles() {
  const particles = [
    { size: 4, top: "12%", left: "8%",  dur: "7s",  delay: "0s"   },
    { size: 3, top: "28%", left: "92%", dur: "9s",  delay: "1.2s" },
    { size: 5, top: "55%", left: "5%",  dur: "11s", delay: "2s"   },
    { size: 3, top: "70%", left: "88%", dur: "8s",  delay: "0.5s" },
    { size: 6, top: "40%", left: "50%", dur: "13s", delay: "3s"   },
    { size: 2, top: "85%", left: "30%", dur: "6s",  delay: "1.7s" },
    { size: 4, top: "20%", left: "75%", dur: "10s", delay: "4s"   },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p, i) => (
        <div
          key={i}
          className="particle"
          style={{
            width: p.size, height: p.size,
            top: p.top, left: p.left,
            animationDuration: p.dur,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export default function LandingPage() {
  useScrollReveal();
  const heroRef = useRef<HTMLElement>(null);
  const mouse = useMouseParallax(heroRef as React.RefObject<HTMLElement | null>);
  const scrollY = useScrollParallax();

  /* Background orb parallax offsets (mouse-based for hero, scroll for rest) */
  const orb1X = (mouse.x - 0.5) * -50;
  const orb1Y = (mouse.y - 0.5) * -50 + scrollY * 0.08;
  const orb2X = (mouse.x - 0.5) * 35;
  const orb2Y = (mouse.y - 0.5) * 35 + scrollY * 0.05;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ── Fixed dot-grid layer (very subtle depth) ─────── */}
      <div
        className="pointer-events-none fixed inset-0 bg-dot-grid opacity-40"
        style={{ zIndex: 0, transform: `translateY(${scrollY * 0.03}px)` }}
        aria-hidden
      />

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b glass-strong" style={{ zIndex: 50 }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary shadow-[0_0_14px_rgba(102,0,255,0.6)]">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span
              className="skyline-brand-sidebar"
              style={{ fontSize: 14 }}
            >
              KeyAuth Manager
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/login">
              <Button
                variant="outline"
                data-testid="button-login"
                className="btn-glow font-semibold tracking-wide"
              >
                Log In
              </Button>
            </a>
            <a href="/register">
              <Button
                data-testid="button-register"
                className="btn-glow font-semibold tracking-wide shadow-[0_0_16px_rgba(102,0,255,0.4)]"
              >
                Sign Up
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section
        ref={heroRef as React.RefObject<HTMLElement>}
        className="relative overflow-hidden"
        style={{ minHeight: "88vh", display: "flex", alignItems: "center" }}
      >
        {/* Layered parallax background */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {/* Layer 1 — large slow orb (mouse parallax, scroll parallax) */}
          <div
            className="absolute rounded-full"
            style={{
              width: "72vw", height: "72vw",
              top: `calc(-8% + ${orb1Y}px)`,
              left: `calc(15% + ${orb1X}px)`,
              background: "radial-gradient(ellipse, rgba(153,0,255,0.18) 0%, transparent 68%)",
              transition: "top 0.1s ease-out, left 0.1s ease-out",
              willChange: "top, left",
            }}
          />
          {/* Layer 2 — medium faster orb */}
          <div
            className="absolute rounded-full"
            style={{
              width: "50vw", height: "50vw",
              bottom: `calc(-5% + ${-orb2Y}px)`,
              right: `calc(3% + ${-orb2X}px)`,
              background: "radial-gradient(ellipse, rgba(102,0,255,0.12) 0%, transparent 68%)",
              transition: "bottom 0.14s ease-out, right 0.14s ease-out",
              willChange: "bottom, right",
            }}
          />
          {/* Layer 3 — small accent orb */}
          <div
            className="absolute rounded-full"
            style={{
              width: "28vw", height: "28vw",
              top: "60%",
              left: `calc(4% + ${orb1X * 0.35}px)`,
              background: "radial-gradient(ellipse, rgba(180,0,255,0.08) 0%, transparent 70%)",
              transition: "left 0.22s ease-out",
            }}
          />
          {/* Gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-primary/3 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.14),_transparent_62%)]" />
        </div>

        <Particles />

        <div className="relative mx-auto max-w-6xl px-6 py-28 lg:py-36" style={{ zIndex: 1 }}>
          <div className="mx-auto max-w-3xl text-center">

            {/* Badge */}
            <div className="reveal-fade mb-8 inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-sm text-muted-foreground glass">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium tracking-wide">Software licensing made simple</span>
            </div>

            {/* Headline */}
            <h1 className="reveal-slide-up delay-1 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.01em" }}>
              Protect &amp; Monetize
              <span className="block bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent mt-1" style={{ letterSpacing: "0.02em" }}>
                Your Software
              </span>
            </h1>

            {/* Sub */}
            <p className="reveal-slide-up delay-2 mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground font-medium">
              The complete authentication and licensing platform for modern developers.
              Manage applications, licenses, users, and tokens from one powerful dashboard.
            </p>

            {/* CTAs */}
            <div className="reveal-slide-up delay-3 mt-10 flex flex-wrap items-center justify-center gap-4">
              <a href="/register">
                <Button
                  size="lg"
                  data-testid="button-get-started"
                  className="btn-glow font-bold tracking-widest shadow-[0_0_24px_rgba(102,0,255,0.45)]"
                  style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href="#features">
                <Button
                  size="lg"
                  variant="outline"
                  data-testid="button-learn-more"
                  className="btn-glow font-semibold tracking-wide"
                >
                  Learn More
                </Button>
              </a>
            </div>

            {/* Trust badges */}
            <div className="reveal-fade delay-4 mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              {[
                { label: "Free forever" },
                { label: "No credit card" },
                { label: "Unlimited apps" },
              ].map((badge) => (
                <span key={badge.label} className="flex items-center gap-1.5 font-medium">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  {badge.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section id="features" className="relative border-t py-24 lg:py-32" style={{ zIndex: 1 }}>
        {/* Faint scroll-parallax grid */}
        <div
          className="pointer-events-none absolute inset-0 bg-grid-lines opacity-60"
          style={{ transform: `translateY(${scrollY * -0.04}px)` }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-6">
          {/* Section header */}
          <div className="mb-16 text-center">
            <p className="reveal-fade section-label mb-4">Features</p>
            <h2 className="reveal-slide-up delay-1 text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "Rajdhani, sans-serif" }}>
              Everything You Need
            </h2>
            <p className="reveal-slide-up delay-2 mx-auto mt-4 max-w-xl text-muted-foreground font-medium">
              A complete toolkit for software licensing, authentication, and
              user management.
            </p>
          </div>

          {/* Feature cards grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <Card
                key={feature.title}
                className={`group card-glow reveal-slide-up p-6 border-border/60`}
                style={{ transitionDelay: `${i * 0.07}s`, animationDelay: `${i * 0.06}s` }}
                data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s/g,"-")}`}
              >
                {/* Icon */}
                <div className="mb-4 inline-flex rounded-md bg-primary/10 p-2.5 transition-all duration-300 group-hover:bg-primary/20 group-hover:shadow-[0_0_14px_rgba(102,0,255,0.25)]">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-bold text-base tracking-wide" style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.04em" }}>
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ─────────────────────────────────── */}
      <section className="relative border-t py-24 lg:py-32" style={{ zIndex: 1 }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="reveal-fade section-label mb-4">Integrations</p>
            <h2 className="reveal-slide-up delay-1 text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "Rajdhani, sans-serif" }}>
              Works With Your Stack
            </h2>
            <p className="reveal-slide-up delay-2 mx-auto mt-4 max-w-xl text-muted-foreground font-medium">
              Native client API support for 13+ programming languages with code snippets ready to copy.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {languages.map((lang, i) => (
              <div
                key={lang}
                className="card-glow reveal-scale flex items-center justify-center gap-2 rounded-md border bg-card/70 p-3 text-sm font-semibold text-card-foreground glass"
                style={{ transitionDelay: `${i * 0.04}s` }}
                data-testid={`lang-${lang.toLowerCase().replace(/[^a-z]/g, "")}`}
              >
                <Code2 className="h-3.5 w-3.5 text-primary" />
                <span style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.05em" }}>{lang}</span>
              </div>
            ))}
          </div>

          <div className="reveal-fade mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span className="font-medium">Compatible with KeyAuth client libraries</span>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="relative border-t py-24 lg:py-32" style={{ zIndex: 1 }}>
        {/* Scroll-parallax background blob */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          aria-hidden
        >
          <div
            className="rounded-full"
            style={{
              width: "60vw", height: "60vw",
              background: "radial-gradient(ellipse, rgba(102,0,255,0.10) 0%, transparent 68%)",
              transform: `translateY(${(scrollY - 2000) * 0.06}px)`,
              transition: "transform 0.05s linear",
            }}
          />
        </div>

        <div className="mx-auto max-w-6xl px-6" style={{ position: "relative" }}>
          <Card className="reveal-scale card-glow relative overflow-hidden p-12 text-center glass border-primary/20">
            {/* Inner glow gradient */}
            <div className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-br from-primary/6 via-transparent to-primary/6" aria-hidden />
            {/* Animated top border accent */}
            <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-primary/60 to-transparent" aria-hidden />

            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                Ready to Secure Your Software?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-muted-foreground font-medium">
                Join developers who trust KeyAuth Manager to protect and manage their
                applications.
              </p>
              <div className="mt-8">
                <a href="/register">
                  <Button
                    size="lg"
                    data-testid="button-cta-get-started"
                    className="btn-glow font-bold tracking-widest shadow-[0_0_28px_rgba(102,0,255,0.50)]"
                    style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
                  >
                    Get Started Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="border-t py-8" style={{ zIndex: 1, position: "relative" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-semibold tracking-wide" style={{ fontFamily: "Rajdhani, sans-serif" }}>KeyAuth Manager</span>
          </div>
          <span className="font-medium tracking-wide">Software Licensing Platform</span>
        </div>
      </footer>
    </div>
  );
}
