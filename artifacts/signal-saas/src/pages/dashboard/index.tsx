import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, User, FileText, Award, Bell, CreditCard,
  CheckCircle2, XCircle, Clock, ArrowRight, AlertTriangle, ExternalLink,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface Check { check_type: string; status: "verified" | "unverified" | "pending"; checked_at: string | null }

const CHECK_LABELS: Record<string, string> = {
  local_address:     "Local Address",
  business_type:     "Business Type",
  insurance:         "Public Liability Insurance",
  accreditations:    "Trade Accreditations",
  digital_footprint: "Digital Footprint",
  public_records:    "Contact & Public Records",
};

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    approved:        { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "TVC Verified ✓" },
    in_review:       { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",       label: "In Review" },
    pending:         { cls: "bg-sky-500/15 text-sky-400 border-sky-500/30",              label: "Pending Review" },
    pending_payment: { cls: "bg-orange-500/15 text-orange-400 border-orange-500/30",    label: "Pending Payment" },
    rejected:        { cls: "bg-red-500/15 text-red-400 border-red-500/30",             label: "Rejected" },
    expired:         { cls: "bg-muted text-muted-foreground border-border",             label: "Expired" },
  };
  const c = cfg[status] ?? cfg.pending;
  return <Badge className={`border ${c.cls} text-sm px-3 py-1 font-semibold`}>{c.label}</Badge>;
}

const QUICK_LINKS = [
  { href: "/dashboard/profile",       icon: User,       label: "Edit Profile",        sub: "Update your business details" },
  { href: "/dashboard/documents",     icon: FileText,   label: "Upload Documents",    sub: "Insurance & accreditations" },
  { href: "/dashboard/badge",         icon: Award,      label: "Download Badge",      sub: "Digital verification badge" },
  { href: "/dashboard/notifications", icon: Bell,       label: "Notifications",       sub: "Status updates & messages" },
  { href: "/dashboard/membership",    icon: CreditCard, label: "Membership",          sub: "Manage your subscription" },
];

export default function DashboardHome() {
  const { member, fetchWithAuth } = useAuth();
  const [checks, setChecks] = useState<Check[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  useEffect(() => {
    fetchWithAuth(`${BASE_URL}/api/member/verification-checks`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setChecks(data); })
      .catch(() => {});

    fetchWithAuth(`${BASE_URL}/api/member/notifications`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setNotifCount(data.filter((n: any) => !n.is_read).length); })
      .catch(() => {});

    fetch(`${BASE_URL}/api/payment-links`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          const pl = data.find((l: any) => l.slug === "via-membership");
          if (pl?.url) setPaymentLink(pl.url);
        }
      })
      .catch(() => {});
  }, []);

  const status = member?.application?.status ?? "pending";
  const viaNumber = member?.business?.via_number;
  const biz = member?.business;

  // Fill in missing checks with pending stubs
  const allCheckTypes = Object.keys(CHECK_LABELS);
  const checkMap: Record<string, Check["status"]> = {};
  for (const c of checks) checkMap[c.check_type] = c.status;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl">
        <h1 className="text-2xl font-extrabold mb-1">
          {biz?.business_name ? `Welcome, ${biz.business_name}` : "Member Dashboard"}
        </h1>
        <p className="text-muted-foreground mb-8">Your TVC verification status and quick links.</p>

        {/* VIA number hero card */}
        <div className={`rounded-2xl border p-6 mb-6 ${status === "approved" ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${status === "approved" ? "gradient-brand" : "bg-muted"}`}>
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Your TVC Number</p>
                <p className="text-3xl font-extrabold font-mono tracking-tight">
                  {viaNumber ?? "Pending…"}
                </p>
                {!viaNumber && (
                  <p className="text-xs text-muted-foreground mt-1">Assigned on approval</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <StatusBadge status={status} />
              {member?.application?.updated_at && (
                <p className="text-xs text-muted-foreground">
                  Last updated {new Date(member.application.updated_at).toLocaleDateString("en-GB")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* No business record warning */}
        {!member && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 mb-6 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-400 mb-1">Account not linked to an application</p>
              <p className="text-sm text-muted-foreground">Your account hasn't been linked to a TVC application yet. If you've already applied, contact us at {APP_CONFIG_EMAIL}.</p>
            </div>
          </div>
        )}

        {/* Pending payment banner */}
        {status === "pending_payment" && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-400 mb-1">Payment confirmation pending</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your account has been created. We are waiting for payment confirmation before your verification begins. If you haven't paid yet, please use the button below.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pl-8">
              {paymentLink ? (
                <Button
                  onClick={() => window.open(paymentLink, "_blank", "noopener")}
                  className="gradient-brand text-white border-0 hover:opacity-90 font-semibold"
                  size="sm"
                >
                  Complete Payment — £20/month
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Payment link loading…</p>
              )}
              <a
                href={`mailto:${APP_CONFIG_EMAIL}`}
                className="text-sm text-primary hover:underline flex items-center"
              >
                Contact support
              </a>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Verification checks */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold mb-1">Verification checks</h2>
            <p className="text-xs text-muted-foreground mb-4">Your 6 independent checks — updated as we verify each item.</p>
            <div className="space-y-0">
              {allCheckTypes.map((ct) => {
                const s = checkMap[ct] ?? "pending";
                return (
                  <div key={ct} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                    <span className="text-sm">{CHECK_LABELS[ct]}</span>
                    <span className={`flex items-center gap-1.5 text-xs font-semibold ${s === "verified" ? "text-emerald-400" : s === "unverified" ? "text-red-400" : "text-amber-400"}`}>
                      {s === "verified" && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {s === "unverified" && <XCircle className="w-3.5 h-3.5" />}
                      {s === "pending" && <Clock className="w-3.5 h-3.5" />}
                      {s === "verified" ? "Verified" : s === "unverified" ? "Not verified" : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-3">
            {QUICK_LINKS.map(({ href, icon: Icon, label, sub }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:bg-accent/30 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{label}</p>
                    {href === "/dashboard/notifications" && notifCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{notifCount}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Inline constant to avoid circular import
const APP_CONFIG_EMAIL = "support@tvcsecured.co.uk";
