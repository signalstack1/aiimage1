import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Package, Users, Eye, MousePointerClick,
  TrendingUp, ShoppingCart, UserPlus, Radio,
  ArrowUpRight,
} from "lucide-react";
import { APP_CONFIG } from "@/config/app";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Kpis {
  products_live: number;
  total_members: number;
  product_views: number;
  purchase_clicks: number;
}

interface ChartDay {
  date: string;
  views: number;
  clicks: number;
}

interface TopProduct {
  plan_name: string;
  views: number;
  clicks: number;
  click_rate: number;
  is_active: boolean;
}

interface ActivityItem {
  id: string;
  event_type: string;
  label: string;
  plan_name: string | null;
  created_at: string;
}

interface OverviewData {
  kpis: Kpis;
  chart_30d: ChartDay[];
  top_products: TopProduct[];
  recent_activity: ActivityItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function adminFetch(path: string) {
  const token = sessionStorage.getItem("admin_token") || "";
  return fetch(path, { headers: { Authorization: `Bearer ${token}` } });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(iso: string, long = false): string {
  const d = new Date(iso);
  if (long) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).replace(/\s/g, "\n");
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, color, loading,
}: {
  label: string; value: number | string; icon: React.ElementType;
  color: string; loading: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {loading
        ? <Skeleton className="h-8 w-20" />
        : <p className="text-3xl font-extrabold tracking-tight">{value.toLocaleString()}</p>}
    </div>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────

function PerformanceChart({ data, range, onRange }: {
  data: ChartDay[];
  range: "7d" | "30d";
  onRange: (r: "7d" | "30d") => void;
}) {
  const sliced = range === "7d" ? data.slice(-7) : data;
  const maxVal = Math.max(...sliced.map((d) => Math.max(d.views, d.clicks)), 1);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-semibold text-sm">Views vs Clicks</p>
          <p className="text-xs text-muted-foreground mt-0.5">Product page views compared to checkout button clicks</p>
        </div>
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
          {(["7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => onRange(r)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${range === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {r === "7d" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
      </div>

      {/* Chart bars */}
      <div className="flex items-end gap-1 h-32 mb-2">
        {sliced.map((d) => (
          <div key={d.date} className="flex-1 flex items-end gap-px group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg px-3 py-2 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
              <p className="font-semibold mb-1">{fmtDate(d.date, true)}</p>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-primary inline-block" /> Views: {d.views}</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" /> Clicks: {d.clicks}</div>
            </div>
            <div
              className="flex-1 bg-primary/70 rounded-t-sm transition-all hover:bg-primary"
              style={{ height: `${Math.max((d.views / maxVal) * 100, 2)}%` }}
            />
            <div
              className="flex-1 bg-amber-400/70 rounded-t-sm transition-all hover:bg-amber-400"
              style={{ height: `${Math.max((d.clicks / maxVal) * 100, 2)}%` }}
            />
          </div>
        ))}
      </div>

      {/* X-axis labels — show every Nth to avoid crowding */}
      <div className="flex gap-1">
        {sliced.map((d, i) => {
          const step = range === "7d" ? 1 : 5;
          const show = i % step === 0 || i === sliced.length - 1;
          return (
            <div key={d.date} className="flex-1 text-center">
              {show && (
                <p className="text-[9px] text-muted-foreground leading-tight">
                  {fmtDate(d.date, true).replace(",", "")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-3 rounded-sm bg-primary/70 inline-block" /> Product Views
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-3 rounded-sm bg-amber-400/70 inline-block" /> Purchase Clicks
        </div>
      </div>
    </div>
  );
}

// ── Top Products Table ────────────────────────────────────────────────────────

function TopProductsTable({ products, loading }: { products: TopProduct[]; loading: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <p className="font-semibold text-sm">Top Performing Products</p>
        <p className="text-xs text-muted-foreground mt-0.5">Last 30 days of tracked activity</p>
      </div>
      {loading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : products.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground text-center">No product activity recorded yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Product</th>
              <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Views</th>
              <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Clicks</th>
              <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Click Rate</th>
              <th className="text-center px-5 py-3 text-xs text-muted-foreground font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => (
              <tr key={p.plan_name} className="hover:bg-accent/20 transition-colors">
                <td className="px-5 py-3.5 font-medium">{p.plan_name}</td>
                <td className="px-4 py-3.5 text-right font-mono text-sm">{p.views.toLocaleString()}</td>
                <td className="px-4 py-3.5 text-right font-mono text-sm">{p.clicks.toLocaleString()}</td>
                <td className="px-4 py-3.5 text-right">
                  <span className={`font-semibold text-sm ${p.click_rate >= 5 ? "text-emerald-400" : p.click_rate >= 2 ? "text-amber-400" : "text-muted-foreground"}`}>
                    {p.click_rate}%
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <Badge
                    variant="outline"
                    className={p.is_active ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-border text-muted-foreground"}
                  >
                    {p.is_active ? "Live" : "Draft"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

const EVENT_META: Record<string, { icon: React.ElementType; color: string }> = {
  product_view:    { icon: Eye,              color: "text-primary bg-primary/10" },
  purchase_click:  { icon: MousePointerClick, color: "text-amber-400 bg-amber-400/10" },
  product_publish: { icon: Radio,            color: "text-emerald-400 bg-emerald-400/10" },
  member_join:     { icon: UserPlus,         color: "text-violet-400 bg-violet-400/10" },
};

function ActivityFeed({ items, loading }: { items: ActivityItem[]; loading: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <p className="font-semibold text-sm">Recent Activity</p>
        <p className="text-xs text-muted-foreground mt-0.5">Latest platform events across all products</p>
      </div>
      <div className="divide-y divide-border">
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">No activity recorded yet. Events will appear here as users interact with your products.</p>
        ) : (
          items.map((item) => {
            const meta = EVENT_META[item.event_type] ?? { icon: ArrowUpRight, color: "text-muted-foreground bg-muted" };
            const Icon = meta.icon;
            return (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/20 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  {item.plan_name && (
                    <p className="text-xs text-muted-foreground">{item.plan_name}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground shrink-0">{timeAgo(item.created_at)}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState<"7d" | "30d">("7d");

  const load = useCallback(() => {
    setLoading(true);
    adminFetch("/api/admin/overview")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const modules = APP_CONFIG.adminModules;
  const adminCfg = APP_CONFIG.admin;
  // `as const` on module keys lets TypeScript validate them against adminModules type.
  // `.map(({ module: _m, ...rest }) => rest)` strips the key before spreading into KpiCard.
  const kpis = [
    { module: "products"  as const, label: `${adminCfg.products.plural} Live`,    value: data?.kpis?.products_live  ?? 0, icon: Package,           color: "bg-primary/10 text-primary" },
    { module: "customers" as const, label: `Total ${adminCfg.customers.plural}`,  value: data?.kpis?.total_members  ?? 0, icon: Users,             color: "bg-violet-500/10 text-violet-400" },
    { module: "analytics" as const, label: `${adminCfg.products.singular} Views`, value: data?.kpis?.product_views  ?? 0, icon: Eye,               color: "bg-sky-500/10 text-sky-400" },
    { module: "analytics" as const, label: "Purchase Clicks",                      value: data?.kpis?.purchase_clicks ?? 0, icon: MousePointerClick, color: "bg-amber-500/10 text-amber-400" },
  ]
    .filter((k) => modules[k.module] !== false)
    .map(({ module: _m, ...rest }) => rest);

  return (
    <AdminLayout>
      <div className="p-8 space-y-7">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-0.5">Overview</h1>
            <p className="text-sm text-muted-foreground">{APP_CONFIG.appName} performance at a glance.</p>
          </div>
          <button
            onClick={load}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 border border-border rounded-lg px-3 py-2"
          >
            <TrendingUp className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} loading={loading} />
          ))}
        </div>

        {/* Chart — hidden when analytics module is off */}
        {modules.analytics !== false && (
          loading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : data?.chart_30d ? (
            <PerformanceChart data={data.chart_30d} range={chartRange} onRange={setChartRange} />
          ) : null
        )}

        {/* Bottom panels — each hidden when its parent module is off */}
        {(modules.analytics !== false || modules.activity !== false) && (
          <div className="grid lg:grid-cols-5 gap-6">
            {modules.analytics !== false && (
              <div className={modules.activity !== false ? "lg:col-span-3" : "lg:col-span-5"}>
                <TopProductsTable products={data?.top_products ?? []} loading={loading} />
              </div>
            )}
            {modules.activity !== false && (
              <div className={modules.analytics !== false ? "lg:col-span-2" : "lg:col-span-5"}>
                <ActivityFeed items={data?.recent_activity ?? []} loading={loading} />
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
