import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { FolderOpen, Plus, Download, Trash2, X, ExternalLink, Tag, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  beta: "#f59e0b",
  deprecated: "#ef4444",
};

export default function FilesPage() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const { toast } = useToast();
  const canCreate = isSuperAdmin || isAdmin;
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "", version: "1.0.0", about: "", downloadUrl: "", changelog: "", status: "active",
  });

  const { data: files = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/files"],
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/files", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setForm({ name: "", version: "1.0.0", about: "", downloadUrl: "", changelog: "", status: "active" });
      setShowCreate(false);
      toast({ title: "File created" });
    },
    onError: () => toast({ title: "Failed to create file", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/files/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/files"] }),
  });

  const field = (key: string, label: string, opts?: any) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600, display: "block", marginBottom: 6 }}>{label}</label>
      {opts?.textarea ? (
        <textarea
          rows={3}
          value={(form as any)[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={opts?.placeholder}
          style={{
            width: "100%", padding: "10px 14px", boxSizing: "border-box",
            background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: 8, color: "#fff", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit",
          }}
        />
      ) : opts?.select ? (
        <select
          value={(form as any)[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          style={{
            width: "100%", padding: "10px 14px", boxSizing: "border-box",
            background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: 8, color: "#fff", fontSize: 13, outline: "none",
          }}
        >
          {opts.options.map((o: any) => <option key={o} value={o} style={{ background: "#0a0010" }}>{o}</option>)}
        </select>
      ) : (
        <input
          value={(form as any)[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={opts?.placeholder}
          style={{
            width: "100%", padding: "10px 14px", boxSizing: "border-box",
            background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: 8, color: "#fff", fontSize: 13, outline: "none",
          }}
        />
      )}
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", background: "#000", minHeight: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "Rajdhani, sans-serif" }}>Files</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#52525b" }}>App downloads and resources. Users can access via the portal.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/portal" target="_blank" rel="noopener noreferrer" style={{
            display: "flex", alignItems: "center", gap: 6, padding: "9px 16px",
            background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)",
            borderRadius: 9, color: "#a78bfa", fontSize: 12, fontWeight: 600, cursor: "pointer",
            textDecoration: "none",
          }}>
            <ExternalLink size={13} /> User Portal
          </a>
          {canCreate && (
            <button onClick={() => setShowCreate(true)} data-testid="button-new-file" style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
              background: "linear-gradient(135deg, #7c3aed, #6366f1)",
              border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer", boxShadow: "0 4px 20px rgba(124,58,237,0.4)", transition: "transform 0.15s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = ""}
            >
              <Plus size={15} /> Add File
            </button>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20,
        }}>
          <div style={{
            background: "linear-gradient(145deg, #0d0015, #0a0010)", border: "1px solid rgba(139,92,246,0.35)",
            borderRadius: 16, padding: 32, width: "100%", maxWidth: 560,
            boxShadow: "0 24px 80px rgba(124,58,237,0.3)", maxHeight: "90vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 700 }}>Add File</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer" }}><X size={18} /></button>
            </div>
            {field("name", "App Name", { placeholder: "e.g. SKYLINE Cheat" })}
            {field("version", "Version", { placeholder: "1.0.0" })}
            {field("status", "Status", { select: true, options: ["active", "beta", "deprecated"] })}
            {field("downloadUrl", "Download URL", { placeholder: "https://..." })}
            {field("about", "About", { textarea: true, placeholder: "Describe your app..." })}
            {field("changelog", "Changelog", { textarea: true, placeholder: "What's new in this version..." })}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={() => setShowCreate(false)} style={{
                padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.25)",
                background: "transparent", color: "#71717a", fontSize: 13, cursor: "pointer",
              }}>Cancel</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!form.name.trim() || !form.downloadUrl.trim() || createMutation.isPending}
                data-testid="button-submit-file"
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
                }}
              >
                {createMutation.isPending ? "Creating..." : "Create File"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div style={{ color: "#52525b", textAlign: "center", marginTop: 60 }}>Loading...</div>
      ) : files.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "80px 0",
          border: "1px solid rgba(139,92,246,0.1)", borderRadius: 16,
          background: "rgba(139,92,246,0.03)",
        }}>
          <FolderOpen size={48} style={{ color: "#27272a", margin: "0 auto 16px", display: "block" }} />
          <p style={{ color: "#3f3f46", fontSize: 15 }}>No files yet{canCreate ? " — add the first one" : ""}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {files.map((file: any) => (
            <div
              key={file.id}
              data-testid={`file-card-${file.id}`}
              style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.03), rgba(139,92,246,0.04))",
                border: "1px solid rgba(139,92,246,0.2)", borderRadius: 16, padding: 22,
                transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.transform = "translateY(-4px)";
                el.style.boxShadow = "0 16px 48px rgba(124,58,237,0.2)";
                el.style.borderColor = "rgba(139,92,246,0.45)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.transform = "";
                el.style.boxShadow = "none";
                el.style.borderColor = "rgba(139,92,246,0.2)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: "linear-gradient(135deg, #7c3aed, #4338ca)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
                  }}>
                    <FolderOpen size={18} style={{ color: "#fff" }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>{file.name}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <Tag size={10} style={{ color: "#52525b" }} />
                      <span style={{ fontSize: 11, color: "#71717a" }}>v{file.version}</span>
                      <span style={{
                        fontSize: 10, padding: "1px 6px", borderRadius: 4,
                        background: `${STATUS_COLORS[file.status] || "#52525b"}20`,
                        color: STATUS_COLORS[file.status] || "#52525b",
                        border: `1px solid ${STATUS_COLORS[file.status] || "#52525b"}40`,
                        fontWeight: 600,
                      }}>{file.status}</span>
                    </div>
                  </div>
                </div>
                {canCreate && (
                  <button
                    onClick={() => deleteMutation.mutate(file.id)}
                    data-testid={`button-delete-file-${file.id}`}
                    style={{
                      background: "transparent", border: "none", color: "#52525b",
                      cursor: "pointer", padding: 4, borderRadius: 4, transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "#52525b"}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {file.about && (
                <p style={{ margin: "0 0 14px", fontSize: 12, color: "#71717a", lineHeight: 1.5 }}>
                  {file.about.length > 100 ? file.about.slice(0, 100) + "..." : file.about}
                </p>
              )}

              {file.changelog && (
                <div style={{
                  padding: "8px 12px", borderRadius: 8, marginBottom: 14,
                  background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)",
                }}>
                  <p style={{ margin: "0 0 3px", fontSize: 10, color: "#6366f1", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Changelog</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#71717a", lineHeight: 1.5 }}>{file.changelog.slice(0, 80)}{file.changelog.length > 80 ? "..." : ""}</p>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#3f3f46" }}>
                  by {file.createdByUsername} · {new Date(file.createdAt).toLocaleDateString()}
                </span>
                <a
                  href={file.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`link-download-${file.id}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 8,
                    background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(99,102,241,0.3))",
                    border: "1px solid rgba(139,92,246,0.35)",
                    color: "#a78bfa", fontSize: 12, fontWeight: 600,
                    textDecoration: "none", transition: "all 0.2s",
                    boxShadow: "0 2px 8px rgba(124,58,237,0.2)",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "linear-gradient(135deg, rgba(124,58,237,0.6), rgba(99,102,241,0.5))"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(99,102,241,0.3))"}
                >
                  <Download size={12} /> Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
