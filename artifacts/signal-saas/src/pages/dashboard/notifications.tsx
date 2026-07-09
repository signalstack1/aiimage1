import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Circle, CheckCircle2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export default function DashboardNotifications() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]   = useState(true);
  const [marking, setMarking]   = useState(false);

  const token = session?.access_token;

  const load = async () => {
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${BASE_URL}/api/member/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setNotifications(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  const markAsRead = async (id: string) => {
    if (!token) return;
    await fetch(`${BASE_URL}/api/member/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!token) return;
    setMarking(true);
    await fetch(`${BASE_URL}/api/member/notifications/read-all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setMarking(false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl">
        <div className="flex items-center justify-between mb-1 gap-4">
          <h1 className="text-2xl font-extrabold">Notifications</h1>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={markAllRead}
              disabled={marking}
              className="text-xs"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>
        <p className="text-muted-foreground mb-8">Status updates and messages from VIA Secured.</p>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <Bell className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">We'll notify you here when your verification status changes.</p>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`relative bg-card border rounded-xl p-4 transition-colors ${n.is_read ? "border-border" : "border-primary/30 bg-primary/3"}`}
              >
                {/* Unread dot */}
                {!n.is_read && (
                  <div className="absolute top-4 right-4">
                    <Circle className="w-2.5 h-2.5 fill-primary text-primary" />
                  </div>
                )}

                <div className="flex items-start gap-3 pr-6">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${n.is_read ? "bg-muted" : "bg-primary/10 border border-primary/20"}`}>
                    {n.is_read
                      ? <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                      : <Bell className="w-4 h-4 text-primary" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold mb-0.5 ${n.is_read ? "" : "text-foreground"}`}>{n.title}</p>
                    {n.body && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{n.body}</p>
                    )}
                    <div className="flex items-center justify-between mt-2 gap-3 flex-wrap">
                      <p className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                      {!n.is_read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead(n.id)}
                          className="h-7 text-xs text-muted-foreground"
                        >
                          Mark as read
                        </Button>
                      )}
                      {n.link && (
                        <a href={n.link} className="text-xs text-primary hover:underline">View →</a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
