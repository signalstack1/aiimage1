import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Package, Users, Key,
  BarChart3, Activity, FileText, MessageSquare,
  Shield, Settings, LogOut, ShieldCheck, ChevronRight, Tag,
  Wrench, CalendarCheck, ClipboardList, ShoppingBag,
  Star, Image, Building2,
} from "lucide-react";
import { APP_CONFIG } from "@/config/app";

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
  const cfg = APP_CONFIG.admin;
  return [
    {
      items: [
        { key: "overview",         href: "/admin",                  label: "Overview",             icon: LayoutDashboard },
        { key: "business_profile", href: "/admin/business-profile", label: "Business Profile",     icon: Building2 },
      ],
    },
    {
      // VIA: Applications & Members — enabled in Task 3 (admin dashboard)
      label: "VIA Members",
      items: [
        { key: "applications",  href: "/admin/applications",    label: "Applications",         icon: ClipboardList },
        { key: "members",       href: "/admin/members",         label: "Members",              icon: Users },
        { key: "payment_links", href: "/admin/payment-links",   label: "Payment Links",        icon: Key },
      ],
    },
    {
      label: "Pipeline",
      items: [
        { key: "leads",       href: "/admin/leads",            label: cfg.leads.plural,       icon: ClipboardList },
      ],
    },
    {
      label: "Insights",
      items: [
        { key: "activity",    href: "/admin/activity",         label: "Activity",             icon: Activity },
        { key: "analytics",   href: "/admin/analytics",        label: "Analytics",            icon: BarChart3 },
      ],
    },
    {
      label: "Admin",
      items: [
        { key: "settings",    href: "/admin/settings",         label: "Settings",             icon: Settings },
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

  const isActive = (href: string) =>
    href === "/admin" ? location === "/admin" : location.startsWith(href);

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    window.location.href = "/admin/login";
  };

  const groups = buildNav()
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (item.key === "overview") return true;
        if (item.key === "business_profile") return true;
        return modules[item.key] !== false;
      }),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-60 shrink-0 border-r border-border flex flex-col bg-card/40">
        <div className="h-14 px-4 border-b border-border flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight truncate">{APP_CONFIG.appName}</span>
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
