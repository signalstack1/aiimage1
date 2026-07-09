import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList, Users, ArrowUpRight, Activity,
  ShieldCheck, Clock, CheckCircle, XCircle, TrendingUp,
  Eye, MousePointerClick, UserPlus, Radio,
} from "lucide-react";
import { APP_CONFIG } from "@/config/app";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ViaOverview {
  applications: {
    total: number; pending: number; in_review: number;
    approved: number; rejected: number; expired: number;
  };
  members_approved: number;
  leads_by_stage: {
    new: number; contacted: number; replied: number;
    interested: number; converted: number; dead: number;
  };
}

interface ActivityItem {
  id: string;
  event_type: string;
  label: string;
  plan_name: string | null;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function adminFetch(path: string) {
  const token = sessionStorage.getItem("admin_token") || "";
  return fetch(`${BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
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

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color, loading, href,
}: {
  label: string; value: number | string; sub?: string; icon: React.ElementType;
  color: string; loading: boolean; href?: string;
}) {
  const inner = (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 h-full transition-colors hover:border-primary/30">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {loading
        ? <Skeleton className="h-8 w-20" />
        : <p className="text-3xl font-extrabold tracking-tight">{typeof value === "number" ? value.toLocaleString() : value}</p>}
      {sub && !loading && <p className="text-xs text-muted-foreground -mt-1">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

// ── Application Status Bar ────────────────────────────────────────────────────

function AppStatusBar({ data, loading }: { data: ViaOverview["applications"] | null; loading: boolean }) {
  const items = [
    { label: "Pending",   value: data?.pending   ?? 0, cls: "bg-sky-500/70"    },
    { label: "In Review", value: data?.in_review ?? 0, cls: "bg-amber-500/70"  },
    { label: "Approved",  value: data?.approved  ?? 0, cls: "bg-emerald-500/70"},
    { label: "Rejected",  value: data?.rejected  ?? 0, cls: "bg-red-500/70"    },
    { label: "Expired",   value: data?.expired   ?? 0, cls: "bg-muted-foreground/30" },
  ];
  const total = data?.total ?? 0;
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-sm">Applications by Status</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading ? "Loading…" : `${total} total application${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/admin/applications" className="flex items-center gap-1 text-xs text-primary hover:underline">
          View all <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      {loading ? (
        <Skeleton className="h-4 w-full rounded-full mb-3" />
      ) : total > 0 ? (
        <div className="flex gap-0.5 h-3 rounded-full overflow-hidden mb-4">
          {items.map((it) => it.value > 0 && (
            <div
              key={it.label}
              className={`${it.cls} transition-all`}
              style={{ width: `${(it.value / total) * 100}%` }}
              title={`${it.label}: ${it.value}`}
            />
          ))}
        </div>
      ) : (
        <div className="h-3 bg-muted rounded-full mb-4" />
      )}
      <div className="grid grid-cols-5 gap-2">
        {items.map((it) => (
          <div key={it.label} className="text-center">
            <div className={`w-2.5 h-2.5 rounded-full ${it.cls} mx-auto mb-1`} />
            {loading ? <Skeleton className="h-4 w-6 mx-auto" /> : <p className="text-sm font-bold">{it.value}</p>}
            <p className="text-[9px] text-muted-foreground">{it.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Lead Pipeline Snapshot ────────────────────────────────────────────────────

function LeadPipelineBar({ data, loading }: { data: ViaOverview["leads_by_stage"] | null; loading: boolean }) {
  const stages = [
    { key: "new",        label: "New",        cls: "bg-sky-500/70"     },
    { key: "contacted",  label: "Contacted",  cls: "bg-violet-500/70"  },
    { key: "replied",    label: "Replied",    cls: "bg-amber-500/70"   },
    { key: "interested", label: "Interested", cls: "bg-primary/70"     },
    { key: "converted",  label: "Converted",  cls: "bg-emerald-500/70" },
    { key: "dead",       label: "Dead",       cls: "bg-muted-foreground/30" },
  ];
  const totals = stages.map((s) => (data as any)?.[s.key] ?? 0);
  const total = totals.reduce((a, b) => a + b, 0);
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-sm">Lead Pipeline</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading ? "Loading…" : `${total} lead${total !== 1 ? "s" : ""} in pipeline`}
          </p>
        </div>
        <Link href="/admin/leads" className="flex items-center gap-1 text-xs text-primary hover:underline">
          Manage <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-6 w-full rounded" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {stages.map((s, i) => {
            const count = totals[i];
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground w-16 shrink-0 text-right">{s.label}</p>
                <div className="flex-1 h-5 bg-muted/30 rounded-md overflow-hidden">
                  <div className={`h-full ${s.cls} rounded-md transition-all`} style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }} />
                </div>
                <p className="text-xs font-bold w-6 text-right">{count}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

const EVENT_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  application_submit: { icon: ClipboardList, color: "text-primary bg-primary/10",           label: "Application submitted" },
  document_upload:    { icon: ArrowUpRight,  color: "text-sky-400 bg-sky-400/10",            label: "Document uploaded" },
  member_join:        { icon: UserPlus,      color: "text-violet-400 bg-violet-400/10",      label: "Member joined" },
  product_view:       { icon: Eye,           color: "text-primary bg-primary/10",            label: "Product viewed" },
  purchase_click:     { icon: MousePointerClick, color: "text-amber-400 bg-amber-400/10",    label: "Purchase clicked" },
  product_publish:    { icon: Radio,         color: "text-emerald-400 bg-emerald-400/10",    label: "Product published" },
};

function ActivityFeed({ items, loading }: { items: ActivityItem[]; loading: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-border">
        <p className="font-semibold text-sm">Recent Activity</p>
        <p className="text-xs text-muted-foreground mt-0.5">Platform events across all VIA activity</p>
      </div>
      <div className="divide-y divide-border">
        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1"><Skeleton className="h-3.5 w-48" /><Skeleton className="h-3 w-20" /></div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">No activity yet. Events appear here as members interact with VIA.</p>
        ) : (
          items.map((item) => {
            const meta = EVENT_META[item.event_type] ?? { icon: Activity, color: "text-muted-foreground bg-muted", label: item.event_type };
            const Icon = meta.icon;
            return (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/20 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.label || meta.label}</p>
                  {item.plan_name && <p className="text-xs text-muted-foreground">{item.plan_name}</p>}
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
  const [viaData, setViaData]   = useState<ViaOverview | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setActivityLoading(true);

    adminFetch("/api/admin/via-overview")
      .then((r) => r.json())
      .then(setViaData)
      .catch(() => {})
      .finally(() => setLoading(false));

    adminFetch("/api/admin/activity")
      .then((r) => r.json())
      .then((d) => setActivity(Array.isArray(d) ? d.slice(0, 15) : []))
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminLayout>
      <div className="p-8 space-y-7">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-0.5">Overview</h1>
            <p className="text-sm text-muted-foreground">{APP_CONFIG.appName} at a glance.</p>
          </div>
          <button
            onClick={load}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 border border-border rounded-lg px-3 py-2"
          >
            <TrendingUp className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* VIA KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Applications"
            value={viaData?.applications.total ?? 0}
            icon={ClipboardList}
            color="bg-primary/10 text-primary"
            loading={loading}
            href="/admin/applications"
          />
          <KpiCard
            label="Approved Members"
            value={viaData?.members_approved ?? 0}
            sub="VIA numbers assigned"
            icon={ShieldCheck}
            color="bg-emerald-500/10 text-emerald-400"
            loading={loading}
            href="/admin/members"
          />
          <KpiCard
            label="Pending Review"
            value={(viaData?.applications.pending ?? 0) + (viaData?.applications.in_review ?? 0)}
            sub="Need attention"
            icon={Clock}
            color="bg-amber-500/10 text-amber-400"
            loading={loading}
            href="/admin/applications?status=pending"
          />
          <KpiCard
            label="Pipeline Leads"
            value={Object.values(viaData?.leads_by_stage ?? {}).reduce((a, b) => a + b, 0)}
            sub="Active prospects"
            icon={Users}
            color="bg-violet-500/10 text-violet-400"
            loading={loading}
            href="/admin/leads"
          />
        </div>

        {/* Application status bar + Lead pipeline */}
        <div className="grid lg:grid-cols-2 gap-6">
          <AppStatusBar data={viaData?.applications ?? null} loading={loading} />
          <LeadPipelineBar data={viaData?.leads_by_stage ?? null} loading={loading} />
        </div>

        {/* Activity feed */}
        {APP_CONFIG.adminModules.activity !== false && (
          <ActivityFeed items={activity} loading={activityLoading} />
        )}
      </div>
    </AdminLayout>
  );
}
