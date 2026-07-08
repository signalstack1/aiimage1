import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Eye, MousePointerClick, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";

interface ChartDay { date: string; views: number; clicks: number; }
interface TopProduct { plan_name: string; views: number; clicks: number; click_rate: number; is_active: boolean; }
interface Kpis { products_live: number; total_members: number; product_views: number; purchase_clicks: number; }
interface OverviewData { kpis: Kpis; chart_30d: ChartDay[]; top_products: TopProduct[]; }

function adminFetch(path: string) {
  const token = sessionStorage.getItem("admin_token") || "";
  return fetch(path, { headers: { Authorization: `Bearer ${token}` } });
}

function pct(a: number, b: number) {
  if (b === 0) return 0;
  return Math.round((a / b) * 1000) / 10;
}

function trend(current: number, prior: number) {
  if (prior === 0) return null;
  const delta = Math.round(((current - prior) / prior) * 100);
  return delta;
}

function Stat({ label, value, sub, loading }: { label: string; value: string; sub?: string; loading: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      {loading ? <Skeleton className="h-8 w-24 mb-1" /> : <p className="text-3xl font-extrabold">{value}</p>}
      <p className="text-sm font-medium mt-1">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function TrendBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const up = delta >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${up ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
      {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(delta)}%
    </span>
  );
}

function BarChart({ data }: { data: ChartDay[] }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.views, d.clicks)), 1);
  const step = Math.ceil(data.length / 10);
  return (
    <div>
      <div className="flex items-end gap-0.5 h-36">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex items-end gap-px group relative">
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
              <p className="font-semibold mb-0.5">{new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary inline-block" />Views: {d.views}</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" />Clicks: {d.clicks}</div>
            </div>
            <div className="flex-1 bg-primary/60 rounded-t-sm hover:bg-primary transition-colors" style={{ height: `${Math.max((d.views / maxVal) * 100, 2)}%` }} />
            <div className="flex-1 bg-amber-400/60 rounded-t-sm hover:bg-amber-400 transition-colors" style={{ height: `${Math.max((d.clicks / maxVal) * 100, 2)}%` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-0.5 mt-1.5">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {i % step === 0 && (
              <p className="text-[9px] text-muted-foreground">{new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-3 rounded-sm bg-primary/60 inline-block" />Views</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-3 rounded-sm bg-amber-400/60 inline-block" />Clicks</span>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("/api/admin/overview")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const chart = data?.chart_30d ?? [];
  const last7 = chart.slice(-7);
  const prev7 = chart.slice(-14, -7);
  const viewsLast7 = last7.reduce((a, d) => a + d.views, 0);
  const viewsPrev7 = prev7.reduce((a, d) => a + d.views, 0);
  const clicksLast7 = last7.reduce((a, d) => a + d.clicks, 0);
  const clicksPrev7 = prev7.reduce((a, d) => a + d.clicks, 0);
  const allViews = data?.kpis.product_views ?? 0;
  const allClicks = data?.kpis.purchase_clicks ?? 0;
  const allMembers = data?.kpis.total_members ?? 0;

  return (
    <AdminLayout>
      <div className="p-8 space-y-7">
        <div>
          <h1 className="text-2xl font-bold mb-0.5">Analytics</h1>
          <p className="text-sm text-muted-foreground">All-time product engagement backed by Supabase event tracking.</p>
        </div>

        {/* Funnel */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Eye className="w-3.5 h-3.5 text-primary" /></div>
              <span className="text-xs text-muted-foreground font-medium">Product Views</span>
            </div>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-3xl font-extrabold">{allViews.toLocaleString()}</p>}
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              Last 7d: {viewsLast7} <TrendBadge delta={trend(viewsLast7, viewsPrev7)} />
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center"><MousePointerClick className="w-3.5 h-3.5 text-amber-400" /></div>
              <span className="text-xs text-muted-foreground font-medium">Purchase Clicks</span>
            </div>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-3xl font-extrabold">{allClicks.toLocaleString()}</p>}
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              Last 7d: {clicksLast7} <TrendBadge delta={trend(clicksLast7, clicksPrev7)} />
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /></div>
              <span className="text-xs text-muted-foreground font-medium">Click-to-View Rate</span>
            </div>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-3xl font-extrabold">{pct(allClicks, allViews)}%</p>}
            <div className="mt-2 text-xs text-muted-foreground">{allMembers.toLocaleString()} total members</div>
          </div>
        </div>

        {/* 30-day chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="font-semibold text-sm mb-1">30-day performance</p>
          <p className="text-xs text-muted-foreground mb-5">Daily product views vs purchase-link clicks</p>
          {loading ? <Skeleton className="h-36 w-full" /> : <BarChart data={chart} />}
        </div>

        {/* Top products */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="font-semibold text-sm">Product breakdown</p>
            <p className="text-xs text-muted-foreground mt-0.5">Last 30 days of tracked engagement per product</p>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !data?.top_products?.length ? (
            <p className="p-6 text-sm text-muted-foreground text-center">No product activity yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Product</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Views</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Clicks</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Click Rate</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">View Share</th>
                  <th className="text-center px-5 py-3 text-xs text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.top_products.map((p) => {
                  const totalViews = data.top_products.reduce((a, x) => a + x.views, 0);
                  const share = pct(p.views, totalViews);
                  return (
                    <tr key={p.plan_name} className="hover:bg-accent/20 transition-colors">
                      <td className="px-5 py-3.5 font-medium">{p.plan_name}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm">{p.views.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm">{p.clicks.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`font-semibold text-sm ${p.click_rate >= 5 ? "text-emerald-400" : p.click_rate >= 2 ? "text-amber-400" : "text-muted-foreground"}`}>
                          {p.click_rate}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-muted-foreground text-sm">{share}%</td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge variant="outline" className={p.is_active ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "text-muted-foreground"}>
                          {p.is_active ? "Live" : "Draft"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
