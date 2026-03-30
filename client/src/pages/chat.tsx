import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { MessageCircle, Send, Globe, Lock } from "lucide-react";

const ROLE_COLOR: Record<string, string> = {
  superadmin: "#fbbf24",
  admin: "#a78bfa",
  reseller: "#60a5fa",
};

const ROLE_LABEL: Record<string, string> = {
  superadmin: "SA",
  admin: "ADM",
  reseller: "RSL",
};

export default function ChatPage() {
  const { user } = useAuth();
  const [activeContact, setActiveContact] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: contacts = [] } = useQuery<any[]>({
    queryKey: ["/api/chat/contacts"],
    refetchInterval: 5000,
  });

  const { data: messages = [] } = useQuery<any[]>({
    queryKey: ["/api/chat/messages", activeContact],
    queryFn: () =>
      fetch(`/api/chat/messages${activeContact ? `?with=${activeContact}` : ""}`, { credentials: "include" })
        .then((r) => r.json()),
    refetchInterval: 2500,
  });

  const sendMutation = useMutation({
    mutationFn: (msg: string) =>
      apiRequest("POST", "/api/chat/messages", {
        message: msg,
        recipientUsername: activeContact || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", activeContact] });
      setDraft("");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!draft.trim()) return;
    sendMutation.mutate(draft.trim());
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <div style={{ display: "flex", height: "calc(100vh - 52px)", background: "#000" }}>
      {/* Sidebar */}
      <div style={{
        width: 240, borderRight: "1px solid rgba(139,92,246,0.18)",
        background: "rgba(10,0,20,0.95)", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "16px 16px 10px", borderBottom: "1px solid rgba(139,92,246,0.12)" }}>
          <p style={{ fontSize: 11, color: "#52525b", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Channels</p>
          <button
            onClick={() => setActiveContact(null)}
            style={{
              width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 8, border: "none",
              background: !activeContact ? "rgba(139,92,246,0.15)" : "transparent",
              color: !activeContact ? "#a78bfa" : "#71717a", cursor: "pointer", fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s",
            }}
          >
            <Globe size={14} /> Global Chat
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "10px 10px" }}>
          <p style={{ fontSize: 11, color: "#52525b", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8, padding: "0 6px" }}>Direct Messages</p>
          {contacts.map((c: any) => (
            <button
              key={c.username}
              onClick={() => setActiveContact(c.username)}
              data-testid={`contact-${c.username}`}
              style={{
                width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 8, border: "none",
                background: activeContact === c.username ? "rgba(139,92,246,0.15)" : "transparent",
                color: activeContact === c.username ? "#a78bfa" : "#a1a1aa",
                cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                transition: "all 0.2s", marginBottom: 2,
              }}
              onMouseEnter={(e) => { if (activeContact !== c.username) e.currentTarget.style.background = "rgba(139,92,246,0.07)"; }}
              onMouseLeave={(e) => { if (activeContact !== c.username) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: "#fff",
              }}>{getInitials(c.username)}</div>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>{c.username}</p>
                <p style={{ margin: 0, fontSize: 10, color: ROLE_COLOR[c.role] || "#52525b" }}>{ROLE_LABEL[c.role] || c.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid rgba(139,92,246,0.18)",
          background: "rgba(10,0,20,0.9)", display: "flex", alignItems: "center", gap: 10,
        }}>
          {activeContact ? <Lock size={16} style={{ color: "#a78bfa" }} /> : <Globe size={16} style={{ color: "#a78bfa" }} />}
          <span style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>
            {activeContact ? `@${activeContact}` : "# global"}
          </span>
          <span style={{ fontSize: 11, color: "#52525b", marginLeft: 8 }}>
            {activeContact ? "Direct Message" : "Visible to everyone"}
          </span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "#3f3f46", marginTop: 40 }}>
              <MessageCircle size={48} style={{ opacity: 0.3, margin: "0 auto 12px", display: "block" }} />
              <p>No messages yet. Say hello!</p>
            </div>
          )}
          {messages.map((msg: any) => {
            const isMe = msg.senderUsername === user?.username;
            return (
              <div key={msg.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexDirection: isMe ? "row-reverse" : "row" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: isMe ? "linear-gradient(135deg, #7c3aed, #6366f1)" : "linear-gradient(135deg, #1e1b4b, #312e81)",
                  border: `2px solid ${ROLE_COLOR[msg.senderRole] || "#52525b"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "#fff",
                }}>{getInitials(msg.senderUsername)}</div>
                <div style={{ maxWidth: "65%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3, flexDirection: isMe ? "row-reverse" : "row" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: ROLE_COLOR[msg.senderRole] || "#a78bfa" }}>{msg.senderUsername}</span>
                    <span style={{ fontSize: 10, color: "#3f3f46" }}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div style={{
                    padding: "8px 14px", borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                    background: isMe ? "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(99,102,241,0.3))" : "rgba(255,255,255,0.05)",
                    border: isMe ? "1px solid rgba(139,92,246,0.35)" : "1px solid rgba(255,255,255,0.07)",
                    color: "#e4e4e7", fontSize: 13, lineHeight: 1.5,
                    boxShadow: isMe ? "0 4px 20px rgba(124,58,237,0.15)" : "0 2px 8px rgba(0,0,0,0.3)",
                  }}>{msg.message}</div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "12px 20px", borderTop: "1px solid rgba(139,92,246,0.18)",
          background: "rgba(10,0,20,0.9)",
        }}>
          <div style={{
            display: "flex", gap: 10, alignItems: "center",
            background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: 12, padding: "6px 8px 6px 14px",
          }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKey}
              placeholder={`Message ${activeContact ? `@${activeContact}` : "#global"}...`}
              data-testid="input-chat-message"
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#fff", fontSize: 13, padding: "6px 0",
              }}
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || sendMutation.isPending}
              data-testid="button-send-message"
              style={{
                width: 36, height: 36, borderRadius: 8, border: "none",
                background: draft.trim() ? "linear-gradient(135deg, #7c3aed, #6366f1)" : "rgba(139,92,246,0.2)",
                color: "#fff", cursor: draft.trim() ? "pointer" : "not-allowed", display: "flex",
                alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
                boxShadow: draft.trim() ? "0 4px 12px rgba(124,58,237,0.4)" : "none",
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
