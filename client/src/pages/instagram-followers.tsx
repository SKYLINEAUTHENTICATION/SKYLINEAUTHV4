import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Instagram,
  Search,
  ArrowUpDown,
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
  Link as LinkIcon,
  Hash,
  Repeat,
  Timer,
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

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "name">("price-asc");
  const [selected, setSelected] = useState<SmmService | null>(null);

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
        setQuantity("");
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

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = services.filter((s) => {
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        String(s.service).includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      const ra = Number(a.rate) || 0;
      const rb = Number(b.rate) || 0;
      return sortBy === "price-asc" ? ra - rb : rb - ra;
    });
    return list;
  }, [services, search, sortBy]);

  // Identify the cheapest service (gets the "Recommended" badge)
  const cheapestId = useMemo(() => {
    if (services.length === 0) return null;
    const cheapest = [...services].sort(
      (a, b) => (Number(a.rate) || 0) - (Number(b.rate) || 0),
    )[0];
    return cheapest ? String(cheapest.service) : null;
  }, [services]);

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
        maxWidth: 1280,
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

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: "1 1 280px",
            minWidth: 240,
          }}
        >
          <Search
            size={15}
            style={{
              position: "absolute",
              top: "50%",
              left: 12,
              transform: "translateY(-50%)",
              color: "#52525b",
            }}
          />
          <input
            data-testid="input-search-services"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services…"
            style={{
              width: "100%",
              padding: "10px 12px 10px 34px",
              borderRadius: 10,
              border: "1px solid rgba(102,0,255,0.22)",
              background: "rgba(15,5,30,0.6)",
              color: "#fff",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid rgba(102,0,255,0.22)",
            background: "rgba(15,5,30,0.6)",
          }}
        >
          <ArrowUpDown size={14} color="#52525b" />
          <select
            data-testid="select-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              background: "transparent",
              color: "#fff",
              border: "none",
              outline: "none",
              fontSize: 13,
              padding: "10px 0",
            }}
          >
            <option value="price-asc" style={{ background: "#0a0014" }}>
              Cheapest first
            </option>
            <option value="price-desc" style={{ background: "#0a0014" }}>
              Most expensive
            </option>
            <option value="name" style={{ background: "#0a0014" }}>
              Name (A→Z)
            </option>
          </select>
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <LoadingState label="Loading services…" />
      ) : isError ? (
        <ErrorState
          message={(error as any)?.message || "Failed to load services"}
          onRetry={() => refetch()}
        />
      ) : filteredSorted.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {filteredSorted.map((s) => {
            const isSelected =
              selected && String(selected.service) === String(s.service);
            const isCheapest = String(s.service) === cheapestId;
            return (
              <ServiceCard
                key={String(s.service)}
                service={s}
                isSelected={!!isSelected}
                isRecommended={isCheapest}
                onClick={() => {
                  setSelected(s);
                  // initialize quantity to min if empty / out of range
                  const min = Number(s.min) || 0;
                  const cur = Number(quantity) || 0;
                  if (!cur || cur < min) setQuantity(String(min));
                }}
              />
            );
          })}
        </div>
      )}

      {/* Order modal */}
      {selected && (
        <OrderModal
          service={selected}
          link={link}
          setLink={setLink}
          quantity={quantity}
          setQuantity={setQuantity}
          useDripfeed={useDripfeed}
          setUseDripfeed={setUseDripfeed}
          runs={runs}
          setRuns={setRuns}
          interval={interval}
          setIntervalVal={setIntervalVal}
          totalCost={totalCost}
          qtyValid={qtyValid}
          minNum={minNum}
          maxNum={maxNum}
          submitting={orderMutation.isPending}
          canSubmit={canSubmit}
          onClose={() => setSelected(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

/* ── Service card ─────────────────────────────────────────── */
function ServiceCard({
  service,
  isSelected,
  isRecommended,
  onClick,
}: {
  service: SmmService;
  isSelected: boolean;
  isRecommended: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={`card-service-${service.service}`}
      style={{
        textAlign: "left",
        padding: 16,
        borderRadius: 14,
        background: isSelected
          ? "linear-gradient(180deg, rgba(102,0,255,0.16), rgba(15,5,30,0.6))"
          : "rgba(15,5,30,0.55)",
        border: `1px solid ${isSelected ? ACCENT : "rgba(102,0,255,0.22)"}`,
        cursor: "pointer",
        transition: "all 0.18s ease",
        position: "relative",
        boxShadow: isSelected ? "0 8px 28px rgba(102,0,255,0.25)" : "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = ACCENT;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        if (!isSelected)
          e.currentTarget.style.borderColor = "rgba(102,0,255,0.22)";
      }}
    >
      {isRecommended && (
        <div
          data-testid={`badge-recommended-${service.service}`}
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
        data-testid={`text-service-id-${service.service}`}
      >
        ID #{service.service}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#fff",
          marginBottom: 10,
          lineHeight: 1.35,
          paddingRight: isRecommended ? 110 : 0,
        }}
        data-testid={`text-service-name-${service.service}`}
      >
        {service.name}
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <Pill label="Rate / 1k" value={`$${Number(service.rate).toFixed(4)}`} highlight />
        <Pill label="Min" value={String(service.min)} />
        <Pill label="Max" value={String(service.max)} />
      </div>

      {service.description ? (
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "#a1a1aa",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
          data-testid={`text-service-desc-${service.service}`}
        >
          {service.description}
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: 12, color: "#52525b", fontStyle: "italic" }}>
          {service.category}
        </p>
      )}
    </button>
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

/* ── Order modal ─────────────────────────────────────────── */
function OrderModal(props: {
  service: SmmService;
  link: string;
  setLink: (v: string) => void;
  quantity: string;
  setQuantity: (v: string) => void;
  useDripfeed: boolean;
  setUseDripfeed: (v: boolean) => void;
  runs: string;
  setRuns: (v: string) => void;
  interval: string;
  setIntervalVal: (v: string) => void;
  totalCost: number;
  qtyValid: boolean;
  minNum: number;
  maxNum: number;
  submitting: boolean;
  canSubmit: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const {
    service,
    link,
    setLink,
    quantity,
    setQuantity,
    useDripfeed,
    setUseDripfeed,
    runs,
    setRuns,
    interval,
    setIntervalVal,
    totalCost,
    qtyValid,
    minNum,
    maxNum,
    submitting,
    canSubmit,
    onClose,
    onSubmit,
  } = props;

  const supportsDripfeed = !!service.dripfeed;

  return (
    <div
      data-testid="modal-order"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          background: "linear-gradient(180deg, #100527, #050010)",
          border: `1px solid rgba(170,68,255,0.3)`,
          borderRadius: 16,
          boxShadow: "0 30px 80px rgba(102,0,255,0.35)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(102,0,255,0.22)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                color: "#71717a",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              Place order · ID #{service.service}
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                color: "#fff",
                fontWeight: 700,
                lineHeight: 1.35,
              }}
              data-testid="text-modal-service-name"
            >
              {service.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            data-testid="button-close-modal"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: 6,
              cursor: "pointer",
              color: "#a1a1aa",
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <Field
            icon={<LinkIcon size={14} />}
            label="Instagram profile / post link"
          >
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

          {supportsDripfeed && (
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
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
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
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid rgba(102,0,255,0.22)",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            data-testid="button-cancel-order"
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "transparent",
              color: "#a1a1aa",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            data-testid="button-place-order"
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.5,
              background: `linear-gradient(135deg, ${ACCENT_DEEP}, ${ACCENT})`,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              boxShadow: "0 6px 22px rgba(102,0,255,0.4)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {submitting ? <Loader2 size={14} className="spin" /> : null}
            {submitting ? "Placing…" : "Place Order"}
          </button>
        </div>
      </div>
      <style>{`
        .spin { animation: ig-spin 0.9s linear infinite; }
        @keyframes ig-spin { to { transform: rotate(360deg); } }
      `}</style>
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
      <style>{`
        .spin { animation: ig-spin 0.9s linear infinite; }
        @keyframes ig-spin { to { transform: rotate(360deg); } }
      `}</style>
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
      No Instagram Followers services match your search.
    </div>
  );
}
