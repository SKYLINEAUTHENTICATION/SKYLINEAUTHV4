import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Users, Plus, Coins, X, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CREDIT_RATES = [
  { credits: 1, days: 5 }, { credits: 2, days: 10 }, { credits: 3, days: 15 },
  { credits: 5, days: 25 }, { credits: 10, days: 50 }, { credits: 20, days: 100 },
];

export default function ResellersPage() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showCredits, setShowCredits] = useState<any>(null);
  const [form, setForm] = useState({ username: "", password: "", credits: 0 });
  const [creditAmount, setCreditAmount] = useState(0);

  const canManage = isSuperAdmin || isAdmin;

  const { data: resellers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/resellers"],
    enabled: canManage,
  });

  const { data: myCredits } = useQuery<{ credits: number }>({
    queryKey: ["/api/resellers/me"],
    enabled: user?.role === "reseller",
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/resellers", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers"] });
      setForm({ username: "", password: "", credits: 0 }); setShowCreate(false);
      toast({ title: "Reseller created" });
    },
    onError: () => toast({ title: "Failed to create reseller", variant: "destructive" }),
  });

  const addCreditsMutation = useMutation({
    mutationFn: ({ id, amount }: any) => apiRequest("POST", `/api/resellers/${id}/credits`, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resellers"] });
      setShowCredits(null); setCreditAmount(0);
      toast({ title: "Credits updated" });
    },
  });

  if (user?.role === "reseller") {
    return (
      <div style={{ padding: "28px 32px", background: "#000", minHeight: "100%" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "Rajdhani, sans-serif" }}>My Credits</h1>
        <p style={{ margin: "0 0 32px", fontSize: 13, color: "#52525b" }}>Use credits to generate license keys for your customers</p>

        <div style={{
          padding: 32, borderRadius: 20, maxWidth: 480,
          background: "linear-gradient(145deg, rgba(124,58,237,0.18), rgba(99,102,241,0.08))",
          border: "1px solid rgba(139,92,246,0.4)",
          boxShadow: "0 16px 60px rgba(124,58,237,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}>
          <div style={{ textAlign: "center" }}>
            <Coins size={40} style={{ color: "#a78bfa", marginBottom: 12 }} />
            <p style={{ margin: "0 0 6px", fontSize: 14, color: "#71717a" }}>Available Credits</p>
            <p style={{ margin: "0 0 24px", fontSize: 64, fontWeight: 800, color: "#fff", fontFamily: "Rajdhani, sans-serif", lineHeight: 1 }}>
              {myCredits?.credits ?? 0}
            </p>
          </div>
          <div style={{ borderTop: "1px solid rgba(139,92,246,0.2)", paddingTop: 20 }}>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "#52525b", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>Credit Rates</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {CREDIT_RATES.map((r) => (
                <div key={r.credits} style={{
                  padding: "8px 12px", borderRadius: 8,
                  background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ color: "#a78bfa", fontWeight: 700, fontSize: 13 }}>{r.credits} credit{r.credits > 1 ? "s" : ""}</span>
                  <span style={{ color: "#71717a", fontSize: 12 }}>{r.days} days</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", background: "#000", minHeight: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "Rajdhani, sans-serif" }}>Resellers</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#52525b" }}>Manage reseller accounts and credit balances</p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)} data-testid="button-new-reseller" style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
            background: "linear-gradient(135deg, #7c3aed, #6366f1)",
            border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
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
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "linear-gradient(145deg, #0d0015, #0a0010)", border: "1px solid rgba(139,92,246,0.35)",
            borderRadius: 16, padding: 32, width: "100%", maxWidth: 480,
            boxShadow: "0 24px 80px rgba(124,58,237,0.3)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 700 }}>New Reseller</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer" }}><X size={18} /></button>
            </div>
            {[
              { key: "username", label: "Username", type: "text" },
              { key: "password", label: "Password", type: "password" },
            ].map(({ key, label, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>{label}</label>
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  data-testid={`input-reseller-${key}`}
                  style={{
                    width: "100%", marginTop: 6, padding: "10px 14px", boxSizing: "border-box",
                    background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)",
                    borderRadius: 8, color: "#fff", fontSize: 13, outline: "none",
                  }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>Starting Credits</label>
              <input
                type="number" min={0}
                value={form.credits}
                onChange={(e) => setForm((f) => ({ ...f, credits: Number(e.target.value) }))}
                data-testid="input-reseller-credits"
                style={{
                  width: "100%", marginTop: 6, padding: "10px 14px", boxSizing: "border-box",
                  background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)",
                  borderRadius: 8, color: "#fff", fontSize: 13, outline: "none",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowCreate(false)} style={{
                padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.25)",
                background: "transparent", color: "#71717a", fontSize: 13, cursor: "pointer",
              }}>Cancel</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!form.username.trim() || !form.password || createMutation.isPending}
                data-testid="button-submit-reseller"
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
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
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "linear-gradient(145deg, #0d0015, #0a0010)", border: "1px solid rgba(139,92,246,0.35)",
            borderRadius: 16, padding: 32, width: "100%", maxWidth: 420,
            boxShadow: "0 24px 80px rgba(124,58,237,0.3)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 700 }}>Adjust Credits</h2>
              <button onClick={() => setShowCredits(null)} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <p style={{ color: "#a78bfa", fontSize: 13, marginBottom: 16 }}>
              @{showCredits.username} — Current: <strong>{showCredits.credits}</strong> credits
            </p>
            <input
              type="number"
              value={creditAmount}
              onChange={(e) => setCreditAmount(Number(e.target.value))}
              placeholder="Amount (use negative to deduct)"
              data-testid="input-credit-amount"
              style={{
                width: "100%", padding: "10px 14px", boxSizing: "border-box", marginBottom: 16,
                background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)",
                borderRadius: 8, color: "#fff", fontSize: 13, outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowCredits(null)} style={{
                padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.25)",
                background: "transparent", color: "#71717a", fontSize: 13, cursor: "pointer",
              }}>Cancel</button>
              <button
                onClick={() => addCreditsMutation.mutate({ id: showCredits.id, amount: creditAmount })}
                disabled={creditAmount === 0 || addCreditsMutation.isPending}
                data-testid="button-submit-credits"
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
                }}
              >
                {creditAmount > 0 ? "Add Credits" : "Deduct Credits"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(139,92,246,0.15)",
        borderRadius: 16, overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(139,92,246,0.15)" }}>
              {["Username", "Credits", "Joined", "Actions"].map((h) => (
                <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: 11, color: "#52525b", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: "#52525b" }}>Loading...</td></tr>
            ) : resellers.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: "#3f3f46" }}>
                <Users size={36} style={{ display: "block", margin: "0 auto 10px", opacity: 0.3 }} />
                No resellers yet
              </td></tr>
            ) : resellers.map((r: any) => (
              <tr key={r.id} data-testid={`reseller-row-${r.id}`} style={{ borderBottom: "1px solid rgba(139,92,246,0.07)", transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,92,246,0.05)")}
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
                    <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 14 }}>{r.credits}</span>
                    <span style={{ color: "#52525b", fontSize: 12 }}>({r.credits * 5} days value)</span>
                  </div>
                </td>
                <td style={{ padding: "14px 20px", color: "#71717a", fontSize: 12 }}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <button
                    onClick={() => { setShowCredits(r); setCreditAmount(0); }}
                    data-testid={`button-credits-${r.id}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                      background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)",
                      borderRadius: 6, color: "#a78bfa", fontSize: 12, cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(139,92,246,0.25)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(139,92,246,0.15)"}
                  >
                    <Coins size={12} /> Manage Credits
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Credit rate reference */}
      <div style={{ marginTop: 24, padding: "16px 20px", borderRadius: 12, background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)" }}>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#52525b", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>Credit → Days Conversion</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {CREDIT_RATES.map((r) => (
            <div key={r.credits} style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12,
              background: "rgba(124,58,237,0.15)", border: "1px solid rgba(139,92,246,0.25)",
              color: "#a78bfa",
            }}>
              {r.credits}cr = {r.days}d
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
