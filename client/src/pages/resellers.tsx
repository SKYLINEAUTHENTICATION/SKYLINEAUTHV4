import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Users, Plus, Coins, X, Clock, ShieldCheck, ShieldOff, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PLANS = [
  { label: "5 Days", days: 5, credits: 0.5 },
  { label: "10 Days", days: 10, credits: 1 },
  { label: "20 Days", days: 20, credits: 2 },
  { label: "30 Days", days: 30, credits: 4 },
];

const EXPIRY_OPTIONS = [
  { label: "5 Days", value: 5 },
  { label: "10 Days", value: 10 },
  { label: "20 Days", value: 20 },
  { label: "30 Days", value: 30 },
  { label: "60 Days", value: 60 },
  { label: "90 Days", value: 90 },
  { label: "No Expiry", value: 0 },
];

function formatDate(d: string | null | undefined) {
  if (!d) return "No expiry";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadge(status: string) {
  const isExpired = status === "expired";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px",
      borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: isExpired ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
      border: `1px solid ${isExpired ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
      color: isExpired ? "#ef4444" : "#22c55e",
    }}>
      {isExpired ? <ShieldOff size={9} /> : <ShieldCheck size={9} />}
      {isExpired ? "Expired" : "Active"}
    </span>
  );
}

const inputStyle = {
  width: "100%", marginTop: 6, padding: "10px 14px", boxSizing: "border-box" as const,
  background: "rgba(102,0,255,0.08)", border: "1px solid rgba(102,0,255,0.25)",
  borderRadius: 8, color: "#fff", fontSize: 13, outline: "none",
};

export default function ResellersPage() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showCredits, setShowCredits] = useState<any>(null);
  const [showExpiry, setShowExpiry] = useState<any>(null);
  const [form, setForm] = useState({ username: "", password: "", credits: 0, expiryDays: 30 });
  const [creditAmount, setCreditAmount] = useState(0);
  const [expiryDays, setExpiryDays] = useState(30);

  const canManage = isSuperAdmin || isAdmin;

  const { data: resellers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/resellers"],
    enabled: canManage,
  });

  const { data: myCredits } = useQuery<{ credits: number; expiryDate: string | null; status: string }>({
    queryKey: ["/api/resellers/me"],
    enabled: user?.role === "reseller",
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/resellers", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers"] });
      setForm({ username: "", password: "", credits: 0, expiryDays: 30 }); setShowCreate(false);
      toast({ title: "Reseller created successfully" });
    },
    onError: (err: any) => toast({ title: "Failed to create reseller", description: err.message, variant: "destructive" }),
  });

  const addCreditsMutation = useMutation({
    mutationFn: ({ id, amount }: any) => apiRequest("POST", `/api/resellers/${id}/credits`, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers"] });
      setShowCredits(null); setCreditAmount(0);
      toast({ title: "Credits updated" });
    },
    onError: () => toast({ title: "Failed to update credits", variant: "destructive" }),
  });

  const updateExpiryMutation = useMutation({
    mutationFn: ({ id, days }: any) => apiRequest("PATCH", `/api/resellers/${id}/expiry`, { expiryDays: days }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers"] });
      setShowExpiry(null);
      toast({ title: "Expiry updated" });
    },
    onError: () => toast({ title: "Failed to update expiry", variant: "destructive" }),
  });

  const modalStyle = {
    position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  };
  const cardStyle = {
    background: "linear-gradient(145deg, #0d0015, #0a0010)", border: "1px solid rgba(102,0,255,0.35)",
    borderRadius: 16, padding: 32, width: "100%", maxWidth: 480,
    boxShadow: "0 24px 80px rgba(102,0,255,0.3)",
  };

  if (user?.role === "reseller") {
    const isExpired = myCredits?.status === "expired";
    const expiryDate = myCredits?.expiryDate;
    const daysLeft = expiryDate ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000) : null;

    return (
      <div style={{ padding: "28px 32px", background: "#000", minHeight: "100%" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "Inter, sans-serif" }}>My Reseller Account</h1>
        <p style={{ margin: "0 0 32px", fontSize: 13, color: "#52525b" }}>Your credit balance and account status</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 760, marginBottom: 32 }}>
          <div style={{
            padding: 28, borderRadius: 20,
            background: "linear-gradient(145deg, rgba(102,0,255,0.18), rgba(99,102,241,0.08))",
            border: "1px solid rgba(102,0,255,0.4)",
            boxShadow: "0 16px 60px rgba(102,0,255,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Coins size={20} style={{ color: "#fbbf24" }} />
              <p style={{ margin: 0, fontSize: 12, color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Credits Balance</p>
            </div>
            <p style={{ margin: 0, fontSize: 56, fontWeight: 800, color: "#fff", fontFamily: "Inter, sans-serif", lineHeight: 1 }} data-testid="text-my-credits">
              {typeof myCredits?.credits === "number" ? myCredits.credits.toFixed(1) : "0.0"}
            </p>
          </div>

          <div style={{
            padding: 28, borderRadius: 20,
            background: isExpired ? "linear-gradient(145deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))" : "linear-gradient(145deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05))",
            border: `1px solid ${isExpired ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <CalendarDays size={20} style={{ color: isExpired ? "#ef4444" : "#22c55e" }} />
              <p style={{ margin: 0, fontSize: 12, color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Account Status</p>
            </div>
            <p style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: isExpired ? "#ef4444" : "#22c55e", fontFamily: "Inter, sans-serif" }}>
              {isExpired ? "EXPIRED" : "ACTIVE"}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#52525b" }}>
              {expiryDate ? (isExpired ? `Expired ${formatDate(expiryDate)}` : `Expires ${formatDate(expiryDate)} (${daysLeft}d left)`) : "No expiry set"}
            </p>
          </div>
        </div>

        <div style={{
          padding: 24, borderRadius: 16, maxWidth: 760,
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(102,0,255,0.15)",
        }}>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "#52525b", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>License Plans</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {PLANS.map((p) => (
              <div key={p.days} style={{
                padding: "14px 16px", borderRadius: 12,
                background: "rgba(102,0,255,0.12)", border: "1px solid rgba(102,0,255,0.3)",
                textAlign: "center",
              }}>
                <p style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "Inter, sans-serif" }}>{p.label}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <Coins size={12} style={{ color: "#fbbf24" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24" }}>{p.credits} credit{p.credits !== 1 ? "s" : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", background: "#000", minHeight: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "Inter, sans-serif" }}>Resellers</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#52525b" }}>Manage reseller accounts, credits and expiry</p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)} data-testid="button-new-reseller" style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
            background: "linear-gradient(135deg, #6600ff, #7722ff)",
            border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", boxShadow: "0 4px 20px rgba(102,0,255,0.4)",
            transition: "transform 0.15s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = ""}
          >
            <Plus size={15} /> Add Reseller
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={modalStyle}>
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 700 }}>New Reseller</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer" }}><X size={18} /></button>
            </div>

            {[
              { key: "username", label: "Username", type: "text" },
              { key: "password", label: "Password", type: "password" },
            ].map(({ key, label, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#aa44ff", fontWeight: 600 }}>{label}</label>
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  data-testid={`input-reseller-${key}`}
                  style={inputStyle}
                />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#aa44ff", fontWeight: 600 }}>Starting Credits</label>
              <input
                type="number" min={0} step={0.5}
                value={form.credits}
                onChange={(e) => setForm((f) => ({ ...f, credits: Number(e.target.value) }))}
                data-testid="input-reseller-credits"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "#aa44ff", fontWeight: 600 }}>Account Expiry</label>
              <select
                value={form.expiryDays}
                onChange={(e) => setForm((f) => ({ ...f, expiryDays: Number(e.target.value) }))}
                data-testid="select-reseller-expiry"
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} style={{ background: "#0a0010" }}>{o.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowCreate(false)} style={{
                padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(102,0,255,0.25)",
                background: "transparent", color: "#71717a", fontSize: 13, cursor: "pointer",
              }}>Cancel</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!form.username.trim() || !form.password || createMutation.isPending}
                data-testid="button-submit-reseller"
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, #6600ff, #7722ff)",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(102,0,255,0.35)",
                }}
              >
                {createMutation.isPending ? "Creating..." : "Create Reseller"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credits Modal */}
      {showCredits && (
        <div style={modalStyle}>
          <div style={{ ...cardStyle, maxWidth: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 700 }}>Adjust Credits</h2>
              <button onClick={() => setShowCredits(null)} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <p style={{ color: "#aa44ff", fontSize: 13, marginBottom: 16 }}>
              @{showCredits.username} — Current: <strong style={{ color: "#fbbf24" }}>{typeof showCredits.credits === "number" ? showCredits.credits.toFixed(1) : showCredits.credits}</strong> credits
            </p>
            <div style={{ marginBottom: 10 }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, color: "#52525b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Quick Add by Plan</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {PLANS.map((p) => (
                  <button key={p.days} onClick={() => setCreditAmount(p.credits)} style={{
                    padding: "7px 12px", borderRadius: 8, border: `1px solid ${creditAmount === p.credits ? "rgba(102,0,255,0.6)" : "rgba(102,0,255,0.2)"}`,
                    background: creditAmount === p.credits ? "rgba(102,0,255,0.25)" : "rgba(102,0,255,0.08)",
                    color: "#aa44ff", fontSize: 12, cursor: "pointer", display: "flex", justifyContent: "space-between",
                  }}>
                    <span>{p.label}</span>
                    <span style={{ color: "#fbbf24", fontWeight: 700 }}>+{p.credits} {p.credits === 1 ? "credit" : "credits"}</span>
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number" step={0.5}
              value={creditAmount}
              onChange={(e) => setCreditAmount(Number(e.target.value))}
              placeholder="Custom amount (negative to deduct)"
              data-testid="input-credit-amount"
              style={{ ...inputStyle, marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowCredits(null)} style={{
                padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(102,0,255,0.25)",
                background: "transparent", color: "#71717a", fontSize: 13, cursor: "pointer",
              }}>Cancel</button>
              <button
                onClick={() => addCreditsMutation.mutate({ id: showCredits.id, amount: creditAmount })}
                disabled={creditAmount === 0 || addCreditsMutation.isPending}
                data-testid="button-submit-credits"
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, #6600ff, #7722ff)",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(102,0,255,0.35)",
                }}
              >
                {creditAmount > 0 ? "Add Credits" : "Deduct Credits"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expiry Modal */}
      {showExpiry && (
        <div style={modalStyle}>
          <div style={{ ...cardStyle, maxWidth: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 700 }}>Update Expiry</h2>
              <button onClick={() => setShowExpiry(null)} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <p style={{ color: "#aa44ff", fontSize: 13, marginBottom: 16 }}>
              @{showExpiry.username} — Current expiry: <strong style={{ color: "#fff" }}>{formatDate(showExpiry.expiryDate)}</strong>
            </p>
            <label style={{ fontSize: 12, color: "#aa44ff", fontWeight: 600, display: "block", marginBottom: 6 }}>Set New Expiry (from today)</label>
            <select
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
              data-testid="select-expiry-days"
              style={{ ...inputStyle, marginBottom: 16, cursor: "pointer" }}
            >
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} style={{ background: "#0a0010" }}>{o.label}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowExpiry(null)} style={{
                padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(102,0,255,0.25)",
                background: "transparent", color: "#71717a", fontSize: 13, cursor: "pointer",
              }}>Cancel</button>
              <button
                onClick={() => updateExpiryMutation.mutate({ id: showExpiry.id, days: expiryDays })}
                disabled={updateExpiryMutation.isPending}
                data-testid="button-submit-expiry"
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, #6600ff, #7722ff)",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(102,0,255,0.35)",
                }}
              >
                {updateExpiryMutation.isPending ? "Updating..." : "Update Expiry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(102,0,255,0.15)",
        borderRadius: 16, overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(102,0,255,0.15)" }}>
              {["Username", "Credits", "Expiry Date", "Status", "Joined", "Actions"].map((h) => (
                <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: 11, color: "#52525b", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#52525b" }}>Loading...</td></tr>
            ) : resellers.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#3f3f46" }}>
                <Users size={36} style={{ display: "block", margin: "0 auto 10px", opacity: 0.3 }} />
                No resellers yet
              </td></tr>
            ) : resellers.map((r: any) => (
              <tr key={r.id} data-testid={`reseller-row-${r.id}`} style={{ borderBottom: "1px solid rgba(102,0,255,0.07)", transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(102,0,255,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "14px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "linear-gradient(135deg, #60a5fa, #3b82f6)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: "#fff",
                    }}>{r.username.slice(0, 2).toUpperCase()}</div>
                    <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{r.username}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Coins size={13} style={{ color: "#fbbf24" }} />
                    <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 14 }}>
                      {typeof r.credits === "number" ? r.credits.toFixed(1) : r.credits}
                    </span>
                  </div>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Clock size={12} style={{ color: "#52525b" }} />
                    <span style={{ color: "#71717a", fontSize: 12 }}>{formatDate(r.expiryDate)}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  {statusBadge(r.status)}
                </td>
                <td style={{ padding: "14px 20px", color: "#71717a", fontSize: 12 }}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => { setShowCredits(r); setCreditAmount(0); }}
                      data-testid={`button-credits-${r.id}`}
                      style={{
                        display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                        background: "rgba(102,0,255,0.12)", border: "1px solid rgba(102,0,255,0.25)",
                        borderRadius: 6, color: "#aa44ff", fontSize: 11, cursor: "pointer",
                      }}
                    >
                      <Coins size={11} /> Credits
                    </button>
                    <button
                      onClick={() => { setShowExpiry(r); setExpiryDays(30); }}
                      data-testid={`button-expiry-${r.id}`}
                      style={{
                        display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                        background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)",
                        borderRadius: 6, color: "#60a5fa", fontSize: 11, cursor: "pointer",
                      }}
                    >
                      <CalendarDays size={11} /> Expiry
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Plans Reference */}
      <div style={{ marginTop: 24, padding: "16px 20px", borderRadius: 12, background: "rgba(102,0,255,0.05)", border: "1px solid rgba(102,0,255,0.15)" }}>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#52525b", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>License Plans — Credit Costs</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {PLANS.map((p) => (
            <div key={p.days} style={{
              padding: "5px 14px", borderRadius: 6, fontSize: 12,
              background: "rgba(102,0,255,0.15)", border: "1px solid rgba(102,0,255,0.25)",
              color: "#aa44ff", display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontWeight: 700 }}>{p.label}</span>
              <span style={{ color: "#52525b" }}>→</span>
              <Coins size={11} style={{ color: "#fbbf24" }} />
              <span style={{ color: "#fbbf24", fontWeight: 700 }}>{p.credits} {p.credits === 1 ? "credit" : "credits"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
