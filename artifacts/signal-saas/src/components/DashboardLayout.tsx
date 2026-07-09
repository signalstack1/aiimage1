import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, User, FileText, Award,
  Bell, CreditCard, LogOut, ChevronRight,
} from "lucide-react";
import { TVCLogo } from "@/components/TVCLogo";
import { useAuth } from "@/hooks/useAuth";
import { APP_CONFIG } from "@/config/app";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const NAV: NavItem[] = [
  { href: "/dashboard",               label: "Overview",           icon: LayoutDashboard },
  { href: "/dashboard/profile",       label: "My Profile",         icon: User },
  { href: "/dashboard/documents",     label: "Documents",          icon: FileText },
  { href: "/dashboard/badge",         label: "Badge & Referral",   icon: Award },
  { href: "/dashboard/notifications", label: "Notifications",      icon: Bell },
  { href: "/dashboard/membership",    label: "Membership",         icon: CreditCard },
];

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved:  "bg-emerald-500/15 text-emerald-400",
    in_review: "bg-amber-500/15 text-amber-400",
    pending:   "bg-sky-500/15 text-sky-400",
    rejected:  "bg-red-500/15 text-red-400",
    expired:   "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    approved: "Verified", in_review: "In Review",
    pending: "Pending", rejected: "Rejected", expired: "Expired",
  };
  const cls = map[status] ?? map.pending;
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{labels[status] ?? status}</span>;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut, member, user } = useAuth();

  const isActive = (href: string) =>
    href === "/dashboard" ? location === "/dashboard" : location.startsWith(href);

  const status = member?.application?.status ?? "pending";
  const viaNumber = member?.business?.via_number;
  const businessName = member?.business?.business_name ?? user?.email ?? "My Business";

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border flex flex-col bg-card/40">
        {/* Logo */}
        <div className="h-14 px-4 border-b border-border flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2">
            <TVCLogo size={28} />
            <span className="font-bold text-sm tracking-tight truncate">Approved</span>
          </Link>
        </div>

        {/* Member identity */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs text-muted-foreground truncate mb-1">{businessName}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold font-mono">
              {viaNumber ?? "Pending…"}
            </span>
            <StatusPill status={status} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-primary" : ""}`} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-3 h-3 opacity-50" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-border">
          <button
            onClick={() => signOut().then(() => { window.location.href = "/login"; })}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
