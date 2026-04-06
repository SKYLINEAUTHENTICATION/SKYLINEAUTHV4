import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Megaphone, Plus, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AnnouncementsPage() {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: announcements = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/announcements"],
    refetchInterval: 15000,
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/announcements", { title, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setTitle(""); setContent(""); setShowCreate(false);
      toast({ title: "Announcement posted" });
    },
    onError: () => toast({ title: "Failed to post", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/announcements"] }),
  });

  return (
    <div style={{ padding: "28px 32px", background: "#000", minHeight: "100%", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "Rajdhani, sans-serif", letterSpacing: 1 }}>
            Announcements
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#52525b" }}>
            System-wide broadcasts from the administration
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            data-testid="button-new-announcement"
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
              background: "linear-gradient(135deg, #7c3aed, #6366f1)",
              border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer", boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(124,58,237,0.5)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,58,237,0.4)"; }}
          >
            <Plus size={15} /> New Announcement
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "linear-gradient(145deg, #0d0015, #0a0010)", border: "1px solid rgba(139,92,246,0.35)",
            borderRadius: 16, padding: 32, width: "100%", maxWidth: 540,
            boxShadow: "0 24px 80px rgba(124,58,237,0.3), 0 0 0 1px rgba(139,92,246,0.1)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>New Announcement</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600, letterSpacing: "0.5px" }}>Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title..."
                  data-testid="input-ann-title"
                  style={{
                    width: "100%", marginTop: 6, padding: "10px 14px",
                    background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)",
                    borderRadius: 8, color: "#fff", fontSize: 13, outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600, letterSpacing: "0.5px" }}>Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your announcement..."
                  rows={5}
                  data-testid="input-ann-content"
                  style={{
                    width: "100%", marginTop: 6, padding: "10px 14px",
                    background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)",
                    borderRadius: 8, color: "#fff", fontSize: 13, outline: "none", resize: "vertical",
                    fontFamily: "inherit", boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
                <button onClick={() => setShowCreate(false)} style={{
                  padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.25)",
                  background: "transparent", color: "#71717a", fontSize: 13, cursor: "pointer",
                }}>
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!title.trim() || !content.trim() || createMutation.isPending}
                  data-testid="button-submit-announcement"
                  style={{
                    padding: "9px 20px", borderRadius: 8, border: "none",
                    background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                    color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
                  }}
                >
                  {createMutation.isPending ? "Posting..." : "Post Announcement"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div style={{ color: "#52525b", textAlign: "center", marginTop: 60 }}>Loading...</div>
      ) : announcements.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "80px 0",
          border: "1px solid rgba(139,92,246,0.1)", borderRadius: 16,
          background: "rgba(139,92,246,0.03)",
        }}>
          <Megaphone size={48} style={{ color: "#27272a", margin: "0 auto 16px", display: "block" }} />
          <p style={{ color: "#3f3f46", fontSize: 15 }}>No announcements yet</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {announcements.map((ann: any, i: number) => (
            <div
              key={ann.id}
              data-testid={`announcement-${ann.id}`}
              style={{
                padding: "22px 26px",
                background: i === 0
                  ? "linear-gradient(145deg, rgba(124,58,237,0.12), rgba(99,102,241,0.06))"
                  : "rgba(255,255,255,0.02)",
                border: i === 0 ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(139,92,246,0.12)",
                borderRadius: 14,
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: i === 0 ? "0 8px 32px rgba(124,58,237,0.15)" : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    {i === 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                        background: "rgba(124,58,237,0.3)", color: "#a78bfa", letterSpacing: "0.5px",
                      }}>LATEST</span>
                    )}
                    <Megaphone size={14} style={{ color: "#a78bfa" }} />
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>{ann.title}</h2>
                  </div>
                  <p style={{ margin: "0 0 12px", fontSize: 14, color: "#a1a1aa", lineHeight: 1.6 }}>{ann.content}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    {ann.authorProfileImageUrl ? (
                      <img
                        src={ann.authorProfileImageUrl}
                        alt={ann.authorUsername}
                        style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(251,191,36,0.4)" }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%",
                        background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 8, fontWeight: 700, color: "#fff",
                      }}>{ann.authorUsername?.slice(0, 2).toUpperCase()}</div>
                    )}
                    <p style={{ margin: 0, fontSize: 11, color: "#3f3f46" }}>
                      Posted by <span style={{ color: "#fbbf24" }}>{ann.authorUsername}</span> &mdash; {new Date(ann.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {isSuperAdmin && (
                  <button
                    onClick={() => deleteMutation.mutate(ann.id)}
                    data-testid={`button-delete-ann-${ann.id}`}
                    style={{
                      background: "transparent", border: "none", color: "#52525b",
                      cursor: "pointer", padding: 6, borderRadius: 6, marginLeft: 12,
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "#52525b"}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
