import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, User, FileText, Award, Bell, CreditCard,
  CheckCircle2, XCircle, Clock, ArrowRight, AlertTriangle, ExternalLink,
  Copy, Check, Lock, Truck, Package, RefreshCw,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { getPlanEntitlements } from "@/config/app";

const BASE_URL = import.meta.env.VITE_API_URL || "";

interface CheckItem { check_type: string; status: "verified" | "unverified" | "pending"; checked_at: string | null }

const CHECK_LABELS: Record<string, string> = {
  local_address:     "Local Address",
  business_type:     "Business Type",
  insurance:         "Public Liability Insurance",
  accreditations:    "Trade Accreditations",
  digital_footprint: "Digital Footprint",
  public_records:    "Contact & Public Records",
};

interface StickerOrder {
  id: string;
  sticker_size: "small" | "medium";
  van_count: number;
  price_per_van_pence: number | null;
  expected_total_pence: number | null;
  payment_status: string;
  fulfilment_status: string;
  ordered_at: string | null;
  paid_at: string | null;
  dispatched_at: string | null;
}

const FULFILMENT_LABELS: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  paid:             "Paid — preparing",
  preparing:        "Preparing order",
  dispatched:       "Dispatched",
  completed:        "Delivered",
  cancelled:        "Cancelled",
  refunded:         "Refunded",
  not_ordered:      "Not ordered",
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

function derivedReferralCode(businessId: string): string {
  return "TVC-" + businessId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export default function DashboardHome() {
  const { member, fetchWithAuth } = useAuth();
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [stickerOrders, setStickerOrders] = useState<StickerOrder[]>([]);
  const [copied, setCopied] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const planCode = member?.application?.plan_code ?? null;
  const entitlements = getPlanEntitlements(planCode);

  useEffect(() => {
    setLoadError(null);

    const p1 = fetchWithAuth(`${BASE_URL}/api/member/verification-checks`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { if (Array.isArray(data)) setChecks(data); });

    const p2 = fetchWithAuth(`${BASE_URL}/api/member/notifications`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { if (Array.isArray(data)) setNotifCount(data.filter((n: any) => !n.is_read).length); });

    const p3 = fetchWithAuth(`${BASE_URL}/api/member/sticker-orders`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { if (Array.isArray(data)) setStickerOrders(data); });

    const p4 = fetch(`${BASE_URL}/api/payment-links`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (Array.isArray(data)) {
          const slug = planCode === "tvc_basic" ? "tvc-basic"
                     : planCode === "tvc_plus" ? "tvc-plus"
                     : "via-membership";
          const pl = data.find((l: any) => l.slug === slug) ?? data.find((l: any) => l.slug === "via-membership");
          if (pl?.url) setPaymentLink(pl.url);
        }
      });

    Promise.allSettled([p1, p2, p3, p4]).then((results) => {
      const anyFailed = results.some(r => r.status === "rejected");
      if (anyFailed) {
        setLoadError("Some dashboard data couldn't be loaded. Check your connection and try again.");
      }
    });
  }, [planCode, loadAttempt]);

  const status = member?.application?.status ?? "pending";
  const viaNumber = member?.business?.via_number;
  const biz = member?.business;

  const referralCode = biz?.referral_code ?? (biz?.id ? derivedReferralCode(biz.id) : null);

  const copyReferral = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const allCheckTypes = Object.keys(CHECK_LABELS);
  const checkMap: Record<string, CheckItem["status"]> = {};
  for (const c of checks) checkMap[c.check_type] = c.status;

  const planLabel = planCode === "tvc_basic" ? "TVC Basic"
                  : planCode === "tvc_plus" ? "TVC Plus"
                  : "Legacy";
  const planPrice = entitlements.price;
  const isBasic = planCode === "tvc_basic";
  const isLegacy = planCode === null;

  const planFeatureList = planCode === "tvc_basic"
    ? ["Unique TVC number", "Public TVC profile", "Digital badge", "Member dashboard", "Referral code"]
    : ["Unique TVC number", "Public TVC profile", "Digital badge", "Portfolio & gallery", "Social links", "Testimonials", "Priority verification"];

  const plusLockedFeatures = isBasic
    ? ["Portfolio & photo gallery", "Social media links on profile", "Customer testimonials section", "Priority verification"]
    : [];

  const latestStickerOrder = stickerOrders[0] ?? null;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl">
        <h1 className="text-2xl font-extrabold mb-1">
          {biz?.business_name ? `Welcome, ${biz.business_name}` : "Member Dashboard"}
        </h1>
        <p className="text-muted-foreground mb-8">Your TVC verification status and quick links.</p>

        {/* Data load error banner */}
        {loadError && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{loadError}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLoadAttempt(a => a + 1)}
              className="shrink-0 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </Button>
          </div>
        )}

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
                  Complete Payment — {planPrice !== "—" ? planPrice : "£15/month"}
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

        <div className="grid md:grid-cols-2 gap-6 mb-6">
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

        {/* Plan card */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-bold mb-0.5">Your Plan</h2>
              <p className="text-xs text-muted-foreground">Current membership tier and included features.</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                planCode === "tvc_plus" ? "bg-primary/10 text-primary border-primary/30"
                : planCode === "tvc_basic" ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                : "bg-muted text-muted-foreground border-border"
              }`}>
                {planLabel}
              </span>
              {planPrice !== "—" && <span className="text-xs text-muted-foreground">{planPrice}</span>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Included</p>
              <ul className="space-y-1.5">
                {planFeatureList.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {plusLockedFeatures.length > 0 && (
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> TVC Plus only
                </p>
                <ul className="space-y-1.5 mb-3">
                  {plusLockedFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Lock className="w-3 h-3 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-muted-foreground">
                  Upgrade to TVC Plus to unlock these features. Contact{" "}
                  <a href={`mailto:${APP_CONFIG_EMAIL}`} className="text-primary hover:underline">{APP_CONFIG_EMAIL}</a>
                  {" "}to upgrade.
                </p>
              </div>
            )}

            {isLegacy && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-400 mb-1">Legacy account</p>
                <p className="text-xs text-muted-foreground">Your account predates our current plan system. Contact support to be assigned a plan.</p>
              </div>
            )}
          </div>
        </div>

        {/* Plus-only feature sections */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Portfolio & Photo Gallery */}
          <div className={`relative bg-card border rounded-2xl p-5 overflow-hidden ${isBasic ? "border-border opacity-80" : "border-border"}`}>
            {isBasic && (
              <div className="absolute inset-0 bg-card/60 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
                <div className="text-center px-4">
                  <Lock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">TVC Plus only</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Upgrade to unlock portfolio</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">Portfolio & Gallery</h3>
              {!isBasic && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 ml-auto">TVC Plus</span>}
            </div>
            <p className="text-xs text-muted-foreground">Showcase your best work with photos visible on your public profile.</p>
            {!isBasic && <Link href="/dashboard/portfolio" className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">Manage portfolio <ArrowRight className="w-3 h-3" /></Link>}
          </div>

          {/* Social Media Links */}
          <div className={`relative bg-card border rounded-2xl p-5 overflow-hidden ${isBasic ? "border-border opacity-80" : "border-border"}`}>
            {isBasic && (
              <div className="absolute inset-0 bg-card/60 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
                <div className="text-center px-4">
                  <Lock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">TVC Plus only</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Upgrade to unlock social links</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">Social Media Links</h3>
              {!isBasic && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 ml-auto">TVC Plus</span>}
            </div>
            <p className="text-xs text-muted-foreground">Add links to Facebook, Instagram, and other channels on your profile.</p>
            {!isBasic && <Link href="/dashboard/social-links" className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">Edit social links <ArrowRight className="w-3 h-3" /></Link>}
          </div>

          {/* Business Introduction */}
          <div className={`relative bg-card border rounded-2xl p-5 overflow-hidden ${isBasic ? "border-border opacity-80" : "border-border"}`}>
            {isBasic && (
              <div className="absolute inset-0 bg-card/60 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
                <div className="text-center px-4">
                  <Lock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">TVC Plus only</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Upgrade to add a business intro</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">Business Introduction</h3>
              {!isBasic && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 ml-auto">TVC Plus</span>}
            </div>
            <p className="text-xs text-muted-foreground">Write a detailed intro about your experience, specialisms, and service area.</p>
            {!isBasic && <p className="text-xs text-muted-foreground mt-3 italic">Coming soon — being built now.</p>}
          </div>

          {/* Customer Testimonials */}
          <div className={`relative bg-card border rounded-2xl p-5 overflow-hidden ${isBasic ? "border-border opacity-80" : "border-border"}`}>
            {isBasic && (
              <div className="absolute inset-0 bg-card/60 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
                <div className="text-center px-4">
                  <Lock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">TVC Plus only</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Upgrade to add testimonials</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">Customer Testimonials</h3>
              {!isBasic && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 ml-auto">TVC Plus</span>}
            </div>
            <p className="text-xs text-muted-foreground">Display verified customer reviews and testimonials on your public profile.</p>
            {!isBasic && <p className="text-xs text-muted-foreground mt-3 italic">Coming soon — being built now.</p>}
          </div>
        </div>

        {/* Referral code */}
        {referralCode && (
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h2 className="font-bold mb-1">Your Referral Code</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Share this code with other tradespeople. When they join TVC Secured, mention your code.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-muted/30 rounded-xl px-4 py-3 font-mono text-lg font-bold tracking-widest text-primary">
                {referralCode}
              </div>
              <Button size="sm" variant="outline" onClick={copyReferral} className="shrink-0 gap-2">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        )}

        {/* Sticker order status */}
        {latestStickerOrder && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-amber-400" />
              <h2 className="font-bold">Van Sticker Order</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Size</p>
                <p className="font-medium capitalize">{latestStickerOrder.sticker_size}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Vans</p>
                <p className="font-medium">{latestStickerOrder.van_count}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Total</p>
                <p className="font-medium">
                  {latestStickerOrder.expected_total_pence != null
                    ? `£${(latestStickerOrder.expected_total_pence / 100).toFixed(0)}`
                    : "—"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Status: <span className="text-foreground font-medium">
                  {FULFILMENT_LABELS[latestStickerOrder.fulfilment_status] ?? latestStickerOrder.fulfilment_status}
                </span>
              </span>
              {latestStickerOrder.dispatched_at && (
                <span className="text-xs text-muted-foreground ml-2">
                  Dispatched {new Date(latestStickerOrder.dispatched_at).toLocaleDateString("en-GB")}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

const APP_CONFIG_EMAIL = "support@tvcsecured.co.uk";
