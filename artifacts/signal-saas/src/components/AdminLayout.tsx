import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, Key,
  BarChart3, Activity, Bell,
  Shield, Settings, LogOut, ChevronRight,
  ClipboardList,
} from "lucide-react";
import { APP_CONFIG } from "@/config/app";
import { TVCLogo } from "@/components/TVCLogo";
import { useEffect, useState } from "react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const LAST_SEEN_KEY = "via_admin_notif_last_seen";

interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

function buildNav(): NavGroup[] {
  return [
    {
      items: [
        { key: "overview",         href: "/admin",                  label: "Overview",         icon: LayoutDashboard },
        { key: "business_profile", href: "/admin/business-profile", label: "Business Profile", icon: Shield },
      ],
    },
    {
      label: "TVC Members",
      items: [
        { key: "applications",  href: "/admin/applications",    label: "Applications",   icon: ClipboardList },
        { key: "members",       href: "/admin/members",         label: "Members",        icon: Users },
        { key: "payment_links", href: "/admin/payment-links",   label: "Payment Links",  icon: Key },
      ],
    },
    {
      label: "Pipeline",
      items: [
        { key: "leads",         href: "/admin/leads",           label: "Leads",          icon: ClipboardList },
      ],
    },
    {
      label: "Insights",
      items: [
        { key: "activity",      href: "/admin/activity",        label: "Activity",       icon: Activity },
        { key: "analytics",     href: "/admin/analytics",       label: "Analytics",      icon: BarChart3 },
      ],
    },
    {
      label: "Admin",
      items: [
        { key: "notifications", href: "/admin/notifications",   label: "Notifications",  icon: Bell },
        { key: "settings",      href: "/admin/settings",        label: "Settings",       icon: Settings },
      ],
    },
    // ── VIA: disabled template nav groups (preserved for future reactivation) ──
    // Shop group: products, categories, customers, orders, access
    // Services group: services, bookings
    // Content group: reviews, gallery, messages, content
    // Admin group: team
  ];
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const modules = APP_CONFIG.adminModules;
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingApplications, setPendingApplications] = useState(0);

  const isActive = (href: string) =>
    href === "/admin" ? location === "/admin" : location.startsWith(href);

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    window.location.href = "/admin/login";
  };

  // Fetch unread notification count
  useEffect(() => {
    const token = sessionStorage.getItem("admin_token") || "";
    if (!token) return;
    const lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY) || "0");
    fetch(`${BASE_URL}/api/admin/via-notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d)) return;
        const unread = d.filter(
          (n: any) => !n.is_read && new Date(n.created_at).getTime() > lastSeen
        ).length;
        setUnreadCount(unread);
      })
      .catch(() => {});
  }, [location]);

  // Fetch pending applications count for the Applications badge
  useEffect(() => {
    const token = sessionStorage.getItem("admin_token") || "";
    if (!token) return;

    const fetchPending = () => {
      fetch(`${BASE_URL}/api/admin/via-overview`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => {
          const pending = d?.applications?.pending ?? 0;
          setPendingApplications(pending);
        })
        .catch(() => {});
    };

    fetchPending();
    const interval = setInterval(fetchPending, 30_000);
    return () => clearInterval(interval);
  }, [location]);

  const groups = buildNav()
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (item.key === "overview") return true;
        if (item.key === "business_profile") return true;
        if (item.key === "notifications") return true;
        return modules[item.key] !== false;
      }),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-60 shrink-0 border-r border-border flex flex-col bg-card/40">
        <div className="h-14 px-4 border-b border-border flex items-center gap-2.5">
          <TVCLogo size={75} />
          <span className="font-bold text-sm tracking-tight truncate">Approved</span>
          <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium shrink-0">Admin</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ key, href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={key}
                      href={href}
                      className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? "text-primary" : ""}`} />
                      <span className="flex-1">{label}</span>
                      {key === "applications" && pendingApplications > 0 && !active && (
                        <span className="text-[10px] font-bold bg-amber-500 text-white rounded-full min-w-[1rem] h-4 px-1 flex items-center justify-center shrink-0">
                          {pendingApplications > 99 ? "99+" : pendingApplications}
                        </span>
                      )}
                      {key === "notifications" && unreadCount > 0 && !active && (
                        <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                      {active && <ChevronRight className="w-3 h-3 opacity-50" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-2 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
