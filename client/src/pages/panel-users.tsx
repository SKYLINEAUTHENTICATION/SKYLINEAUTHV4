import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Trash2, Plus, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type PanelAccount = {
  id: string;
  username: string;
  role: string;
  email?: string | null;
  createdAt?: string;
};

const ROLE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  superadmin: { bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.35)", text: "#fbbf24", label: "Super Admin" },
  admin: { bg: "rgba(124,58,237,0.12)", border: "rgba(139,92,246,0.35)", text: "#a78bfa", label: "Admin" },
  reseller: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.35)", text: "#60a5fa", label: "Reseller" },
};

function RoleBadge({ role }: { role: string }) {
  const style = ROLE_COLORS[role] || ROLE_COLORS.admin;
  return (
    <span style={{
      background: style.bg,
      border: `1px solid ${style.border}`,
      color: style.text,
      borderRadius: 999,
      padding: "2px 10px",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.5px",
      textTransform: "uppercase",
    }}>
      {style.label}
    </span>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; role: string; email?: string }) => {
      const res = await fetch("/api/panel/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to create user");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/panel/users"] });
      toast({ title: "User created", description: `${username} has been created as ${role}.` });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>Username</label>
        <Input
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)", color: "#fff" }}
          data-testid="input-new-username"
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>Password</label>
        <Input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)", color: "#fff" }}
          data-testid="input-new-password"
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>Email (optional)</label>
        <Input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)", color: "#fff" }}
          data-testid="input-new-email"
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>Role</label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)", color: "#fff" }} data-testid="select-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="reseller">Reseller</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "1px solid rgba(139,92,246,0.25)", color: "#a1a1aa", borderRadius: 6, padding: "8px 18px", fontSize: 13, cursor: "pointer" }}
        >
          Cancel
        </button>
        <button
          onClick={() => createMutation.mutate({ username, password, role, email: email || undefined })}
          disabled={!username || !password || createMutation.isPending}
          style={{
            background: "linear-gradient(135deg, #7c3aed, #6366f1)",
            border: "none",
            color: "#fff",
            borderRadius: 6,
            padding: "8px 20px",
            fontSize: 13,
            fontWeight: 700,
            cursor: !username || !password ? "not-allowed" : "pointer",
            opacity: !username || !password ? 0.5 : 1,
          }}
          data-testid="button-create-user"
        >
          {createMutation.isPending ? "Creating..." : "Create User"}
        </button>
      </div>
    </div>
  );
}

export default function PanelUsersPage() {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const { data: panelUsers, isLoading } = useQuery<PanelAccount[]>({
    queryKey: ["/api/panel/users"],
    queryFn: async () => {
      const res = await fetch("/api/panel/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: isSuperAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/panel/users/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to delete");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/panel/users"] });
      toast({ title: "User deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await fetch(`/api/panel/users/${id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed");
      return json;
    },
    onSuccess: () => {
      toast({ title: "Password updated" });
      setResetId(null);
      setNewPassword("");
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: 28, color: "#a1a1aa", textAlign: "center" }}>
        <Shield size={40} style={{ margin: "0 auto 12px", color: "#52525b" }} />
        <p>Access denied. Super Admin only.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "0.5px" }}>Panel Users</h1>
          <p style={{ fontSize: 13, color: "#52525b", marginTop: 2 }}>Manage admins and resellers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              style={{
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                border: "none",
                color: "#fff",
                borderRadius: 8,
                padding: "9px 18px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 7,
                boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
              }}
              data-testid="button-add-user"
            >
              <Plus size={15} /> Add User
            </button>
          </DialogTrigger>
          <DialogContent style={{ background: "#0a0812", border: "1px solid rgba(139,92,246,0.3)", color: "#fff" }}>
            <DialogHeader>
              <DialogTitle style={{ color: "#c4b5fd" }}>Create Panel User</DialogTitle>
            </DialogHeader>
            <CreateUserModal onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div style={{
        background: "rgba(8,8,8,0.85)",
        border: "1px solid rgba(139,92,246,0.18)",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(139,92,246,0.18)" }}>
              {["Username", "Role", "Email", "Created", "Actions"].map((h) => (
                <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#52525b", textTransform: "uppercase", letterSpacing: "1px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ padding: 28, textAlign: "center", color: "#52525b" }}>Loading...</td>
              </tr>
            ) : !panelUsers?.length ? (
              <tr>
                <td colSpan={5} style={{ padding: 28, textAlign: "center", color: "#52525b" }}>No users found</td>
              </tr>
            ) : panelUsers.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: i < panelUsers.length - 1 ? "1px solid rgba(139,92,246,0.08)" : "none" }} data-testid={`row-user-${u.id}`}>
                <td style={{ padding: "13px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%",
                      background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
                    }}>
                      {u.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{u.username}</span>
                    {u.username === user?.username && (
                      <span style={{ fontSize: 10, color: "#52525b", background: "rgba(255,255,255,0.05)", borderRadius: 4, padding: "1px 6px" }}>You</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: "13px 18px" }}><RoleBadge role={u.role} /></td>
                <td style={{ padding: "13px 18px", fontSize: 13, color: "#a1a1aa" }}>{u.email || "—"}</td>
                <td style={{ padding: "13px 18px", fontSize: 12, color: "#52525b" }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                </td>
                <td style={{ padding: "13px 18px" }}>
                  {u.role !== "superadmin" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => { setResetId(u.id); setNewPassword(""); }}
                        style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
                        data-testid={`button-reset-pw-${u.id}`}
                      >
                        <Key size={12} /> Reset PW
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(u.id)}
                        style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
                        data-testid={`button-delete-${u.id}`}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resetId && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
        }}>
          <div style={{ background: "#0a0812", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 10, padding: 28, width: 340 }}>
            <h3 style={{ color: "#c4b5fd", fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Reset Password</h3>
            <Input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)", color: "#fff", marginBottom: 14 }}
              data-testid="input-reset-password"
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setResetId(null)} style={{ background: "transparent", border: "1px solid rgba(139,92,246,0.25)", color: "#a1a1aa", borderRadius: 6, padding: "7px 16px", cursor: "pointer", fontSize: 13 }}>
                Cancel
              </button>
              <button
                onClick={() => resetPasswordMutation.mutate({ id: resetId, password: newPassword })}
                disabled={!newPassword || resetPasswordMutation.isPending}
                style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)", border: "none", color: "#fff", borderRadius: 6, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                data-testid="button-confirm-reset"
              >
                {resetPasswordMutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
