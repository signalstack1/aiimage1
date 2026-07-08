import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Eye, MousePointerClick, Radio, UserPlus,
  ArrowUpRight, RefreshCw, ChevronDown,
} from "lucide-react";

interface ActivityEvent {
  id: string;
  event_type: string;
  label: string;
  plan_name: string | null;
  created_at: string;
}

const EVENT_TYPES = [
  { key: "all",             label: "All events" },
  { key: "product_view",    label: "Views" },
  { key: "purchase_click",  label: "Clicks" },
  { key: "member_join",     label: "Joins" },
  { key: "product_publish", label: "Publishes" },
];

const EVENT_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  product_view:    { icon: Eye,              color: "text-primary",      bg: "bg-primary/10" },
  purchase_click:  { icon: MousePointerClick, color: "text-amber-400",   bg: "bg-amber-400/10" },
  product_publish: { icon: Radio,            color: "text-emerald-400",  bg: "bg-emerald-400/10" },
  member_join:     { icon: UserPlus,         color: "text-violet-400",   bg: "bg-violet-400/10" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function adminFetch(path: string) {
  const token = sessionStorage.getItem("admin_token") || "";
  return fetch(path, { headers: { Authorization: `Bearer ${token}` } });
}

const PAGE_SIZE = 50;

export default function AdminActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState("all");
  const [offset, setOffset] = useState(0);

  const load = useCallback(async (type: string, off: number, append = false) => {
    if (off === 0) setLoading(true); else setLoadingMore(true);
    try {
      const r = await adminFetch(`/api/admin/activity?type=${type}&limit=${PAGE_SIZE}&offset=${off}`);
      const data = await r.json();
      setEvents((prev) => append ? [...prev, ...(data.events || [])] : (data.events || []));
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setOffset(0);
    load(filter, 0, false);
  }, [filter, load]);

  const handleLoadMore = () => {
    const next = offset + PAGE_SIZE;
    setOffset(next);
    load(filter, next, true);
  };

  const hasMore = events.length < total;

  return (
    <AdminLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-0.5">Activity</h1>
            <p className="text-sm text-muted-foreground">
              {total > 0 ? `${total.toLocaleString()} events recorded` : "Platform event log"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(filter, 0, false)}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 w-fit">
          {EVENT_TYPES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${filter === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Event list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-56" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : !events.length ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">No events recorded yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Events appear here as users visit your landing page and interact with products.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {events.map((event) => {
                const meta = EVENT_META[event.event_type] ?? { icon: ArrowUpRight, color: "text-muted-foreground", bg: "bg-muted" };
                const Icon = meta.icon;
                return (
                  <div key={event.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/20 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.label}</p>
                      {event.plan_name && (
                        <p className="text-xs text-muted-foreground">{event.plan_name}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{timeAgo(event.created_at)}</p>
                      <p className="text-[10px] text-muted-foreground/50">{new Date(event.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasMore && !loading && (
            <div className="border-t border-border p-4 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                {loadingMore ? "Loading…" : (
                  <><ChevronDown className="w-4 h-4" /> Load more ({total - events.length} remaining)</>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
