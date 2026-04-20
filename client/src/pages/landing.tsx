import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TiltCard } from "@/components/tilt-card";
import {
  Shield, Key, Users, Zap, Lock, BarChart3,
  ArrowRight, CheckCircle, Code2, Globe,
} from "lucide-react";

/* ═══════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════ */

/** Smooth scroll Y via RAF — avoids jank on rapid scroll */
function useScrollY() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrollY(window.scrollY));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
  return scrollY;
}

/** Global mouse position (0–1) with RAF smoothing */
function useGlobalMouse() {
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  useEffect(() => {
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() =>
        setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight })
      );
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);
  return mouse;
}

/** Scroll-reveal via IntersectionObserver */
function useScrollReveal() {
  useEffect(() => {
    const sel = ".reveal-fade,.reveal-slide-up,.reveal-scale,.reveal-slide-left,.reveal-slide-right";
    const els = document.querySelectorAll(sel);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } }),
      { threshold: 0.08, rootMargin: "0px 0px -20px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ═══════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════ */

/** Twinkling starfield — 80 tiny dots, parallax-shifted by mouse */
function Starfield({ mx, my }: { mx: number; my: number }) {
  const stars = useMemo(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: (Math.sin(i * 137.508) * 0.5 + 0.5) * 100,   // golden angle distribution
      y: (Math.cos(i * 137.508) * 0.5 + 0.5) * 100,
      size: (Math.sin(i * 7.3) * 0.5 + 0.5) * 1.8 + 0.4,
      opacity: (Math.sin(i * 3.1) * 0.5 + 0.5) * 0.55 + 0.08,
      twinkle: (Math.sin(i * 2.7) * 0.5 + 0.5) * 5 + 2.5,
      delay: (Math.sin(i * 1.9) * 0.5 + 0.5) * 5,
      depth: (Math.sin(i * 4.3) * 0.5 + 0.5) * 0.08 + 0.01, // parallax depth factor
    })),
    []
  );

  const dx = (mx - 0.5) * 55;
  const dy = (my - 0.5) * 55;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {stars.map((s) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            left: `calc(${s.x}% + ${dx * s.depth}px)`,
            top:  `calc(${s.y}% + ${dy * s.depth}px)`,
            width: s.size, height: s.size,
            borderRadius: "50%",
            background: `rgba(200,160,255,${s.opacity})`,
            animation: `star-twinkle ${s.twinkle}s ease-in-out ${s.delay}s infinite`,
            transition: "left 0.35s ease-out, top 0.35s ease-out",
            willChange: "left, top",
          }}
        />
      ))}
    </div>
  );
}

/** Floating geometric rings — parallax-shifted, slowly breathing */
function FloatingRings({ mx, my, scrollY }: { mx: number; my: number; scrollY: number }) {
  const rings = [
    { w: 320, top: "8%",  left: "12%",  border: "rgba(102,0,255,0.28)", dur: "14s", depth: 0.55, scrollFactor: 0.18 },
    { w: 180, top: "18%", left: "72%",  border: "rgba(153,0,255,0.22)", dur: "19s", depth: 0.35, scrollFactor: 0.12 },
    { w: 240, top: "60%", left: "80%",  border: "rgba(80,0,200,0.20)",  dur: "22s", depth: 0.45, scrollFactor: 0.09 },
    { w: 140, top: "70%", left: "5%",   border: "rgba(200,50,255,0.18)",dur: "17s", depth: 0.25, scrollFactor: 0.15 },
    { w: 90,  top: "40%", left: "45%",  border: "rgba(130,0,255,0.35)", dur: "11s", depth: 0.70, scrollFactor: 0.06 },
    { w: 420, top: "30%", left: "-5%",  border: "rgba(60,0,180,0.14)",  dur: "28s", depth: 0.18, scrollFactor: 0.22 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {rings.map((r, i) => {
        const ox = (mx - 0.5) * 100 * r.depth;
        const oy = (my - 0.5) * 100 * r.depth - scrollY * r.scrollFactor;
        return (
          <div
            key={i}
            className="parallax-ring"
            style={{
              width: r.w, height: r.w,
              top:  `calc(${r.top} + ${oy}px)`,
              left: `calc(${r.left} + ${ox}px)`,
              borderColor: r.border,
              animationDuration: r.dur,
              transition: "top 0.22s ease-out, left 0.22s ease-out",
              willChange: "top, left",
            }}
          />
        );
      })}
    </div>
  );
}

/** 8-layer parallax orb background for the hero section */
function HeroBackground({ mx, my, scrollY }: { mx: number; my: number; scrollY: number }) {
  const dx = mx - 0.5;
  const dy = my - 0.5;

  /* Each layer: { color, alpha, size, cx, cy, mouseI, scrollI, trans } */
  const layers = [
    { bg: "153,0,255", a: 0.22, w: "90vw",  cx: "50%",  cy: "-5%",  mi: 220, si: 0.14, t: "0.35s" },
    { bg: "102,0,255", a: 0.16, w: "70vw",  cx: "15%",  cy: "10%",  mi: -160, si: -0.10, t: "0.28s" },
    { bg: "180,0,255", a: 0.14, w: "55vw",  cx: "80%",  cy: "20%",  mi: 120, si: 0.08, t: "0.22s" },
    { bg: "80,0,200",  a: 0.12, w: "40vw",  cx: "30%",  cy: "55%",  mi: -90, si: -0.06, t: "0.18s" },
    { bg: "220,80,255",a: 0.10, w: "30vw",  cx: "70%",  cy: "65%",  mi: 70,  si: 0.05, t: "0.15s" },
    { bg: "102,0,255", a: 0.08, w: "20vw",  cx: "10%",  cy: "40%",  mi: -50, si: -0.04, t: "0.12s" },
    { bg: "255,100,255",a:0.07, w: "14vw",  cx: "60%",  cy: "80%",  mi: 40,  si: 0.03, t: "0.10s" },
    { bg: "153,0,255", a: 0.05, w: "9vw",   cx: "40%",  cy: "30%",  mi: 30,  si: -0.02, t: "0.08s" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Animated drift grid — slowest layer */}
      <div
        className="absolute inset-0 bg-grid-animated opacity-50"
        style={{ transform: `translateY(${scrollY * 0.03}px)` }}
      />

      {/* Radial orb layers */}
      {layers.map((l, i) => {
        const ox = dx * l.mi;
        const oy = dy * l.mi + scrollY * l.si;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              borderRadius: "50%",
              width: l.w, height: l.w,
              top:  `calc(${l.cy} + ${oy}px)`,
              left: `calc(${l.cx} + ${ox}px)`,
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(ellipse, rgba(${l.bg},${l.a}) 0%, transparent 68%)`,
              transition: `top ${l.t} ease-out, left ${l.t} ease-out`,
              willChange: "top, left",
            }}
          />
        );
      })}

      {/* Bright center core glow */}
      <div
        style={{
          position: "absolute",
          width: "30vw", height: "30vw",
          top:  `calc(50% + ${dy * 25}px)`,
          left: `calc(50% + ${dx * 25}px)`,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(ellipse, rgba(120,0,255,0.10) 0%, transparent 60%)",
          borderRadius: "50%",
          transition: "top 0.08s ease-out, left 0.08s ease-out",
          willChange: "top, left",
        }}
      />

      {/* Gradient vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/3 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.18),_transparent_65%)]" />
    </div>
  );
}

/** Dense floating particles that bob and drift */
function Particles({ scrollY }: { scrollY: number }) {
  const particles = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: (Math.sin(i * 53.1) * 0.5 + 0.5) * 100,
      y: (Math.cos(i * 41.7) * 0.5 + 0.5) * 100,
      size: (Math.abs(Math.sin(i * 7.1)) * 0.5 + 0.5) * 6 + 2,
      dur:  (Math.abs(Math.sin(i * 3.3)) * 0.5 + 0.5) * 8 + 5,
      delay:(Math.abs(Math.sin(i * 2.1)) * 0.5 + 0.5) * 6,
      scrollRate: (Math.abs(Math.sin(i * 5.7)) * 0.5 + 0.5) * 0.12 + 0.04,
      alpha: (Math.abs(Math.sin(i * 8.2)) * 0.5 + 0.5) * 0.5 + 0.15,
    })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            width: p.size, height: p.size,
            borderRadius: "50%",
            left: `${p.x}%`,
            top:  `calc(${p.y}% - ${scrollY * p.scrollRate}px)`,
            background: `radial-gradient(circle, rgba(153,0,255,${p.alpha}) 0%, transparent 70%)`,
            animation: `float-particle ${p.dur}s ${p.delay}s ease-in-out infinite`,
            transition: "top 0.12s linear",
            willChange: "top",
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════ */
const features = [
  { icon: Shield,   title: "Application Security",  description: "Protect your software with industry-standard licensing. Prevent unauthorized access and piracy." },
  { icon: Key,      title: "License Management",     description: "Generate, distribute, and manage license keys with granular control over duration, levels, and limits." },
  { icon: Users,    title: "User Management",        description: "Track authenticated users, monitor sessions, ban abusers, and manage hardware ID locks." },
  { icon: Zap,      title: "Token System",           description: "Create single-use registration tokens for controlled user onboarding and track usage in real time." },
  { icon: Lock,     title: "HWID Locking",           description: "Bind licenses to specific hardware IDs. Prevent account sharing and enforce per-device policies." },
  { icon: BarChart3,title: "Analytics Dashboard",    description: "Real-time insights into usage, active users, license activations, and token redemptions." },
];

const languages = ["C#","C++","Java","Python","PHP","JavaScript","TypeScript","VB.Net","Rust","Go","Lua","Ruby","Perl"];

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */
export default function LandingPage() {
  useScrollReveal();
  const mouse = useGlobalMouse();
  const scrollY = useScrollY();

  const mx = mouse.x;
  const my = mouse.y;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" style={{ position: "relative" }}>

      {/* ── Global dot-grid depth layer ─────────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-dot-grid opacity-35"
        style={{ zIndex: 0, transform: `translateY(${scrollY * 0.025}px)` }}
      />

      {/* ── NAV ─────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b glass-strong" style={{ zIndex: 50 }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary shadow-[0_0_18px_rgba(102,0,255,0.7)]" style={{ animation: "stat-pulse 3s ease-in-out infinite" }}>
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="skyline-brand-sidebar" style={{ fontSize: 14 }}>KeyAuth Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/login">
              <Button variant="outline" data-testid="button-login" className="btn-glow font-semibold tracking-wide">Log In</Button>
            </a>
            <a href="/register">
              <Button data-testid="button-register" className="btn-glow font-bold tracking-wide shadow-[0_0_20px_rgba(102,0,255,0.45)]">Sign Up</Button>
            </a>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════
          HERO — full extreme parallax
          ══════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: "92vh", display: "flex", alignItems: "center", zIndex: 1 }}
      >
        {/* 8-layer orb background */}
        <HeroBackground mx={mx} my={my} scrollY={scrollY} />

        {/* Starfield */}
        <Starfield mx={mx} my={my} />

        {/* Floating rings */}
        <FloatingRings mx={mx} my={my} scrollY={scrollY} />

        {/* Dense particle layer */}
        <Particles scrollY={scrollY} />

        {/* Slow scan line */}
        <div className="scan-line" style={{ animationDelay: "1.5s" }} aria-hidden />

        {/* Content */}
        <div className="relative mx-auto max-w-6xl px-6 py-28 lg:py-36" style={{ zIndex: 10 }}>
          <div className="mx-auto max-w-3xl text-center">

            {/* Floating badge */}
            <div className="badge-bob reveal-fade mb-8 inline-flex items-center gap-2 rounded-full border bg-card/50 px-4 py-1.5 text-sm font-medium text-muted-foreground glass">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Software licensing made simple
            </div>

            {/* H1 — words at slightly different parallax depths */}
            <h1
              className="reveal-slide-up delay-1 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.01em" }}
            >
              {/* "Protect" — nearest plane */}
              <span
                className="depth-text-near inline-block"
                style={{ transform: `translateX(${(mx - 0.5) * -18}px) translateY(${(my - 0.5) * -10}px)`, transition: "transform 0.12s ease-out" }}
              >
                Protect
              </span>
              {" & "}
              {/* "Monetize" — mid plane */}
              <span
                className="depth-text-near inline-block"
                style={{ transform: `translateX(${(mx - 0.5) * -11}px) translateY(${(my - 0.5) * -6}px)`, transition: "transform 0.16s ease-out" }}
              >
                Monetize
              </span>

              {/* Second line — gradient, far plane */}
              <span
                className="block bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent mt-1"
                style={{
                  letterSpacing: "0.03em",
                  transform: `translateX(${(mx - 0.5) * -6}px) translateY(${(my - 0.5) * -3}px)`,
                  transition: "transform 0.22s ease-out",
                  display: "block",
                  filter: `drop-shadow(0 0 22px rgba(153,0,255,0.55))`,
                }}
              >
                Your Software
              </span>
            </h1>

            {/* Sub */}
            <p
              className="reveal-slide-up delay-2 mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground font-medium"
              style={{ transform: `translateY(${(my - 0.5) * -4}px)`, transition: "transform 0.20s ease-out" }}
            >
              The complete authentication and licensing platform for modern developers.
              Manage applications, licenses, users, and tokens from one powerful dashboard.
            </p>

            {/* CTAs */}
            <div className="reveal-slide-up delay-3 mt-10 flex flex-wrap items-center justify-center gap-4">
              <a href="/register">
                <Button
                  size="lg"
                  data-testid="button-get-started"
                  className="btn-glow font-bold tracking-widest shadow-[0_0_30px_rgba(102,0,255,0.55)]"
                  style={{ letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 15 }}
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href="#features">
                <Button size="lg" variant="outline" data-testid="button-learn-more" className="btn-glow font-semibold tracking-wide">
                  Learn More
                </Button>
              </a>
            </div>

            {/* Trust badges */}
            <div className="reveal-fade delay-4 mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              {["Free forever", "No credit card", "Unlimited apps"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 font-medium">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FEATURES — TiltCard grid with scroll parallax
          ══════════════════════════════════════════════ */}
      <section id="features" className="relative border-t py-24 lg:py-32" style={{ zIndex: 1 }}>
        {/* Background orb that parallax-scrolls */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            style={{
              position: "absolute",
              width: "80vw", height: "80vw",
              top: `calc(-20% - ${scrollY * 0.12}px)`,
              left: `calc(10% + ${(mx - 0.5) * 60}px)`,
              background: "radial-gradient(ellipse, rgba(102,0,255,0.08) 0%, transparent 65%)",
              borderRadius: "50%",
              transition: "left 0.18s ease-out",
            }}
          />
          <div
            className="absolute inset-0 bg-grid-animated opacity-35"
            style={{ transform: `translateY(${(scrollY - 800) * -0.04}px)` }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="reveal-fade section-label mb-4">Features</p>
            <h2 className="reveal-slide-up delay-1 text-3xl font-bold sm:text-4xl" style={{ fontFamily: "Rajdhani, sans-serif" }}>
              Everything You Need
            </h2>
            <p className="reveal-slide-up delay-2 mx-auto mt-4 max-w-xl text-muted-foreground font-medium">
              A complete toolkit for software licensing, authentication, and user management.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <TiltCard
                key={f.title}
                maxDeg={16}
                glowIntensity={0.22}
                className={`reveal-slide-up glass border border-border/60 rounded-lg p-6 group`}
                style={{ transitionDelay: `${i * 0.07}s` }}
              >
                <div className="relative z-10">
                  <div className="mb-4 inline-flex rounded-md bg-primary/10 p-2.5 transition-all duration-300 group-hover:bg-primary/22 group-hover:shadow-[0_0_18px_rgba(102,0,255,0.30)]">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 font-bold text-base" style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.05em" }}>
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          INTEGRATIONS — scroll-parallax section bg
          ══════════════════════════════════════════════ */}
      <section className="relative border-t py-24 lg:py-32" style={{ zIndex: 1 }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            style={{
              position: "absolute",
              width: "60vw", height: "60vw",
              bottom: `calc(-10% + ${(scrollY - 1800) * 0.08}px)`,
              right:  `calc(5%  + ${(mx - 0.5) * -50}px)`,
              background: "radial-gradient(ellipse, rgba(153,0,255,0.09) 0%, transparent 65%)",
              borderRadius: "50%",
              transition: "right 0.20s ease-out",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="reveal-fade section-label mb-4">Integrations</p>
            <h2 className="reveal-slide-up delay-1 text-3xl font-bold sm:text-4xl" style={{ fontFamily: "Rajdhani, sans-serif" }}>
              Works With Your Stack
            </h2>
            <p className="reveal-slide-up delay-2 mx-auto mt-4 max-w-xl text-muted-foreground font-medium">
              Native client API support for 13+ programming languages with code snippets ready to copy.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {languages.map((lang, i) => (
              <TiltCard
                key={lang}
                maxDeg={12}
                glowIntensity={0.18}
                className="reveal-scale glass border border-border/60 rounded-md p-3"
                style={{ transitionDelay: `${i * 0.04}s` }}
                data-testid={`lang-${lang.toLowerCase().replace(/[^a-z]/g,"")}`}
              >
                <div className="relative z-10 flex items-center justify-center gap-2 text-sm font-semibold">
                  <Code2 className="h-3.5 w-3.5 text-primary" />
                  <span style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.05em" }}>{lang}</span>
                </div>
              </TiltCard>
            ))}
          </div>

          <div className="reveal-fade mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span className="font-medium">Compatible with KeyAuth client libraries</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CTA — extreme centered parallax card
          ══════════════════════════════════════════════ */}
      <section className="relative border-t py-24 lg:py-32" style={{ zIndex: 1 }}>
        {/* Multi-layer CTA background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {[
            { w: "65vw", a: 0.13, mi: 55, si: 0.10, left: "50%", top: "50%" },
            { w: "40vw", a: 0.10, mi: -35, si: -0.07, left: "25%", top: "30%" },
            { w: "25vw", a: 0.08, mi: 22, si: 0.05, left: "75%", top: "70%" },
          ].map((o, i) => (
            <div key={i} style={{
              position: "absolute",
              width: o.w, height: o.w,
              borderRadius: "50%",
              left: `calc(${o.left} + ${(mx - 0.5) * o.mi}px)`,
              top:  `calc(${o.top}  + ${(my - 0.5) * o.mi + (scrollY - 2800) * o.si}px)`,
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(ellipse, rgba(102,0,255,${o.a}) 0%, transparent 65%)`,
              transition: "left 0.20s ease-out, top 0.20s ease-out",
            }} />
          ))}
        </div>

        <div className="relative mx-auto max-w-6xl px-6">
          <TiltCard
            maxDeg={10}
            glowIntensity={0.16}
            className="reveal-scale glass border border-primary/25 rounded-lg p-12 text-center overflow-hidden"
          >
            {/* Inner animated border accent top */}
            <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-primary/60 to-transparent" aria-hidden />
            {/* Inner animated border accent bottom */}
            <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent" aria-hidden />

            <div className="relative z-10">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                Ready to Secure Your Software?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-muted-foreground font-medium">
                Join developers who trust KeyAuth Manager to protect and manage their applications.
              </p>
              <div className="mt-8">
                <a href="/register">
                  <Button
                    size="lg"
                    data-testid="button-cta-get-started"
                    className="btn-glow font-bold tracking-widest shadow-[0_0_35px_rgba(102,0,255,0.58)]"
                    style={{ letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 15 }}
                  >
                    Get Started Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
          </TiltCard>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────── */}
      <footer className="border-t py-8" style={{ zIndex: 1, position: "relative" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-semibold tracking-wide" style={{ fontFamily: "Rajdhani, sans-serif" }}>KeyAuth Manager</span>
          </div>
          <span className="font-medium">Software Licensing Platform</span>
        </div>
      </footer>
    </div>
  );
}
