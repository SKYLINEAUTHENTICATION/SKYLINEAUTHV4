import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Wallet, AlertTriangle, RefreshCw, X, Package, Ban, ExternalLink } from "lucide-react";
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

type OrderStatus = {
  charge?: string | number;
  start_count?: string | number;
  status?: string;
  remains?: string | number;
  currency?: string;
  [k: string]: any;
};

type PlacedOrder = {
  id: string | number;
  service: string;
  link: string;
  quantity: number;
  cost: number;
  placedAt: number;
};

const ACCENT = "#aa44ff";
const ACCENT_DEEP = "#6600ff";

/**
 * Clean a service name by:
 *  - Normalizing fancy mathematical bold/italic Unicode letters back to plain ASCII
 *  - Stripping emojis and other pictographic symbols
 *  - Collapsing whitespace
 */
function cleanText(input: string): string {
  if (!input) return "";
  let s = input.normalize("NFKC");
  // Remove emoji & pictographic symbols (broad ranges)
  s = s.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\uFE0F\u200D]/gu,
    "",
  );
  // Collapse repeated separators that get left behind
  s = s.replace(/\s+/g, " ").replace(/\s*([\[\(])\s*/g, " $1").replace(/\s*([\]\)])/g, "$1");
  return s.trim();
}

type SmmOrderRow = {
  id: string;
  providerOrderId: string;
  serviceId: string;
  serviceName: string;
  category: string | null;
  link: string;
  quantity: number;
  cost: number;
  supportsCancel: boolean;
  status: string | null;
  createdAt: string;
  startCount: number | null;
  remains: number | null;
  charge: number | null;
  currency: string;
};

export default function InstagramFollowersPage() {
  const { toast } = useToast();
  const { isTopClient, isSuperAdmin } = useAuth();

  const [tab, setTab] = useState<"place" | "orders">("place");
  const [selectedId, setSelectedId] = useState<string>("");

  const { data: walletInfo } = useQuery<{ role: string; walletBalance: number }>({
    queryKey: ["/api/smm/wallet"],
    enabled: isTopClient || isSuperAdmin,
  });

  const { data: apiBalance, refetch: refetchApiBalance, isFetching: isFetchingApiBalance } = useQuery<{
    balance: number;
    currency: string;
  }>({
    queryKey: ["/api/smm/api-balance"],
    enabled: isSuperAdmin,
  });

  // Order form state
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [useDripfeed, setUseDripfeed] = useState(false);
  const [runs, setRuns] = useState<string>("");
  const [interval, setIntervalVal] = useState<string>("");
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);

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
    onSuccess: (data, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/smm/api-balance"] });
      if (data?.order) {
        setPlacedOrder({
          id: data.order,
          service: selected ? cleanText(selected.name) : "Instagram Followers",
          link: variables.link,
          quantity: variables.quantity,
          cost: ((Number(variables.quantity) || 0) * (Number(variables.rate) || 0)) / 1000,
          placedAt: Date.now(),
        });
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

  const {
    data: orderStatus,
    isFetching: isFetchingStatus,
    refetch: refetchStatus,
  } = useQuery<OrderStatus>({
    queryKey: ["/api/smm/instagram-followers/order", placedOrder?.id, "status"],
    enabled: !!placedOrder?.id,
    refetchInterval: 15000,
  });

  const qtyNum = Number(quantity) || 0;
  const rateNum = selected ? Number(selected.rate) || 0 : 0;
  const totalCost = (qtyNum * rateNum) / 1000;

  const minNum = selected ? Number(selected.min) || 0 : 0;
  const maxNum = selected ? Number(selected.max) || 0 : 0;
  const qtyValid = !!selected && qtyNum >= minNum && qtyNum <= maxNum;

  const walletBalance = Number(walletInfo?.walletBalance) || 0;
  const insufficientFunds = isTopClient && totalCost > walletBalance;

  const canSubmit =
    !!selected &&
    !!link.trim() &&
    qtyValid &&
    !orderMutation.isPending &&
    !insufficientFunds &&
    (!useDripfeed || (Number(runs) > 0 && Number(interval) > 0));

  const handleSubmit = () => {
    if (!selected || !canSubmit) return;
    const payload: any = {
      service: selected.service,
      link: link.trim(),
      quantity: qtyNum,
      rate: rateNum,
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

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {isTopClient && walletInfo && (
            <div
              data-testid="badge-wallet-balance"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(236,72,153,0.08)",
                border: "1px solid rgba(236,72,153,0.3)",
                color: "#f9a8d4",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Wallet size={15} />
              <span style={{ color: "#71717a", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Wallet
              </span>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }} data-testid="text-wallet-balance">
                ₹{walletBalance.toFixed(2)}
              </span>
            </div>
          )}

          {isSuperAdmin && (
            <div
              data-testid="badge-api-balance"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(102,0,255,0.10)",
                border: "1px solid rgba(170,68,255,0.35)",
                color: "#d4b3ff",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Wallet size={15} />
              <span style={{ color: "#71717a", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                API Balance
              </span>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }} data-testid="text-api-balance">
                {apiBalance
                  ? `${apiBalance.currency === "INR" ? "₹" : ""}${Number(apiBalance.balance).toFixed(2)}${apiBalance.currency !== "INR" ? ` ${apiBalance.currency}` : ""}`
                  : "—"}
              </span>
              <button
                onClick={() => refetchApiBalance()}
                data-testid="button-refresh-api-balance"
                title="Refresh balance"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#d4b3ff",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <RefreshCw size={13} className={isFetchingApiBalance ? "animate-spin" : ""} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 18,
          padding: 4,
          borderRadius: 12,
          background: "rgba(15,5,30,0.6)",
          border: "1px solid rgba(102,0,255,0.18)",
          width: "fit-content",
        }}
      >
        <TabButton
          active={tab === "place"}
          onClick={() => setTab("place")}
          icon={<Send size={14} />}
          label="Place Order"
          testId="tab-place-order"
        />
        <TabButton
          active={tab === "orders"}
          onClick={() => {
            setTab("orders");
            queryClient.invalidateQueries({ queryKey: ["/api/smm/orders"] });
          }}
          icon={<Package size={14} />}
          label="Orders"
          testId="tab-orders"
        />
      </div>

      {tab === "orders" ? (
        <OrdersPanel />
      ) : isLoading ? (
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
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            {cleanText(s.name)}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: "#d4b3ff",
                              fontWeight: 700,
                              flexShrink: 0,
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            ₹{Number(s.rate).toFixed(2)}/1k
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
                  background: insufficientFunds ? "rgba(239,68,68,0.08)" : "rgba(170,68,255,0.08)",
                  border: `1px solid ${insufficientFunds ? "rgba(239,68,68,0.35)" : "rgba(170,68,255,0.25)"}`,
                }}
              >
                <span style={{ fontSize: 12, color: insufficientFunds ? "#fca5a5" : "#d4b3ff", fontWeight: 600 }}>
                  Total cost
                </span>
                <span
                  data-testid="text-total-cost"
                  style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: "Inter, sans-serif" }}
                >
                  ₹{totalCost.toFixed(2)}
                </span>
              </div>

              {insufficientFunds && (
                <div
                  data-testid="warning-insufficient-funds"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#fca5a5",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <AlertTriangle size={15} />
                  Insufficient wallet balance. Need ₹{totalCost.toFixed(2)}, you have ₹{walletBalance.toFixed(2)}.
                </div>
              )}

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

      {placedOrder && (
        <OrderDetailsCard
          order={placedOrder}
          status={orderStatus}
          isFetching={isFetchingStatus}
          onRefresh={() => refetchStatus()}
          onClose={() => setPlacedOrder(null)}
        />
      )}

      <style>{`
        .spin { animation: ig-spin 0.9s linear infinite; }
        @keyframes ig-spin { to { transform: rotate(360deg); } }
        @keyframes ig-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

/* ── Order details card ─────────────────────────────────── */
function OrderDetailsCard({
  order,
  status,
  isFetching,
  onRefresh,
  onClose,
}: {
  order: PlacedOrder;
  status?: OrderStatus;
  isFetching: boolean;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const statusText = String(status?.status || "").toLowerCase();
  const statusColor =
    statusText.includes("complete")
      ? { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.45)", text: "#4ade80" }
      : statusText.includes("partial")
      ? { bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.45)", text: "#facc15" }
      : statusText.includes("cancel") || statusText.includes("refund")
      ? { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.45)", text: "#fca5a5" }
      : statusText.includes("progress") || statusText.includes("processing")
      ? { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.45)", text: "#93c5fd" }
      : { bg: "rgba(170,68,255,0.12)", border: "rgba(170,68,255,0.45)", text: "#d4b3ff" };

  const charge = status?.charge !== undefined ? Number(status.charge) : null;
  const startCount = status?.start_count !== undefined ? Number(status.start_count) : null;
  const remains = status?.remains !== undefined ? Number(status.remains) : null;
  const delivered = startCount !== null && remains !== null ? Math.max(0, order.quantity - remains) : null;
  const progressPct =
    delivered !== null ? Math.min(100, Math.round((delivered / order.quantity) * 100)) : null;

  return (
    <div
      data-testid="card-order-details"
      style={{
        marginTop: 18,
        background:
          "linear-gradient(180deg, rgba(15,5,30,0.85), rgba(8,2,18,0.85))",
        border: "1px solid rgba(34,197,94,0.35)",
        borderRadius: 16,
        padding: 22,
        boxShadow: "0 12px 50px rgba(0,0,0,0.45)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CheckCircle2 size={20} color="#4ade80" />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
              Order placed successfully
            </div>
            <div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>
              {new Date(order.placedAt).toLocaleString()}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={onRefresh}
            data-testid="button-refresh-order-status"
            title="Refresh status"
            style={{
              background: "rgba(170,68,255,0.12)",
              border: "1px solid rgba(170,68,255,0.35)",
              color: "#d4b3ff",
              padding: "6px 10px",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <RefreshCw size={13} className={isFetching ? "spin" : ""} />
            Refresh
          </button>
          <button
            onClick={onClose}
            data-testid="button-close-order-details"
            title="Close"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#71717a",
              padding: 6,
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Stat label="Order ID" value={String(order.id)} testId="text-order-id" mono />
        <Stat
          label="Status"
          value={
            <span
              data-testid="badge-order-status"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 10px",
                borderRadius: 999,
                background: statusColor.bg,
                border: `1px solid ${statusColor.border}`,
                color: statusColor.text,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {isFetching && !status ? (
                <>
                  <Loader2 size={11} className="spin" /> Checking…
                </>
              ) : (
                status?.status || "Pending"
              )}
            </span>
          }
        />
        <Stat label="Quantity" value={order.quantity.toLocaleString()} testId="text-order-qty" />
        <Stat
          label="Charge"
          value={charge !== null ? `${status?.currency === "INR" ? "₹" : ""}${charge.toFixed(2)}${status?.currency && status.currency !== "INR" ? ` ${status.currency}` : ""}` : `₹${order.cost.toFixed(2)}`}
          testId="text-order-charge"
        />
        {startCount !== null && (
          <Stat label="Start count" value={startCount.toLocaleString()} testId="text-order-start" />
        )}
        {remains !== null && (
          <Stat label="Remaining" value={remains.toLocaleString()} testId="text-order-remains" />
        )}
      </div>

      {progressPct !== null && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#a1a1aa",
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            <span>Delivery progress</span>
            <span data-testid="text-order-progress" style={{ color: "#fff" }}>
              {delivered?.toLocaleString()} / {order.quantity.toLocaleString()} ({progressPct}%)
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${ACCENT_DEEP}, ${ACCENT})`,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      )}

      <div
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.06)",
          fontSize: 12,
          color: "#a1a1aa",
        }}
      >
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: "#71717a" }}>Service: </span>
          <span style={{ color: "#fff" }}>{order.service}</span>
        </div>
        <div style={{ wordBreak: "break-all" }}>
          <span style={{ color: "#71717a" }}>Link: </span>
          <a
            href={order.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#d4b3ff", textDecoration: "none" }}
            data-testid="link-order-target"
          >
            {order.link}
          </a>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          color: "#52525b",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#4ade80",
            animation: "ig-pulse 1.6s ease-in-out infinite",
          }}
        />
        Status auto-refreshes every 15 seconds
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  testId,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  testId?: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#71717a",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        data-testid={testId}
        style={{
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          fontFamily: mono ? "ui-monospace, monospace" : "Inter, sans-serif",
        }}
      >
        {value}
      </div>
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
          fontFamily: "Inter, sans-serif",
        }}
        data-testid="text-selected-plan-name"
      >
        {cleanText(service.name)}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: service.description ? 12 : 0 }}>
        <Pill label="Rate / 1k" value={`₹${Number(service.rate).toFixed(2)}`} highlight />
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
            {cleanText(service.description || "")}
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

/* ── Tab button ─────────────────────────────────────────── */
function TabButton({
  active,
  onClick,
  icon,
  label,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  testId?: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 16px",
        borderRadius: 9,
        border: "none",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        color: active ? "#fff" : "#a1a1aa",
        background: active
          ? "linear-gradient(135deg, #6600ff, #aa44ff)"
          : "transparent",
        boxShadow: active ? "0 4px 14px rgba(102,0,255,0.45)" : "none",
        transition: "all 0.15s ease",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/* ── Orders panel (list + cancel) ───────────────────────── */
function OrdersPanel() {
  const { toast } = useToast();
  const {
    data: orders = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<SmmOrderRow[]>({
    queryKey: ["/api/smm/orders"],
    refetchInterval: 20000,
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("POST", `/api/smm/orders/${orderId}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Cancellation requested" });
      queryClient.invalidateQueries({ queryKey: ["/api/smm/orders"] });
    },
    onError: (err: any) => {
      toast({
        title: "Cancellation failed",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  if (isLoading) return <LoadingState label="Loading your orders…" />;
  if (isError)
    return (
      <ErrorState
        message={(error as any)?.message || "Failed to load orders"}
        onRetry={() => refetch()}
      />
    );

  if (orders.length === 0) {
    return (
      <div
        data-testid="state-no-orders"
        style={{
          padding: 40,
          textAlign: "center",
          color: "#71717a",
          fontSize: 13,
          border: "1px dashed rgba(102,0,255,0.22)",
          borderRadius: 12,
        }}
      >
        <Package
          size={28}
          style={{ margin: "0 auto 10px", display: "block", opacity: 0.5 }}
        />
        You haven't placed any orders yet. Use the "Place Order" tab to get started.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 12, color: "#71717a", fontWeight: 600 }}>
          {orders.length} order{orders.length === 1 ? "" : "s"} · auto-refreshes every 20 seconds
        </div>
        <button
          onClick={() => refetch()}
          data-testid="button-refresh-orders"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid rgba(170,68,255,0.35)",
            background: "rgba(170,68,255,0.12)",
            color: "#d4b3ff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={12} className={isFetching ? "spin" : ""} />
          Refresh
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {orders.map((o) => (
          <OrderRow
            key={o.id}
            order={o}
            onCancel={() => cancelMutation.mutate(o.id)}
            isCanceling={cancelMutation.isPending && cancelMutation.variables === o.id}
          />
        ))}
      </div>
    </div>
  );
}

function OrderRow({
  order,
  onCancel,
  isCanceling,
}: {
  order: SmmOrderRow;
  onCancel: () => void;
  isCanceling: boolean;
}) {
  const statusText = String(order.status || "Pending").toLowerCase();
  const statusColor = statusText.includes("complete")
    ? { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.45)", text: "#4ade80" }
    : statusText.includes("partial")
    ? { bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.45)", text: "#facc15" }
    : statusText.includes("cancel") || statusText.includes("refund")
    ? { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.45)", text: "#fca5a5" }
    : statusText.includes("progress") || statusText.includes("processing")
    ? { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.45)", text: "#93c5fd" }
    : { bg: "rgba(170,68,255,0.12)", border: "rgba(170,68,255,0.45)", text: "#d4b3ff" };

  const delivered =
    order.startCount !== null && order.remains !== null
      ? Math.max(0, order.quantity - order.remains)
      : null;
  const progressPct =
    delivered !== null ? Math.min(100, Math.round((delivered / order.quantity) * 100)) : null;

  // Cancel is meaningful only while the order is still active
  const isFinal =
    statusText.includes("complete") ||
    statusText.includes("cancel") ||
    statusText.includes("refund");
  const canCancel = order.supportsCancel && !isFinal;

  const placedAt = order.createdAt ? new Date(order.createdAt) : null;

  return (
    <div
      data-testid={`card-order-${order.id}`}
      style={{
        padding: 18,
        borderRadius: 14,
        background: "linear-gradient(180deg, rgba(15,5,30,0.85), rgba(8,2,18,0.85))",
        border: "1px solid rgba(102,0,255,0.22)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: "#71717a",
              textTransform: "uppercase",
              letterSpacing: 0.7,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Order #{order.providerOrderId}
          </div>
          <div style={{ fontSize: 14, color: "#fff", fontWeight: 700 }}>
            {cleanText(order.serviceName)}
          </div>
          {placedAt && (
            <div style={{ fontSize: 11, color: "#71717a", marginTop: 4 }}>
              Placed {placedAt.toLocaleString()}
            </div>
          )}
        </div>
        <span
          data-testid={`badge-status-${order.id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 12px",
            borderRadius: 999,
            background: statusColor.bg,
            border: `1px solid ${statusColor.border}`,
            color: statusColor.text,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            whiteSpace: "nowrap",
          }}
        >
          {order.status || "Pending"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <Stat label="Quantity" value={order.quantity.toLocaleString()} />
        <Stat
          label="Charge"
          value={
            order.charge !== null
              ? `${order.currency === "INR" ? "₹" : ""}${order.charge.toFixed(2)}${order.currency && order.currency !== "INR" ? ` ${order.currency}` : ""}`
              : `₹${(Number(order.cost) || 0).toFixed(2)}`
          }
        />
        {order.startCount !== null && (
          <Stat label="Start count" value={order.startCount.toLocaleString()} />
        )}
        {order.remains !== null && (
          <Stat label="Remaining" value={order.remains.toLocaleString()} />
        )}
      </div>

      {progressPct !== null && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#a1a1aa",
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            <span>Delivery progress</span>
            <span style={{ color: "#fff" }}>
              {delivered?.toLocaleString()} / {order.quantity.toLocaleString()} ({progressPct}%)
            </span>
          </div>
          <div
            style={{
              height: 7,
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${ACCENT_DEEP}, ${ACCENT})`,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      )}

      <div
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.06)",
          fontSize: 12,
          color: "#a1a1aa",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 6,
          wordBreak: "break-all",
        }}
      >
        <span style={{ color: "#71717a", flexShrink: 0 }}>Link:</span>
        <a
          href={order.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#d4b3ff",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
          data-testid={`link-target-${order.id}`}
        >
          {order.link}
          <ExternalLink size={11} />
        </a>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        {canCancel ? (
          <button
            onClick={() => {
              if (confirm("Cancel this order? Refunds depend on the provider.")) onCancel();
            }}
            disabled={isCanceling}
            data-testid={`button-cancel-${order.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 9,
              border: "1px solid rgba(239,68,68,0.45)",
              background: "rgba(239,68,68,0.12)",
              color: "#fca5a5",
              fontSize: 12,
              fontWeight: 700,
              cursor: isCanceling ? "not-allowed" : "pointer",
              opacity: isCanceling ? 0.6 : 1,
            }}
          >
            {isCanceling ? <Loader2 size={12} className="spin" /> : <Ban size={12} />}
            {isCanceling ? "Canceling…" : "Cancel order"}
          </button>
        ) : !order.supportsCancel ? (
          <span
            data-testid={`text-no-cancel-${order.id}`}
            style={{
              fontSize: 11,
              color: "#52525b",
              fontStyle: "italic",
              padding: "8px 12px",
            }}
          >
            Cancellation not supported for this plan
          </span>
        ) : null}
      </div>
    </div>
  );
}
