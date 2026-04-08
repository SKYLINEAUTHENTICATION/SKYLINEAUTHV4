import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import logoPath from "@assets/IMG_20260404_161801_895_1775474263643.webp";
import loginErrorSound from "@assets/login-error_1771588547644.mp3";
import loginSuccessSound from "@assets/ElevenLabs_2026_02_20T12_28_13_Gojo_Calm,_Clear_and_Measured_p_1771590685418.mp3";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const errorAudioRef = useRef<HTMLAudioElement | null>(null);
  const successAudioRef = useRef<HTMLAudioElement | null>(null);

  // Parallax state
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

  function playErrorSound() {
    try {
      if (!errorAudioRef.current) errorAudioRef.current = new Audio(loginErrorSound);
      errorAudioRef.current.currentTime = 0;
      errorAudioRef.current.play().catch(() => {});
    } catch {}
  }

  function playSuccessSound() {
    try {
      if (!successAudioRef.current) successAudioRef.current = new Audio(loginSuccessSound);
      successAudioRef.current.currentTime = 0;
      successAudioRef.current.play().catch(() => {});
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/local/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        playErrorSound();
        toast({ title: "Login failed", description: data.message, variant: "destructive" });
        return;
      }
      playSuccessSound();
      setShowProgressBar(true);
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await new Promise((r) => setTimeout(r, 1700));
      setLocation("/dashboard");
    } catch {
      playErrorSound();
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  // Parallax offsets for orbs and card tilt
  const orb1X = (mouse.x - 0.5) * -60;
  const orb1Y = (mouse.y - 0.5) * -60;
  const orb2X = (mouse.x - 0.5) * 40;
  const orb2Y = (mouse.y - 0.5) * 40;
  const cardTiltX = (mouse.y - 0.5) * -8;
  const cardTiltY = (mouse.x - 0.5) * 8;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        background: "#000",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
      className="flex flex-col items-center justify-center px-4"
    >
      {/* Parallax background orbs */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        transition: "none",
      }}>
        <div style={{
          position: "absolute", width: "70vw", height: "70vw",
          top: `calc(-10% + ${orb1Y}px)`, left: `calc(20% + ${orb1X}px)`,
          background: "radial-gradient(ellipse, rgba(124,58,237,0.22) 0%, transparent 70%)",
          borderRadius: "50%",
          transition: "top 0.1s ease-out, left 0.1s ease-out",
          willChange: "top, left",
        }} />
        <div style={{
          position: "absolute", width: "50vw", height: "50vw",
          bottom: `calc(-5% + ${-orb2Y}px)`, right: `calc(5% + ${-orb2X}px)`,
          background: "radial-gradient(ellipse, rgba(99,102,241,0.14) 0%, transparent 70%)",
          borderRadius: "50%",
          transition: "bottom 0.15s ease-out, right 0.15s ease-out",
          willChange: "bottom, right",
        }} />
        <div style={{
          position: "absolute", width: "30vw", height: "30vw",
          top: `calc(60% + ${orb1Y * 0.4}px)`, left: `calc(5% + ${orb1X * 0.4}px)`,
          background: "radial-gradient(ellipse, rgba(168,85,247,0.08) 0%, transparent 70%)",
          borderRadius: "50%",
          transition: "top 0.2s ease-out, left 0.2s ease-out",
        }} />
      </div>

      {/* Post-login horizontal loading bar */}
      {showProgressBar && (
        <div className="login-progress-bar-track" data-testid="login-progress-bar">
          <div className="login-progress-bar-fill" />
        </div>
      )}

      <div className="w-full" style={{ maxWidth: 380, position: "relative", zIndex: 1 }}>
        <div
          className="skyline-glow-wrap"
          style={{
            transform: `perspective(1000px) rotateX(${cardTiltX}deg) rotateY(${cardTiltY}deg)`,
            transition: "transform 0.15s ease-out",
            willChange: "transform",
          }}
        >
          <div className="skyline-card" style={{ padding: "40px 32px 36px" }}>

            {/* Logo + Brand */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                width: 88, height: 88, borderRadius: "50%",
                margin: "0 auto 18px",
                position: "relative",
                display: "inline-block",
              }}>
                <div style={{
                  position: "absolute", inset: -3, borderRadius: "50%",
                  background: "conic-gradient(from 0deg, #00bfff, #a855f7, #00bfff)",
                  animation: "spin 3s linear infinite",
                  zIndex: 0,
                  filter: "blur(1px) brightness(1.4)",
                  boxShadow: "0 0 20px rgba(139,92,246,0.70), 0 0 40px rgba(124,58,237,0.40)",
                }} />
                <img
                  src={logoPath}
                  alt="SKYLINE"
                  style={{
                    width: 88, height: 88, borderRadius: "50%",
                    objectFit: "cover", position: "relative", zIndex: 1,
                    boxShadow: "0 0 30px rgba(0,200,255,0.4), 0 0 16px rgba(124,58,237,0.70)",
                  }}
                />
              </div>
              <span className="skyline-brand" data-testid="text-brand" style={{ fontSize: "1.6rem", letterSpacing: 5 }}>SKYLINE AUTHENTICATION</span>
              <p style={{ textAlign: "center", fontSize: 12, color: "#4e3d6a", letterSpacing: "0.5px", marginTop: 5 }}>
                Secure Auth Panel
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{
                  fontSize: 12, fontWeight: 600, color: "#a78bfa", letterSpacing: "0.5px",
                  textShadow: "0 0 8px rgba(167,139,250,0.70), 0 0 16px rgba(167,139,250,0.40)",
                }}>Username</label>
                <Input
                  data-testid="input-username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)", color: "#fff", borderRadius: 6 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{
                  fontSize: 12, fontWeight: 600, color: "#a78bfa", letterSpacing: "0.5px",
                  textShadow: "0 0 8px rgba(167,139,250,0.70), 0 0 16px rgba(167,139,250,0.40)",
                }}>Password</label>
                <Input
                  data-testid="input-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)", color: "#fff", borderRadius: 6 }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !username.trim() || !password}
                data-testid="button-submit-login"
                style={{
                  marginTop: 6,
                  background: isLoading || !username.trim() || !password
                    ? "rgba(124,58,237,0.4)"
                    : "linear-gradient(135deg, #7c3aed, #6366f1)",
                  border: "none",
                  color: "#fff",
                  borderRadius: 6,
                  padding: "12px 0",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  cursor: isLoading || !username.trim() || !password ? "not-allowed" : "pointer",
                  boxShadow: isLoading || !username.trim() || !password
                    ? "none"
                    : "0 0 18px rgba(139,92,246,0.70), 0 0 36px rgba(124,58,237,0.40), 0 4px 18px rgba(124,58,237,0.35)",
                  transition: "opacity 0.2s, transform 0.15s, box-shadow 0.2s",
                  transform: "perspective(400px) translateZ(2px)",
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = "perspective(400px) translateZ(4px) translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 0 24px rgba(139,92,246,0.80), 0 0 50px rgba(124,58,237,0.50), 0 6px 24px rgba(124,58,237,0.45)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "perspective(400px) translateZ(2px)";
                  e.currentTarget.style.boxShadow = isLoading || !username.trim() || !password
                    ? "none"
                    : "0 0 18px rgba(139,92,246,0.70), 0 0 36px rgba(124,58,237,0.40), 0 4px 18px rgba(124,58,237,0.35)";
                }}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 11, color: "#2a1a3e", marginTop: 22 }}>
              &copy; 2025 SKYLINE AUTHENTICATION &mdash; Secure Auth Panel
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
