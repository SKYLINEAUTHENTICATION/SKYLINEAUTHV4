import { useState, useEffect, useRef } from "react";
import { Download, FolderOpen, Tag, Megaphone, MessageSquare, LogOut, Send, RefreshCw } from "lucide-react";
import logoPath from "@assets/skyline_1774963364030.png";

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  beta: "#f59e0b",
  deprecated: "#ef4444",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", boxSizing: "border-box",
  background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)",
  borderRadius: 8, color: "#fff", fontSize: 13, outline: "none",
};

type Tab = "files" | "announcements" | "chat";

export default function PortalPage() {
  const [step, setStep] = useState<"login" | "portal">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loggedInAs, setLoggedInAs] = useState("");
  const [tab, setTab] = useState<Tab>("files");

  const [files, setFiles] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkExistingSession();
  }, []);

  useEffect(() => {
    if (step === "portal") {
      if (tab === "files") fetchFiles();
      if (tab === "announcements") fetchAnnouncements();
      if (tab === "chat") fetchChat();
    }
  }, [tab, step]);

  useEffect(() => {
    if (tab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  async function checkExistingSession() {
    try {
      const res = await fetch("/api/portal/me");
      if (res.ok) {
        const data = await res.json();
        setLoggedInAs(data.username);
        setStep("portal");
        fetchFiles();
      }
    } catch {}
  }

  async function fetchFiles() {
    try {
      const res = await fetch("/api/portal/files");
      if (res.ok) setFiles(await res.json());
    } catch {}
  }

  async function fetchAnnouncements() {
    try {
      const res = await fetch("/api/portal/announcements");
      if (res.ok) setAnnouncements(await res.json());
    } catch {}
  }

  async function fetchChat() {
    try {
      const res = await fetch("/api/portal/chat");
      if (res.ok) setChatMessages(await res.json());
    } catch {}
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.message || "Invalid credentials"); return; }
      setLoggedInAs(data.username);
      setFiles(data.files || []);
      setStep("portal");
      setTab("files");
    } catch { setLoginError("Connection error. Try again."); }
    finally { setIsLoading(false); }
  }

  async function handleLogout() {
    await fetch("/api/portal/logout", { method: "POST" });
    setStep("login");
    setLoggedInAs("");
    setUsername("");
    setPassword("");
    setFiles([]);
    setAnnouncements([]);
    setChatMessages([]);
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    if (tab === "files") await fetchFiles();
    if (tab === "announcements") await fetchAnnouncements();
    if (tab === "chat") await fetchChat();
    setIsRefreshing(false);
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setIsSendingChat(true);
    try {
      const res = await fetch("/api/portal/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatInput.trim() }),
      });
      if (res.ok) {
        const msg = await res.json();
        setChatMessages((prev) => [...prev, msg]);
        setChatInput("");
      }
    } catch {}
    finally { setIsSendingChat(false); }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "files", label: "Files", icon: <FolderOpen size={15} /> },
    { id: "announcements", label: "Announcements", icon: <Megaphone size={15} /> },
    { id: "chat", label: "Chat", icon: <MessageSquare size={15} /> },
  ];

  if (step === "login") {
    return (
      <div style={{
        minHeight: "100vh", background: "#000",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: 20,
        backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 60%)",
      }}>
        <div className="skyline-glow-wrap" style={{ width: "100%", maxWidth: 400 }}>
          <div className="skyline-card" style={{ padding: "40px 28px 36px" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <img src={logoPath} alt="SKYLINE" style={{ width: 72, height: 72, borderRadius: "50%", marginBottom: 14, display: "block", margin: "0 auto 14px" }} />
              <span className="skyline-brand" style={{ display: "block", fontSize: 18, marginBottom: 4, letterSpacing: 3 }}>SKYLINE AUTHENTICATION</span>
              <p style={{ margin: 0, fontSize: 12, color: "#4e3d6a" }}>User Portal — Files, Announcements & Chat</p>
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
                  style={inputStyle}
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
                  style={inputStyle}
                />
              </div>
              {loginError && <p style={{ margin: 0, fontSize: 12, color: "#ef4444", textAlign: "center" }}>{loginError}</p>}
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
                {isLoading ? "Authenticating..." : "Sign In"}
              </button>
            </form>
            <p style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#2a1a3e" }}>
              &copy; 2025 SKYLINE AUTHENTICATION &mdash; Secure Auth Panel
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#000",
      backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 55%)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px",
        background: "rgba(0,0,0,0.85)",
        borderBottom: "1px solid rgba(139,92,246,0.18)",
        backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logoPath} alt="SKYLINE" style={{ width: 36, height: 36, borderRadius: "50%" }} />
          <div>
            <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 800, fontSize: 16, color: "#fff", letterSpacing: 2 }}>SKYLINE</span>
            <span style={{ display: "block", fontSize: 10, color: "#52525b" }}>Logged in as <span style={{ color: "#a78bfa" }}>{loggedInAs}</span></span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            data-testid="button-portal-refresh"
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "7px 12px",
              background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: 8, color: "#71717a", fontSize: 12, cursor: "pointer",
              opacity: isRefreshing ? 0.5 : 1,
            }}
          >
            <RefreshCw size={12} style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }} />
          </button>
          <button
            onClick={handleLogout}
            data-testid="button-portal-logout"
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "7px 12px",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 8, color: "#f87171", fontSize: 12, cursor: "pointer",
            }}
          >
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 0,
        borderBottom: "1px solid rgba(139,92,246,0.15)",
        padding: "0 28px",
        background: "rgba(0,0,0,0.5)",
      }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-testid={`tab-portal-${t.id}`}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "12px 18px",
              background: "none", border: "none",
              borderBottom: tab === t.id ? "2px solid #7c3aed" : "2px solid transparent",
              color: tab === t.id ? "#a78bfa" : "#52525b",
              fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
              cursor: "pointer", transition: "color 0.15s",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main style={{ flex: 1, padding: "28px", maxWidth: 1000, margin: "0 auto", width: "100%" }}>

        {/* FILES TAB */}
        {tab === "files" && (
          files.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#3f3f46" }}>
              <FolderOpen size={48} style={{ display: "block", margin: "0 auto 12px", opacity: 0.3 }} />
              <p>No files available yet</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
              {files.map((file: any) => (
                <div key={file.id} data-testid={`card-file-${file.id}`} style={{
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
                      flexShrink: 0,
                    }}>
                      <FolderOpen size={18} style={{ color: "#fff" }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</h3>
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
                    data-testid={`link-download-${file.id}`}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "9px 0", borderRadius: 8, textDecoration: "none",
                      background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                      color: "#fff", fontSize: 12, fontWeight: 600,
                    }}
                  >
                    <Download size={13} /> Download v{file.version}
                  </a>
                </div>
              ))}
            </div>
          )
        )}

        {/* ANNOUNCEMENTS TAB */}
        {tab === "announcements" && (
          announcements.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#3f3f46" }}>
              <Megaphone size={48} style={{ display: "block", margin: "0 auto 12px", opacity: 0.3 }} />
              <p>No announcements yet</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {announcements.map((ann: any) => (
                <div key={ann.id} data-testid={`card-announcement-${ann.id}`} style={{
                  background: "linear-gradient(145deg, rgba(255,255,255,0.02), rgba(139,92,246,0.06))",
                  border: "1px solid rgba(139,92,246,0.18)", borderRadius: 14, padding: "20px 24px",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{ann.title}</h3>
                    <span style={{ fontSize: 11, color: "#52525b", flexShrink: 0 }}>{formatDate(ann.createdAt)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#71717a", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{ann.content}</p>
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 99,
                      background: "rgba(124,58,237,0.15)", color: "#a78bfa", fontWeight: 600,
                    }}>by {ann.authorUsername}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* CHAT TAB */}
        {tab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)", minHeight: 400 }}>
            <div style={{
              flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10,
              marginBottom: 16, paddingRight: 4,
            }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 0", color: "#3f3f46" }}>
                  <MessageSquare size={48} style={{ display: "block", margin: "0 auto 12px", opacity: 0.3 }} />
                  <p>No messages yet. Be the first to say something!</p>
                </div>
              ) : (
                chatMessages.map((msg: any) => {
                  const isOwn = msg.senderUsername === loggedInAs;
                  const roleColor: Record<string, string> = {
                    superadmin: "#a78bfa",
                    admin: "#60a5fa",
                    reseller: "#34d399",
                    user: "#f59e0b",
                  };
                  return (
                    <div key={msg.id} data-testid={`msg-chat-${msg.id}`} style={{
                      display: "flex", flexDirection: "column",
                      alignItems: isOwn ? "flex-end" : "flex-start",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: roleColor[msg.senderRole] || "#a78bfa" }}>
                          {msg.senderUsername}
                        </span>
                        <span style={{
                          fontSize: 9, padding: "1px 5px", borderRadius: 4, fontWeight: 600,
                          background: `${roleColor[msg.senderRole] || "#a78bfa"}20`,
                          color: roleColor[msg.senderRole] || "#a78bfa",
                          textTransform: "uppercase",
                        }}>{msg.senderRole}</span>
                        <span style={{ fontSize: 10, color: "#3f3f46" }}>{formatDate(msg.createdAt)}</span>
                      </div>
                      <div style={{
                        maxWidth: "72%", padding: "9px 14px", borderRadius: isOwn ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        background: isOwn
                          ? "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(99,102,241,0.25))"
                          : "rgba(255,255,255,0.05)",
                        border: isOwn ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(255,255,255,0.07)",
                        fontSize: 13, color: "#e2e8f0", lineHeight: 1.5, wordBreak: "break-word",
                      }}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendChat} style={{ display: "flex", gap: 10 }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                data-testid="input-chat-message"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="submit"
                disabled={isSendingChat || !chatInput.trim()}
                data-testid="button-chat-send"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 18px", flexShrink: 0,
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                  border: "none", borderRadius: 8, color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  opacity: isSendingChat || !chatInput.trim() ? 0.5 : 1,
                }}
              >
                <Send size={14} /> Send
              </button>
            </form>
          </div>
        )}
      </main>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
