import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import loginErrorSound from "@assets/login-error_1771588547644.mp3";
import loginSuccessSound from "@assets/ElevenLabs_2026_02_20T12_28_13_Gojo_Calm,_Clear_and_Measured_p_1771590685418.mp3";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const errorAudioRef = useRef<HTMLAudioElement | null>(null);
  const successAudioRef = useRef<HTMLAudioElement | null>(null);

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
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await new Promise((r) => setTimeout(r, 400));
      setLocation("/dashboard");
    } catch {
      playErrorSound();
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ background: "#000", minHeight: "100vh" }} className="flex flex-col items-center justify-center px-4">
      <div className="w-full" style={{ maxWidth: 370 }}>
        <div className="skyline-glow-wrap">
          <div className="skyline-card" style={{ padding: "40px 28px 36px" }}>
            <span className="skyline-brand" data-testid="text-brand">SKYLINE</span>
            <p style={{ textAlign: "center", fontSize: 12, color: "#4e3d6a", letterSpacing: "0.5px", marginBottom: 24, marginTop: 6 }}>
              Secure Auth Panel
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa", letterSpacing: "0.5px" }}>Username</label>
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
                <label style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa", letterSpacing: "0.5px" }}>Password</label>
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
                  padding: "11px 0",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  cursor: isLoading || !username.trim() || !password ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 18px rgba(124,58,237,0.35)",
                  transition: "opacity 0.2s",
                }}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 11, color: "#2a1a3e", marginTop: 22 }}>
              &copy; 2025 SKYLINE &mdash; Secure Auth Panel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
