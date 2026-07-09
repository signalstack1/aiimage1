import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard, CheckCircle2, ExternalLink, ShieldCheck, Award,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { APP_CONFIG } from "@/config/app";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface PaymentLink {
  slug: string;
  label: string;
  url: string | null;
  is_active: boolean;
}

export default function DashboardMembership() {
  const { member } = useAuth();
  const [links, setLinks]       = useState<PaymentLink[]>([]);
  const [loading, setLoading]   = useState(true);
  const [openingSlug, setOpeningSlug] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/payment-links`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLinks(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleOpen = (link: PaymentLink) => {
    if (!link.url) return;
    setOpeningSlug(link.slug);
    window.open(link.url, "_blank", "noopener");
    setTimeout(() => setOpeningSlug(null), 1500);
  };

  const status   = member?.application?.status ?? "pending";
  const viaNum   = member?.business?.via_number;
  const memberLink = links.find((l) => l.slug === "via-membership");
  const priorityLink = links.find((l) => l.slug === "priority-checking");
  const isPriority = member?.application?.priority;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-extrabold mb-1">Membership</h1>
        <p className="text-muted-foreground mb-8">Manage your VIA membership and subscription.</p>

        {/* Current status */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${status === "approved" ? "gradient-brand" : "bg-muted"}`}>
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold">VIA Membership</p>
                <StatusPill status={status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {viaNum
                  ? `VIA number: ${viaNum}`
                  : "VIA number will be assigned once your application is approved."}
              </p>
              {isPriority && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-primary">
                  <Award className="w-3.5 h-3.5" />
                  Priority checking purchased
                </div>
              )}
            </div>
          </div>
        </div>

        {/* What's included */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-bold mb-4">What's included in your membership</h2>
          <ul className="space-y-2.5">
            {(APP_CONFIG.planFeatures["via membership"]?.features ?? []).map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Manage membership button */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4">
          <h2 className="font-bold mb-1">Manage membership</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Renew, update payment details, or cancel your membership.
          </p>
          {loading ? (
            <div className="h-11 bg-muted animate-pulse rounded-lg" />
          ) : memberLink?.url ? (
            <Button
              onClick={() => handleOpen(memberLink)}
              disabled={openingSlug === memberLink.slug}
              className="w-full gradient-brand text-white border-0 hover:opacity-90 font-semibold h-11"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {openingSlug === memberLink.slug ? "Opening…" : "Manage Membership"}
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3 bg-muted/30 rounded-lg">
              Payment management link not configured yet. Contact us at{" "}
              <a href={`mailto:${APP_CONFIG.supportEmail}`} className="text-primary hover:underline">{APP_CONFIG.supportEmail}</a>.
            </p>
          )}
        </div>

        {/* Priority checking upgrade */}
        {!isPriority && (
          <div className="bg-card border border-primary/30 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h2 className="font-bold mb-1">Priority Checking — £49 one-off</h2>
                <p className="text-sm text-muted-foreground">Get verified same day or next working day with a dedicated checker.</p>
              </div>
              <Badge className="gradient-brand text-white border-0 text-xs shrink-0">Add-on</Badge>
            </div>
            {loading ? (
              <div className="h-11 bg-muted animate-pulse rounded-lg" />
            ) : priorityLink?.url ? (
              <Button
                onClick={() => handleOpen(priorityLink)}
                disabled={openingSlug === priorityLink.slug}
                className="w-full gradient-brand text-white border-0 hover:opacity-90 font-semibold h-11"
              >
                {openingSlug === priorityLink.slug ? "Opening…" : "Add Priority Checking — £49"}
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-3 bg-muted/30 rounded-lg">
                Priority checking link not configured yet.
              </p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-emerald-500/15 text-emerald-400",
    in_review: "bg-amber-500/15 text-amber-400",
    pending: "bg-sky-500/15 text-sky-400",
    rejected: "bg-red-500/15 text-red-400",
    expired: "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    approved: "Active", in_review: "In Review",
    pending: "Pending", rejected: "Rejected", expired: "Expired",
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] ?? map.pending}`}>{labels[status] ?? status}</span>;
}
