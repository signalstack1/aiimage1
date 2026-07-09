import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Bell, ClipboardList, FileText, ShieldCheck, CheckCircle, ExternalLink } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const LAST_SEEN_KEY = "via_admin_notif_last_seen";

type NotifType = "new_application" | "document_upload" | "status_change" | "system";

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_META: Record<NotifType, { icon: React.ElementType; color: string }> = {
  new_application: { icon: ClipboardList, color: "text-primary bg-primary/10" },
  document_upload: { icon: FileText,      color: "text-sky-400 bg-sky-400/10" },
  status_change:   { icon: ShieldCheck,   color: "text-emerald-400 bg-emerald-400/10" },
  system:          { icon: Bell,          color: "text-muted-foreground bg-muted" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function isLocallyRead(notif: Notif, lastSeen: number): boolean {
  return notif.is_read || new Date(notif.created_at).getTime() <= lastSeen;
}

export default function AdminNotificationsPage() {
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(() => Number(localStorage.getItem(LAST_SEEN_KEY) || "0"));

  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const load = () => {
    setLoading(true);
    fetch(`${BASE_URL}/api/admin/via-notifications`, { headers })
      .then((r) => r.json())
      .then((d) => setNotifs(Array.isArray(d) ? d : []))
      .catch(() => setNotifs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    setMarking(true);
    try {
      const now = Date.now();
      await fetch(`${BASE_URL}/api/admin/via-notifications/mark-all-read`, { method: "POST", headers });
      localStorage.setItem(LAST_SEEN_KEY, String(now));
      setLastSeen(now);
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch { /* silent */ } finally { setMarking(false); }
  };

  const unreadCount = notifs.filter((n) => !isLocallyRead(n, lastSeen)).length;

  return (
    <AdminLayout>
      <div className="p-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6" /> Notifications
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Recent applications, document uploads, and status changes.
            </p>
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={markAllRead} disabled={marking}>
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              {marking ? "Marking…" : `Mark all read (${unreadCount})`}
            </Button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl">
                <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64" /></div>
              </div>
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-16 text-center">
            <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map((notif) => {
              const read = isLocallyRead(notif, lastSeen);
              const meta = TYPE_META[notif.type] ?? TYPE_META.system;
              const Icon = meta.icon;
              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 p-4 bg-card border rounded-xl transition-colors ${read ? "border-border opacity-70" : "border-primary/30 bg-primary/5"}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${meta.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${read ? "" : "text-foreground"}`}>{notif.title}</p>
                        {notif.body && <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{timeAgo(notif.created_at)}</span>
                    </div>
                    {notif.link && (
                      <Link href={notif.link} className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1.5">
                        View <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  {!read && (
                    <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-3" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
