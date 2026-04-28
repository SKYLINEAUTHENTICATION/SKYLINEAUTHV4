import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Trash2, Plus, Key, Wallet, Server, Plus as PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type PanelAccount = {
  id: string;
  username: string;
  role: string;
  email?: string | null;
  walletBalance?: number;
  createdAt?: string;
};

const ROLE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  superadmin: { bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.35)", text: "#fbbf24", label: "Super Admin" },
  admin: { bg: "rgba(102,0,255,0.12)", border: "rgba(102,0,255,0.35)", text: "#aa44ff", label: "Admin" },
  reseller: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.35)", text: "#60a5fa", label: "Reseller" },
  topclient: { bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.35)", text: "#ec4899", label: "Top Client" },
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
  const [wallet, setWallet] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; role: string; email?: string; walletBalance?: number }) => {
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
        <label style={{ fontSize: 12, fontWeight: 600, color: "#aa44ff" }}>Username</label>
        <Input
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ background: "rgba(102,0,255,0.08)", border: "1px solid rgba(102,0,255,0.25)", color: "#fff" }}
          data-testid="input-new-username"
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#aa44ff" }}>Password</label>
        <Input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ background: "rgba(102,0,255,0.08)", border: "1px solid rgba(102,0,255,0.25)", color: "#fff" }}
          data-testid="input-new-password"
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#aa44ff" }}>Email (optional)</label>
        <Input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ background: "rgba(102,0,255,0.08)", border: "1px solid rgba(102,0,255,0.25)", color: "#fff" }}
          data-testid="input-new-email"
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#aa44ff" }}>Role</label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger style={{ background: "rgba(102,0,255,0.08)", border: "1px solid rgba(102,0,255,0.25)", color: "#fff" }} data-testid="select-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="reseller">Reseller</SelectItem>
            <SelectItem value="topclient">Top Client</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {role === "topclient" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#ec4899", display: "flex", alignItems: "center", gap: 6 }}>
            <Wallet size={13} /> Wallet Amount (₹)
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 500"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.3)", color: "#fff" }}
            data-testid="input-wallet-amount"
          />
          <p style={{ fontSize: 11, color: "#71717a", margin: 0 }}>
            This client can spend up to ₹{Number(wallet || 0).toFixed(2)} on Instagram Followers orders.
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "1px solid rgba(102,0,255,0.25)", color: "#a1a1aa", borderRadius: 6, padding: "8px 18px", fontSize: 13, cursor: "pointer" }}
        >
          Cancel
        </button>
        <button
          onClick={() =>
            createMutation.mutate({
              username,
              password,
              role,
              email: email || undefined,
              walletBalance: role === "topclient" ? Number(wallet) || 0 : undefined,
            })
          }
          disabled={
            !username ||
            !password ||
            createMutation.isPending ||
            (role === "topclient" && (!wallet || Number(wallet) < 0))
          }
          style={{
            background: "linear-gradient(135deg, #6600ff, #7722ff)",
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
  const [walletEdit, setWalletEdit] = useState<{ id: string; current: number } | null>(null);
  const [walletAmount, setWalletAmount] = useState("");
  const [walletMode, setWalletMode] = useState<"set" | "add">("add");
  const [superTopupOpen, setSuperTopupOpen] = useState(false);
  const [superTopupAmount, setSuperTopupAmount] = useState("");
  const [superTopupMode, setSuperTopupMode] = useState<"set" | "add">("add");

  const { data: panelUsers, isLoading } = useQuery<PanelAccount[]>({
    queryKey: ["/api/panel/users"],
    queryFn: async () => {
      const res = await fetch("/api/panel/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: isSuperAdmin,
  });

  const { data: superWallet } = useQuery<{ walletBalance: number }>({
    queryKey: ["/api/panel/super-wallet"],
    queryFn: async () => {
      const res = await fetch("/api/panel/super-wallet", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load super wallet");
      return res.json();
    },
    enabled: isSuperAdmin,
  });

  const { data: apiBalance, isLoading: apiBalanceLoading, error: apiBalanceError } = useQuery<{ balance: number; currency: string }>({
    queryKey: ["/api/smm/api-balance"],
    queryFn: async () => {
      const res = await fetch("/api/smm/api-balance", { credentials: "include" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || "Failed to load API balance");
      }
      return res.json();
    },
    enabled: isSuperAdmin,
    refetchInterval: 60000,
  });

  const superTopupMutation = useMutation({
    mutationFn: async ({ mode, amount }: { mode: "set" | "add"; amount: number }) => {
      const res = await fetch("/api/panel/super-wallet", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode, amount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/panel/super-wallet"] });
      toast({ title: "Super wallet updated" });
      setSuperTopupOpen(false);
      setSuperTopupAmount("");
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/panel/users/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to delete");
      return json as { success: boolean; refunded?: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/panel/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/panel/super-wallet"] });
      const refunded = Number(data?.refunded) || 0;
      toast({
        title: "User deleted",
        description: refunded > 0 ? `₹${refunded.toFixed(2)} refunded to your wallet.` : undefined,
      });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const walletMutation = useMutation({
    mutationFn: async ({ id, mode, amount }: { id: string; mode: "set" | "add"; amount: number }) => {
      const res = await fetch(`/api/panel/users/${id}/wallet`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode, amount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/panel/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/panel/super-wallet"] });
      toast({ title: "Wallet updated" });
      setWalletEdit(null);
      setWalletAmount("");
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
      {/* Wallet overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 24 }}>
        {/* Super admin wallet */}
        <div style={{
          background: "linear-gradient(135deg, rgba(102,0,255,0.18), rgba(102,0,255,0.05))",
          border: "1px solid rgba(102,0,255,0.35)",
          borderRadius: 12,
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }} data-testid="card-super-wallet">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#c4b5fd", fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>
              <Wallet size={14} /> Super Admin Wallet
            </div>
            <button
              onClick={() => { setSuperTopupOpen(true); setSuperTopupAmount(""); setSuperTopupMode("add"); }}
              style={{
                background: "rgba(102,0,255,0.25)", border: "1px solid rgba(102,0,255,0.5)",
                color: "#c4b5fd", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              }}
              data-testid="button-super-topup"
            >
              <PlusIcon size={11} /> Top Up
            </button>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "Rajdhani, sans-serif" }} data-testid="text-super-wallet-balance">
            ₹{(Number(superWallet?.walletBalance) || 0).toFixed(2)}
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "#71717a" }}>
            Used to fund top client wallets. Deducted automatically.
          </p>
        </div>

        {/* API wallet (IndiansMMHub provider balance) */}
        <div style={{
          background: "linear-gradient(135deg, rgba(236,72,153,0.18), rgba(236,72,153,0.05))",
          border: "1px solid rgba(236,72,153,0.35)",
          borderRadius: 12,
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }} data-testid="card-api-wallet">
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f9a8d4", fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>
            <Server size={14} /> API Wallet (IndiansMMHub)
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "Rajdhani, sans-serif" }} data-testid="text-api-wallet-balance">
            {apiBalanceLoading
              ? "..."
              : apiBalanceError
                ? "—"
                : `${apiBalance?.currency === "INR" ? "₹" : (apiBalance?.currency || "")}${(Number(apiBalance?.balance) || 0).toFixed(2)}`}
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "#71717a" }}>
            {apiBalanceError
              ? (apiBalanceError as Error).message
              : "Live balance from IndiansMMHub. Used to fulfil orders."}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "0.5px" }}>Panel Users</h1>
          <p style={{ fontSize: 13, color: "#52525b", marginTop: 2 }}>Manage admins, resellers and top clients</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              style={{
                background: "linear-gradient(135deg, #6600ff, #7722ff)",
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
                boxShadow: "0 4px 14px rgba(102,0,255,0.35)",
              }}
              data-testid="button-add-user"
            >
              <Plus size={15} /> Add User
            </button>
          </DialogTrigger>
          <DialogContent style={{ background: "#0a0812", border: "1px solid rgba(102,0,255,0.3)", color: "#fff" }}>
            <DialogHeader>
              <DialogTitle style={{ color: "#c4b5fd" }}>Create Panel User</DialogTitle>
            </DialogHeader>
            <CreateUserModal onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div style={{
        background: "rgba(8,8,8,0.85)",
        border: "1px solid rgba(102,0,255,0.18)",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(102,0,255,0.18)" }}>
              {["Username", "Role", "Email", "Wallet", "Created", "Actions"].map((h) => (
                <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#52525b", textTransform: "uppercase", letterSpacing: "1px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ padding: 28, textAlign: "center", color: "#52525b" }}>Loading...</td>
              </tr>
            ) : !panelUsers?.length ? (
              <tr>
                <td colSpan={6} style={{ padding: 28, textAlign: "center", color: "#52525b" }}>No users found</td>
              </tr>
            ) : panelUsers.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: i < panelUsers.length - 1 ? "1px solid rgba(102,0,255,0.08)" : "none" }} data-testid={`row-user-${u.id}`}>
                <td style={{ padding: "13px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%",
                      background: "linear-gradient(135deg, #6600ff, #7722ff)",
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
                <td style={{ padding: "13px 18px", fontSize: 13, color: u.role === "topclient" ? "#ec4899" : "#52525b", fontWeight: u.role === "topclient" ? 700 : 400 }} data-testid={`text-wallet-${u.id}`}>
                  {u.role === "topclient" ? `₹${(Number(u.walletBalance) || 0).toFixed(2)}` : "—"}
                </td>
                <td style={{ padding: "13px 18px", fontSize: 12, color: "#52525b" }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                </td>
                <td style={{ padding: "13px 18px" }}>
                  {u.role !== "superadmin" && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {u.role === "topclient" && (
                        <button
                          onClick={() => {
                            setWalletEdit({ id: u.id, current: Number(u.walletBalance) || 0 });
                            setWalletAmount("");
                            setWalletMode("add");
                          }}
                          style={{ background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.3)", color: "#ec4899", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
                          data-testid={`button-wallet-${u.id}`}
                        >
                          <Wallet size={12} /> Wallet
                        </button>
                      )}
                      <button
                        onClick={() => { setResetId(u.id); setNewPassword(""); }}
                        style={{ background: "rgba(102,0,255,0.15)", border: "1px solid rgba(102,0,255,0.3)", color: "#aa44ff", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
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

      {walletEdit && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
        }}>
          <div style={{ background: "#0a0812", border: "1px solid rgba(236,72,153,0.3)", borderRadius: 10, padding: 28, width: 360 }}>
            <h3 style={{ color: "#f9a8d4", fontWeight: 700, marginBottom: 6, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
              <Wallet size={16} /> Manage Wallet
            </h3>
            <p style={{ fontSize: 12, color: "#71717a", margin: 0, marginBottom: 14 }}>
              Current balance: <span style={{ color: "#ec4899", fontWeight: 700 }}>₹{walletEdit.current.toFixed(2)}</span>
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => setWalletMode("add")}
                style={{
                  flex: 1, padding: "7px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: walletMode === "add" ? "rgba(236,72,153,0.2)" : "transparent",
                  border: `1px solid ${walletMode === "add" ? "rgba(236,72,153,0.5)" : "rgba(255,255,255,0.1)"}`,
                  color: walletMode === "add" ? "#ec4899" : "#71717a",
                }}
                data-testid="button-wallet-mode-add"
              >Add to balance</button>
              <button
                onClick={() => setWalletMode("set")}
                style={{
                  flex: 1, padding: "7px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: walletMode === "set" ? "rgba(236,72,153,0.2)" : "transparent",
                  border: `1px solid ${walletMode === "set" ? "rgba(236,72,153,0.5)" : "rgba(255,255,255,0.1)"}`,
                  color: walletMode === "set" ? "#ec4899" : "#71717a",
                }}
                data-testid="button-wallet-mode-set"
              >Set new balance</button>
            </div>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={walletMode === "add" ? "Amount to add (₹)" : "New balance (₹)"}
              value={walletAmount}
              onChange={(e) => setWalletAmount(e.target.value)}
              style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.3)", color: "#fff", marginBottom: 14 }}
              data-testid="input-wallet-edit"
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setWalletEdit(null)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#a1a1aa", borderRadius: 6, padding: "7px 16px", cursor: "pointer", fontSize: 13 }}>
                Cancel
              </button>
              <button
                onClick={() => walletMutation.mutate({ id: walletEdit.id, mode: walletMode, amount: Number(walletAmount) || 0 })}
                disabled={!walletAmount || walletMutation.isPending}
                style={{ background: "linear-gradient(135deg, #ec4899, #db2777)", border: "none", color: "#fff", borderRadius: 6, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: !walletAmount ? 0.5 : 1 }}
                data-testid="button-confirm-wallet"
              >
                {walletMutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {superTopupOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
        }}>
          <div style={{ background: "#0a0812", border: "1px solid rgba(102,0,255,0.3)", borderRadius: 10, padding: 28, width: 360 }}>
            <h3 style={{ color: "#c4b5fd", fontWeight: 700, marginBottom: 6, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
              <Wallet size={16} /> Super Admin Wallet
            </h3>
            <p style={{ fontSize: 12, color: "#71717a", margin: 0, marginBottom: 14 }}>
              Current balance: <span style={{ color: "#c4b5fd", fontWeight: 700 }}>₹{(Number(superWallet?.walletBalance) || 0).toFixed(2)}</span>
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => setSuperTopupMode("add")}
                style={{
                  flex: 1, padding: "7px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: superTopupMode === "add" ? "rgba(102,0,255,0.2)" : "transparent",
                  border: `1px solid ${superTopupMode === "add" ? "rgba(102,0,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                  color: superTopupMode === "add" ? "#c4b5fd" : "#71717a",
                }}
                data-testid="button-super-topup-mode-add"
              >Add to balance</button>
              <button
                onClick={() => setSuperTopupMode("set")}
                style={{
                  flex: 1, padding: "7px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: superTopupMode === "set" ? "rgba(102,0,255,0.2)" : "transparent",
                  border: `1px solid ${superTopupMode === "set" ? "rgba(102,0,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                  color: superTopupMode === "set" ? "#c4b5fd" : "#71717a",
                }}
                data-testid="button-super-topup-mode-set"
              >Set new balance</button>
            </div>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={superTopupMode === "add" ? "Amount to add (₹)" : "New balance (₹)"}
              value={superTopupAmount}
              onChange={(e) => setSuperTopupAmount(e.target.value)}
              style={{ background: "rgba(102,0,255,0.08)", border: "1px solid rgba(102,0,255,0.25)", color: "#fff", marginBottom: 14 }}
              data-testid="input-super-topup-amount"
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setSuperTopupOpen(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#a1a1aa", borderRadius: 6, padding: "7px 16px", cursor: "pointer", fontSize: 13 }}>
                Cancel
              </button>
              <button
                onClick={() => superTopupMutation.mutate({ mode: superTopupMode, amount: Number(superTopupAmount) || 0 })}
                disabled={!superTopupAmount || superTopupMutation.isPending}
                style={{ background: "linear-gradient(135deg, #6600ff, #7722ff)", border: "none", color: "#fff", borderRadius: 6, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: !superTopupAmount ? 0.5 : 1 }}
                data-testid="button-confirm-super-topup"
              >
                {superTopupMutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetId && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
        }}>
          <div style={{ background: "#0a0812", border: "1px solid rgba(102,0,255,0.3)", borderRadius: 10, padding: 28, width: 340 }}>
            <h3 style={{ color: "#c4b5fd", fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Reset Password</h3>
            <Input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ background: "rgba(102,0,255,0.08)", border: "1px solid rgba(102,0,255,0.25)", color: "#fff", marginBottom: 14 }}
              data-testid="input-reset-password"
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setResetId(null)} style={{ background: "transparent", border: "1px solid rgba(102,0,255,0.25)", color: "#a1a1aa", borderRadius: 6, padding: "7px 16px", cursor: "pointer", fontSize: 13 }}>
                Cancel
              </button>
              <button
                onClick={() => resetPasswordMutation.mutate({ id: resetId, password: newPassword })}
                disabled={!newPassword || resetPasswordMutation.isPending}
                style={{ background: "linear-gradient(135deg, #6600ff, #7722ff)", border: "none", color: "#fff", borderRadius: 6, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
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
