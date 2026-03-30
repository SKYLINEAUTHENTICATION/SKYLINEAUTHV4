import { useState } from "react";
import { Download, FolderOpen, Tag, Shield, ArrowLeft } from "lucide-react";
import logoPath from "@assets/skyline_1774905086386.png";

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  beta: "#f59e0b",
  deprecated: "#ef4444",
};

export default function PortalPage() {
  const [step, setStep] = useState<"login" | "files">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Invalid credentials"); return; }
      setFiles(data.files || []);
      setStep("files");
    } catch { setError("Connection error. Try again."); }
    finally { setIsLoading(false); }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#000",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 20,
      backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 60%)",
    }}>
      {step === "login" ? (
        <div className="skyline-glow-wrap" style={{ width: "100%", maxWidth: 400 }}>
          <div className="skyline-card" style={{ padding: "40px 28px 36px" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <img src={logoPath} alt="SKYLINE" style={{ width: 72, height: 72, borderRadius: "50%", marginBottom: 14, display: "block", margin: "0 auto 14px" }} />
              <span className="skyline-brand" style={{ display: "block", fontSize: 26, marginBottom: 4 }}>SKYLINE</span>
              <p style={{ margin: 0, fontSize: 12, color: "#4e3d6a" }}>User Portal — Access Your Files</p>
            </div>

            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600, display: "block", marginBottom: 6 }}>App Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your app username"
                  autoFocus
                  data-testid="input-portal-username"
                  style={{
                    width: "100%", padding: "10px 14px", boxSizing: "border-box",
                    background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)",
                    borderRadius: 8, color: "#fff", fontSize: 13, outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600, display: "block", marginBottom: 6 }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  data-testid="input-portal-password"
                  style={{
                    width: "100%", padding: "10px 14px", boxSizing: "border-box",
                    background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)",
                    borderRadius: 8, color: "#fff", fontSize: 13, outline: "none",
                  }}
                />
              </div>
              {error && <p style={{ margin: 0, fontSize: 12, color: "#ef4444", textAlign: "center" }}>{error}</p>}
              <button
                type="submit"
                disabled={isLoading || !username || !password}
                data-testid="button-portal-login"
                style={{
                  marginTop: 6, padding: "12px 0",
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                  border: "none", borderRadius: 8, color: "#fff",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 18px rgba(124,58,237,0.35)",
                  opacity: isLoading || !username || !password ? 0.6 : 1,
                }}
              >
                {isLoading ? "Authenticating..." : "Access Files"}
              </button>
            </form>
            <p style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#2a1a3e" }}>
              &copy; 2025 SKYLINE &mdash; Secure Auth Panel
            </p>
          </div>
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: 960 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <img src={logoPath} alt="SKYLINE" style={{ width: 44, height: 44, borderRadius: "50%" }} />
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "Rajdhani, sans-serif" }}>Your Files</h1>
                <p style={{ margin: 0, fontSize: 12, color: "#52525b" }}>Logged in as <span style={{ color: "#a78bfa" }}>{username}</span></p>
              </div>
            </div>
            <button onClick={() => setStep("login")} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)",
              borderRadius: 8, color: "#71717a", fontSize: 12, cursor: "pointer",
            }}>
              <ArrowLeft size={12} /> Sign Out
            </button>
          </div>

          {files.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#3f3f46" }}>
              <FolderOpen size={48} style={{ display: "block", margin: "0 auto 12px", opacity: 0.3 }} />
              <p>No files available yet</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
              {files.map((file: any) => (
                <div key={file.id} style={{
                  background: "linear-gradient(145deg, rgba(255,255,255,0.03), rgba(139,92,246,0.05))",
                  border: "1px solid rgba(139,92,246,0.2)", borderRadius: 16, padding: 22,
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(124,58,237,0.2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: "linear-gradient(135deg, #7c3aed, #4338ca)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
                    }}>
                      <FolderOpen size={18} style={{ color: "#fff" }} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>{file.name}</h3>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                        <Tag size={10} style={{ color: "#52525b" }} />
                        <span style={{ fontSize: 11, color: "#71717a" }}>v{file.version}</span>
                        <span style={{
                          fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 600,
                          background: `${STATUS_COLORS[file.status] || "#52525b"}20`,
                          color: STATUS_COLORS[file.status] || "#52525b",
                        }}>{file.status}</span>
                      </div>
                    </div>
                  </div>
                  {file.about && <p style={{ margin: "0 0 12px", fontSize: 12, color: "#71717a", lineHeight: 1.5 }}>{file.about}</p>}
                  <a
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "9px 0", borderRadius: 8, textDecoration: "none",
                      background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                      color: "#fff", fontSize: 12, fontWeight: 600,
                      boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
                    }}
                  >
                    <Download size={13} /> Download v{file.version}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
