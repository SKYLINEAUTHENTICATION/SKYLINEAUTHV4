import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: any) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

function PasswordStrength({ password }: { password: string }) {
  const checks = useMemo(() => ({
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }), [password]);

  const passed = Object.values(checks).filter(Boolean).length;
  const percentage = (passed / 5) * 100;

  const barColor = passed <= 1 ? "#ef4444"
    : passed <= 2 ? "#f97316"
    : passed <= 3 ? "#eab308"
    : passed <= 4 ? "#3b82f6"
    : "#10b981";

  return (
    <div style={{ marginTop: 8 }} data-testid="password-strength">
      <div style={{ height: 3, background: "rgba(139,92,246,0.15)", borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ height: "100%", borderRadius: 2, background: barColor, width: `${percentage}%`, transition: "all 0.3s" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
        {[
          { key: "length", label: "12+ chars", met: checks.length },
          { key: "lowercase", label: "Lowercase", met: checks.lowercase },
          { key: "uppercase", label: "Uppercase", met: checks.uppercase },
          { key: "number", label: "Number", met: checks.number },
          { key: "symbol", label: "Symbol", met: checks.symbol },
        ].map((req) => (
          <div key={req.key} style={{ display: "flex", alignItems: "center", gap: 7 }} data-testid={`check-${req.key}`}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: req.met ? "#10b981" : "transparent",
              border: `1px solid ${req.met ? "#10b981" : "rgba(139,92,246,0.3)"}`,
              transition: "all 0.2s",
            }} />
            <span style={{ fontSize: 11, color: req.met ? "#c4b5fd" : "#52525b", transition: "color 0.2s" }}>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const turnstileWidgetId = useRef<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    if (document.getElementById("turnstile-script")) {
      if (window.turnstile) setTurnstileReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "turnstile-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
    script.async = true;
    window.onTurnstileLoad = () => setTurnstileReady(true);
    document.head.appendChild(script);
    return () => {
      delete window.onTurnstileLoad;
    };
  }, []);

  const renderTurnstile = useCallback(() => {
    if (!window.turnstile || !turnstileContainerRef.current || !TURNSTILE_SITE_KEY) return;
    if (turnstileWidgetId.current) {
      window.turnstile.remove(turnstileWidgetId.current);
    }
    turnstileContainerRef.current.innerHTML = "";
    setTurnstileToken(null);
    turnstileWidgetId.current = window.turnstile.render(turnstileContainerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
      callback: (token: string) => {
        setTurnstileToken(token);
      },
      "error-callback": () => setTurnstileToken(null),
      "expired-callback": () => setTurnstileToken(null),
    });
  }, []);

  useEffect(() => {
    if (showVerification && turnstileReady) {
      const timer = setTimeout(renderTurnstile, 100);
      return () => clearTimeout(timer);
    }
  }, [showVerification, turnstileReady, renderTurnstile]);

  useEffect(() => {
    if (showVerification && turnstileToken) {
      handleSubmit();
    }
  }, [turnstileToken, showVerification]);

  function handleRegisterClick(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) return;

    const hasLength = password.length >= 12;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    if (!hasLength || !hasUpper || !hasLower || !hasNumber || !hasSymbol) {
      toast({ title: "Weak password", description: "Password must meet all requirements.", variant: "destructive" });
      return;
    }

    if (!TURNSTILE_SITE_KEY) {
      handleSubmit();
      return;
    }
    setShowVerification(true);
  }

  async function handleSubmit() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/local/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          turnstileToken: turnstileToken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Registration failed", description: data.message, variant: "destructive" });
        setShowVerification(false);
        setTurnstileToken(null);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/dashboard");
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
      setShowVerification(false);
      setTurnstileToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  if (showVerification) {
    return (
      <div style={{ background: "#000" }} className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-8">
          <span className="skyline-brand" data-testid="text-brand-verify">SKYLINE</span>
          <p style={{ color: "#a1a1aa", fontSize: 13, letterSpacing: "0.5px", textAlign: "center" }}>
            Please wait while we validate your connection.
          </p>
          <div ref={turnstileContainerRef} data-testid="turnstile-widget" />
          <button
            style={{
              background: "rgba(124,58,237,0.15)",
              border: "1px solid rgba(139,92,246,0.3)",
              color: "#c4b5fd",
              borderRadius: 6,
              padding: "10px 28px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.5px",
            }}
            onClick={() => { setShowVerification(false); setTurnstileToken(null); }}
            data-testid="button-back-register"
          >
            Back to Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#000", minHeight: "100vh" }} className="flex flex-col items-center justify-center px-4">
      <div className="w-full" style={{ maxWidth: 370 }}>
        <div className="skyline-glow-wrap">
          <div className="skyline-card" style={{ padding: "40px 28px 36px" }}>
            <span className="skyline-brand" data-testid="text-brand">SKYLINE</span>
            <p style={{ textAlign: "center", fontSize: 12, color: "#4e3d6a", letterSpacing: "0.5px", marginBottom: 24, marginTop: 6 }}>
              Create your account
            </p>

            <form onSubmit={handleRegisterClick} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa", letterSpacing: "0.5px" }}>Username</label>
                <Input
                  data-testid="input-username"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)", color: "#fff", borderRadius: 6 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa", letterSpacing: "0.5px" }}>Email</label>
                <Input
                  data-testid="input-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)", color: "#fff", borderRadius: 6 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa", letterSpacing: "0.5px" }}>Password</label>
                <Input
                  data-testid="input-password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)", color: "#fff", borderRadius: 6 }}
                />
              </div>

              {password.length > 0 && <PasswordStrength password={password} />}

              <button
                type="submit"
                disabled={isLoading || !username.trim() || !email.trim() || !password}
                data-testid="button-submit-register"
                style={{
                  marginTop: 6,
                  background: isLoading || !username.trim() || !email.trim() || !password
                    ? "rgba(124,58,237,0.4)"
                    : "linear-gradient(135deg, #7c3aed, #6366f1)",
                  border: "none",
                  color: "#fff",
                  borderRadius: 6,
                  padding: "11px 0",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  cursor: isLoading || !username.trim() || !email.trim() || !password ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 18px rgba(124,58,237,0.35)",
                  transition: "opacity 0.2s",
                }}
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 13, color: "#4e3d6a", marginTop: 22 }}>
              Already have an account?{" "}
              <button
                onClick={() => setLocation("/login")}
                style={{ background: "none", border: "none", color: "#a78bfa", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                data-testid="link-login"
              >
                Sign in
              </button>
            </p>

            <p style={{ textAlign: "center", fontSize: 11, color: "#2a1a3e", marginTop: 18 }}>
              &copy; 2025 SKYLINE &mdash; Secure Auth Panel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
