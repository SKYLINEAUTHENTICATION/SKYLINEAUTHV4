import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Instagram,
  Loader2,
  CheckCircle2,
  Sparkles,
  Link as LinkIcon,
  Hash,
  Repeat,
  Timer,
  Send,
  Info,
} from "lucide-react";

type SmmService = {
  service: string | number;
  name: string;
  type?: string;
  category: string;
  rate: string | number;
  min: string | number;
  max: string | number;
  description?: string;
  refill?: boolean;
  cancel?: boolean;
  dripfeed?: boolean;
};

type OrderResponse = {
  order?: number | string;
  error?: string;
  [k: string]: any;
};

const ACCENT = "#aa44ff";
const ACCENT_DEEP = "#6600ff";

export default function InstagramFollowersPage() {
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<string>("");

  // Order form state
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [useDripfeed, setUseDripfeed] = useState(false);
  const [runs, setRuns] = useState<string>("");
  const [interval, setIntervalVal] = useState<string>("");
  const [lastOrderId, setLastOrderId] = useState<string | number | null>(null);

  const { data: services = [], isLoading, isError, error, refetch } = useQuery<SmmService[]>({
    queryKey: ["/api/smm/instagram-followers/services"],
  });

  // Cheapest plan (gets the "Recommended" badge)
  const cheapestId = useMemo(() => {
    if (services.length === 0) return null;
    const cheapest = [...services].sort(
      (a, b) => (Number(a.rate) || 0) - (Number(b.rate) || 0),
    )[0];
    return cheapest ? String(cheapest.service) : null;
  }, [services]);

  // Sorted plans for the dropdown — cheapest first
  const sortedPlans = useMemo(
    () =>
      [...services].sort(
        (a, b) => (Number(a.rate) || 0) - (Number(b.rate) || 0),
      ),
    [services],
  );

  // Auto-select the cheapest plan once data loads
  useEffect(() => {
    if (!selectedId && cheapestId) setSelectedId(cheapestId);
  }, [cheapestId, selectedId]);

  const selected = useMemo(
    () => services.find((s) => String(s.service) === selectedId) || null,
    [services, selectedId],
  );

  // Reset quantity to min when the plan changes / first load
  useEffect(() => {
    if (!selected) return;
    const min = Number(selected.min) || 0;
    const cur = Number(quantity) || 0;
    if (!cur || cur < min) setQuantity(String(min));
    if (!selected.dripfeed && useDripfeed) setUseDripfeed(false);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const orderMutation = useMutation({
    mutationFn: async (payload: any): Promise<OrderResponse> => {
      const res = await apiRequest("POST", "/api/smm/instagram-followers/order", payload);
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.order) {
        setLastOrderId(data.order);
        toast({ title: "Order placed", description: `Order ID: ${data.order}` });
        setLink("");
        setRuns("");
        setIntervalVal("");
      } else {
        toast({ title: "Order placed", description: JSON.stringify(data) });
      }
    },
    onError: (err: any) => {
      toast({
        title: "Failed to place order",
        description: err?.message ?? "Unknown error",
        variant: "destructive",
      });
    },
  });

  const qtyNum = Number(quantity) || 0;
  const rateNum = selected ? Number(selected.rate) || 0 : 0;
  const totalCost = (qtyNum * rateNum) / 1000;

  const minNum = selected ? Number(selected.min) || 0 : 0;
  const maxNum = selected ? Number(selected.max) || 0 : 0;
  const qtyValid = !!selected && qtyNum >= minNum && qtyNum <= maxNum;

  const canSubmit =
    !!selected &&
    !!link.trim() &&
    qtyValid &&
    !orderMutation.isPending &&
    (!useDripfeed || (Number(runs) > 0 && Number(interval) > 0));

  const handleSubmit = () => {
    if (!selected || !canSubmit) return;
    const payload: any = {
      service: selected.service,
      link: link.trim(),
      quantity: qtyNum,
    };
    if (useDripfeed) {
      payload.runs = Number(runs);
      payload.interval = Number(interval);
    }
    orderMutation.mutate(payload);
  };

  return (
    <div
      style={{
        padding: "28px 32px",
        background: "#000",
        minHeight: "100%",
        maxWidth: 880,
        margin: "0 auto",
      }}
      data-testid="page-instagram-followers"
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, #6600ff, #aa44ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 24px rgba(170,68,255,0.4)",
            }}
          >
            <Instagram size={22} color="#fff" />
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 800,
                color: "#fff",
                fontFamily: "Inter, sans-serif",
                letterSpacing: 1,
              }}
              data-testid="text-page-title"
            >
              Instagram Followers
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#52525b" }}>
              Boost any Instagram profile via IndiansMMHub
            </p>
          </div>
        </div>

        {lastOrderId !== null && (
          <div
            data-testid="banner-last-order"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "#4ade80",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={16} />
            Last Order ID: <span style={{ color: "#fff" }}>{lastOrderId}</span>
          </div>
        )}
      </div>

      {/* Body */}
      {isLoading ? (
        <LoadingState label="Loading plans…" />
      ) : isError ? (
        <ErrorState
          message={(error as any)?.message || "Failed to load services"}
          onRetry={() => refetch()}
        />
      ) : sortedPlans.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          style={{
            background:
              "linear-gradient(180deg, rgba(15,5,30,0.75), rgba(8,2,18,0.75))",
            border: "1px solid rgba(102,0,255,0.22)",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 12px 50px rgba(0,0,0,0.45)",
          }}
        >
          {/* Plan select */}
          <Field icon={<Sparkles size={14} />} label="Select a plan">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger
                className="w-full"
                data-testid="select-plan"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(102,0,255,0.3)",
                  color: "#fff",
                  height: 44,
                }}
              >
                <SelectValue placeholder="Choose an Instagram Followers plan…" />
              </SelectTrigger>
              <SelectContent
                className="max-h-[60vh]"
                style={{
                  background: "#0a0014",
                  border: "1px solid rgba(102,0,255,0.3)",
                  color: "#fff",
                }}
              >
                <SelectGroup>
                  <SelectLabel
                    style={{
                      color: "#71717a",
                      fontSize: 11,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    }}
                  >
                    Sorted: cheapest first
                  </SelectLabel>
                  {sortedPlans.map((s) => {
                    const isCheapest = String(s.service) === cheapestId;
                    return (
                      <SelectItem
                        key={String(s.service)}
                        value={String(s.service)}
                        data-testid={`option-plan-${s.service}`}
                        style={{ paddingRight: 12, paddingLeft: 28 }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            width: "100%",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              color: "#71717a",
                              fontFamily: "monospace",
                              flexShrink: 0,
                            }}
                          >
                            #{s.service}
                          </span>
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: 13,
                              color: "#e4e4e7",
                            }}
                          >
                            {s.name}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: "#d4b3ff",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            ${Number(s.rate).toFixed(4)}/1k
                          </span>
                          {isCheapest && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 800,
                                letterSpacing: 0.5,
                                textTransform: "uppercase",
                                padding: "2px 6px",
                                borderRadius: 999,
                                background:
                                  "linear-gradient(135deg, #fbbf24, #f59e0b)",
                                color: "#1a1100",
                                flexShrink: 0,
                              }}
                            >
                              Best
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          {/* Selected plan summary */}
          {selected && <PlanSummary service={selected} isRecommended={String(selected.service) === cheapestId} />}

          {/* Order form */}
          {selected && (
            <div
              style={{
                marginTop: 20,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <Field icon={<LinkIcon size={14} />} label="Instagram profile / post link">
                <input
                  data-testid="input-order-link"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://www.instagram.com/yourprofile"
                  style={inputStyle}
                />
              </Field>

              <Field
                icon={<Hash size={14} />}
                label={`Quantity (min ${minNum} · max ${maxNum})`}
                error={
                  quantity && !qtyValid
                    ? `Must be between ${minNum} and ${maxNum}`
                    : undefined
                }
              >
                <input
                  data-testid="input-order-quantity"
                  type="number"
                  min={minNum}
                  max={maxNum}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={String(minNum)}
                  style={inputStyle}
                />
              </Field>

              {selected.dripfeed && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid rgba(102,0,255,0.18)",
                    background: "rgba(102,0,255,0.04)",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      color: "#e4e4e7",
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: useDripfeed ? 12 : 0,
                    }}
                  >
                    <input
                      data-testid="checkbox-dripfeed"
                      type="checkbox"
                      checked={useDripfeed}
                      onChange={(e) => setUseDripfeed(e.target.checked)}
                    />
                    Use drip-feed
                  </label>
                  {useDripfeed && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <Field icon={<Repeat size={14} />} label="Runs">
                        <input
                          data-testid="input-order-runs"
                          type="number"
                          min={1}
                          value={runs}
                          onChange={(e) => setRuns(e.target.value)}
                          placeholder="e.g. 5"
                          style={inputStyle}
                        />
                      </Field>
                      <Field icon={<Timer size={14} />} label="Interval (min)">
                        <input
                          data-testid="input-order-interval"
                          type="number"
                          min={1}
                          value={interval}
                          onChange={(e) => setIntervalVal(e.target.value)}
                          placeholder="e.g. 30"
                          style={inputStyle}
                        />
                      </Field>
                    </div>
                  )}
                </div>
              )}

              {/* Total cost */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(170,68,255,0.08)",
                  border: "1px solid rgba(170,68,255,0.25)",
                }}
              >
                <span style={{ fontSize: 12, color: "#d4b3ff", fontWeight: 600 }}>
                  Total cost
                </span>
                <span
                  data-testid="text-total-cost"
                  style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}
                >
                  ${totalCost.toFixed(4)}
                </span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                data-testid="button-place-order"
                style={{
                  marginTop: 4,
                  padding: "12px 18px",
                  borderRadius: 10,
                  border: "none",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  opacity: canSubmit ? 1 : 0.5,
                  background: `linear-gradient(135deg, ${ACCENT_DEEP}, ${ACCENT})`,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  boxShadow: "0 6px 22px rgba(102,0,255,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!canSubmit) return;
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 10px 28px rgba(102,0,255,0.55)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow =
                    "0 6px 22px rgba(102,0,255,0.4)";
                }}
              >
                {orderMutation.isPending ? (
                  <Loader2 size={15} className="spin" />
                ) : (
                  <Send size={15} />
                )}
                {orderMutation.isPending ? "Placing…" : "Place Order"}
              </button>
            </div>
          )}
        </div>
      )}
      <style>{`
        .spin { animation: ig-spin 0.9s linear infinite; }
        @keyframes ig-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ── Plan summary panel ─────────────────────────────────── */
function PlanSummary({
  service,
  isRecommended,
}: {
  service: SmmService;
  isRecommended: boolean;
}) {
  return (
    <div
      data-testid="panel-plan-summary"
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 12,
        background: "rgba(102,0,255,0.06)",
        border: "1px solid rgba(102,0,255,0.22)",
        position: "relative",
      }}
    >
      {isRecommended && (
        <div
          data-testid="badge-recommended"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 999,
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            color: "#1a1100",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          <Sparkles size={10} /> Recommended
        </div>
      )}
      <div
        style={{
          fontSize: 10,
          color: "#71717a",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 6,
        }}
      >
        Plan #{service.service}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "#fff",
          fontWeight: 700,
          marginBottom: 10,
          paddingRight: isRecommended ? 110 : 0,
          lineHeight: 1.4,
        }}
        data-testid="text-selected-plan-name"
      >
        {service.name}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: service.description ? 12 : 0 }}>
        <Pill label="Rate / 1k" value={`$${Number(service.rate).toFixed(4)}`} highlight />
        <Pill label="Min" value={String(service.min)} />
        <Pill label="Max" value={String(service.max)} />
        {service.dripfeed && <Pill label="Drip-feed" value="Yes" />}
        {service.refill && <Pill label="Refill" value="Yes" />}
      </div>

      {service.description && (
        <details
          style={{
            marginTop: 4,
            background: "rgba(0,0,0,0.25)",
            borderRadius: 8,
            padding: "8px 12px",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontSize: 11,
              color: "#a1a1aa",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              userSelect: "none",
            }}
          >
            <Info size={12} /> Plan details
          </summary>
          <pre
            style={{
              margin: "8px 0 0",
              fontSize: 11.5,
              color: "#a1a1aa",
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {service.description}
          </pre>
        </details>
      )}
    </div>
  );
}

function Pill({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: "4px 8px",
        borderRadius: 8,
        background: highlight ? "rgba(170,68,255,0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${highlight ? "rgba(170,68,255,0.3)" : "rgba(255,255,255,0.08)"}`,
        fontSize: 11,
        color: highlight ? "#d4b3ff" : "#a1a1aa",
        fontWeight: 600,
        display: "flex",
        gap: 6,
        alignItems: "baseline",
      }}
    >
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ color: highlight ? "#fff" : "#e4e4e7" }}>{value}</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid rgba(102,0,255,0.22)",
  background: "rgba(0,0,0,0.4)",
  color: "#fff",
  fontSize: 13,
  outline: "none",
};

function Field({
  icon,
  label,
  error,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          fontWeight: 600,
          color: "#a1a1aa",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 6,
        }}
      >
        {icon}
        {label}
      </label>
      {children}
      {error && (
        <div style={{ marginTop: 4, fontSize: 11, color: "#ef4444" }}>{error}</div>
      )}
    </div>
  );
}

/* ── States ───────────────────────────────────────────────── */
function LoadingState({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: 60,
        color: "#a1a1aa",
        fontSize: 13,
      }}
      data-testid="state-loading"
    >
      <Loader2 size={16} className="spin" />
      {label}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      data-testid="state-error"
      style={{
        padding: 24,
        borderRadius: 12,
        background: "rgba(239,68,68,0.06)",
        border: "1px solid rgba(239,68,68,0.25)",
        color: "#fca5a5",
        textAlign: "center",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Could not load services</div>
      <div style={{ fontSize: 12, marginBottom: 14, opacity: 0.85 }}>{message}</div>
      <button
        onClick={onRetry}
        data-testid="button-retry"
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          background: "rgba(239,68,68,0.15)",
          color: "#fca5a5",
          border: "1px solid rgba(239,68,68,0.3)",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      data-testid="state-empty"
      style={{
        padding: 40,
        textAlign: "center",
        color: "#71717a",
        fontSize: 13,
        border: "1px dashed rgba(102,0,255,0.22)",
        borderRadius: 12,
      }}
    >
      No Instagram Followers plans available right now.
    </div>
  );
}
