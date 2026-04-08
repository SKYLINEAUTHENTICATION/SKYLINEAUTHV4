import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { User, Lock, LogIn } from "lucide-react";
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

  const orb1X = (mouse.x - 0.5) * -60;
  const orb1Y = (mouse.y - 0.5) * -60;
  const orb2X = (mouse.x - 0.5) * 40;
  const orb2Y = (mouse.y - 0.5) * 40;
  const cardTiltX = (mouse.y - 0.5) * -8;
  const cardTiltY = (mouse.x - 0.5) * 8;

  const canSubmit = !isLoading && username.trim() && password;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        background: "#000",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        padding: "0 16px",
      }}
    >
      {/* Parallax background orbs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{
          position: "absolute", width: "70vw", height: "70vw",
          top: `calc(-10% + ${orb1Y}px)`, left: `calc(20% + ${orb1X}px)`,
          background: "radial-gradient(ellipse, rgba(153,0,255,0.20) 0%, transparent 70%)",
          borderRadius: "50%",
          transition: "top 0.1s ease-out, left 0.1s ease-out",
          willChange: "top, left",
        }} />
        <div style={{
          position: "absolute", width: "50vw", height: "50vw",
          bottom: `calc(-5% + ${-orb2Y}px)`, right: `calc(5% + ${-orb2X}px)`,
          background: "radial-gradient(ellipse, rgba(102,0,255,0.14) 0%, transparent 70%)",
          borderRadius: "50%",
          transition: "bottom 0.15s ease-out, right 0.15s ease-out",
          willChange: "bottom, right",
        }} />
        <div style={{
          position: "absolute", width: "30vw", height: "30vw",
          top: `calc(60% + ${orb1Y * 0.4}px)`, left: `calc(5% + ${orb1X * 0.4}px)`,
          background: "radial-gradient(ellipse, rgba(170,0,255,0.08) 0%, transparent 70%)",
          borderRadius: "50%",
          transition: "top 0.2s ease-out, left 0.2s ease-out",
        }} />
      </div>

      {/* Post-login loading bar */}
      {showProgressBar && (
        <div className="login-progress-bar-track" data-testid="login-progress-bar">
          <div className="login-progress-bar-fill" />
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 370, position: "relative", zIndex: 1 }}>
        <div
          className="skyline-glow-wrap"
          style={{
            transform: `perspective(1000px) rotateX(${cardTiltX}deg) rotateY(${cardTiltY}deg)`,
            transition: "transform 0.15s ease-out",
            willChange: "transform",
          }}
        >
          <div className="skyline-card" style={{ padding: "40px 28px 36px" }}>

            {/* Logo */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <img
                src={logoPath}
                alt="SKYLINE"
                style={{
                  width: 90, height: 90, borderRadius: "50%",
                  objectFit: "cover",
                  boxShadow: "0 0 24px rgba(170,0,255,0.45), 0 0 8px rgba(124,58,237,0.4)",
                }}
              />
            </div>

            {/* Brand */}
            <span className="skyline-brand" data-testid="text-brand" style={{ marginBottom: 6 }}>
              SKYLINE
            </span>
            <p style={{
              textAlign: "center", fontSize: 12, color: "#4e3d6a",
              fontWeight: 400, letterSpacing: "0.5px", marginBottom: 28,
            }}>
              Authentication Management System
            </p>

            <form onSubmit={handleSubmit} autoComplete="off">
              {/* Username */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: "block", fontSize: 13, fontWeight: 700,
                  color: "#ffffff", marginBottom: 9, letterSpacing: "0.15px",
                }}>Username</label>
                <div className="login-inp-wrap">
                  <User size={14} style={{ color: "#4d2e99", flexShrink: 0, width: 16 }} />
                  <input
                    data-testid="input-username"
                    type="text"
                    placeholder="Enter admin username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                    autoComplete="username"
                    className="login-inp"
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: "block", fontSize: 13, fontWeight: 700,
                  color: "#ffffff", marginBottom: 9, letterSpacing: "0.15px",
                }}>Password</label>
                <div className="login-inp-wrap">
                  <Lock size={14} style={{ color: "#4d2e99", flexShrink: 0, width: 16 }} />
                  <input
                    data-testid="input-password"
                    type="password"
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="login-inp"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                data-testid="button-submit-login"
                className="login-btn"
                style={{
                  opacity: canSubmit ? 1 : 0.5,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                }}
              >
                <LogIn size={16} />
                <span>{isLoading ? "Signing in..." : "Sign In"}</span>
              </button>
            </form>

            <p style={{
              textAlign: "center", marginTop: 22, fontSize: 11,
              color: "#2e2350", letterSpacing: "0.3px",
            }}>
              &copy; 2025 SKYLINE &mdash; Secure Auth Panel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
