import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { getPlanEntitlements } from "@/config/app";
import { MessageSquare, Lock, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "";

interface Testimonial {
  id: string;
  customer_name: string;
  testimonial_text: string;
  customer_email: string | null;
  service_received: string | null;
  work_date: string | null;
  approval_status: "pending" | "approved" | "rejected";
  moderation_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

type Filter = "all" | "pending" | "approved" | "rejected";

const STATUS_CONFIG = {
  pending:  { label: "Pending review", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",   icon: Clock },
  approved: { label: "Approved",       cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  rejected: { label: "Rejected",       cls: "bg-red-500/15 text-red-400 border-red-500/30",         icon: XCircle },
};

export default function DashboardTestimonials() {
  const { member, fetchWithAuth } = useAuth();
  const planCode = member?.application?.plan_code ?? null;
  const canAccess = getPlanEntitlements(planCode).testimonial_access;

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<Filter>("all");
  const [updating, setUpdating]         = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);

  const viaNumber = member?.business?.via_number;

  const loadTestimonials = async () => {
    setLoading(true);
    try {
      const r = await fetchWithAuth(`${BASE_URL}/api/member/testimonials`);
      if (r.ok) setTestimonials(await r.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess) loadTestimonials();
    else setLoading(false);
  }, [canAccess]);

  const updateStatus = async (id: string, approval_status: "approved" | "rejected") => {
    setUpdating(id);
    setError(null);
    try {
      const r = await fetchWithAuth(`${BASE_URL}/api/member/testimonials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval_status }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Update failed"); return; }
      setTestimonials((prev) =>
        prev.map((t) => t.id === id ? { ...t, approval_status, reviewed_at: new Date().toISOString() } : t)
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filter === "all" ? testimonials : testimonials.filter((t) => t.approval_status === filter);
  const counts = {
    all:      testimonials.length,
    pending:  testimonials.filter(t => t.approval_status === "pending").length,
    approved: testimonials.filter(t => t.approval_status === "approved").length,
    rejected: testimonials.filter(t => t.approval_status === "rejected").length,
  };

  if (!canAccess) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-2xl">
          <h1 className="text-2xl font-extrabold mb-1">Customer Testimonials</h1>
          <p className="text-muted-foreground mb-8">Display verified customer reviews on your public TVC profile.</p>
          <div className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center text-center">
            <Lock className="w-10 h-10 text-muted-foreground mb-4" />
            <p className="font-bold mb-1">TVC Plus only</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Upgrade to TVC Plus to collect and display customer testimonials on your profile.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-1">
          <MessageSquare className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-extrabold">Customer Testimonials</h1>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">TVC Plus</span>
        </div>
        <p className="text-muted-foreground mb-6">Review and approve testimonials submitted by your customers.</p>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 mb-5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {viaNumber && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold mb-1">How customers submit testimonials</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Customers can leave a testimonial on your public TVC profile. Share your number{" "}
              <span className="font-mono font-bold text-foreground">{viaNumber}</span>{" "}
              and ask them to visit{" "}
              <span className="font-mono text-primary">tvcsecured.co.uk/verify/{viaNumber}</span>.{" "}
              New testimonials require your approval before they appear publicly.
            </p>
          </div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors flex items-center gap-1.5 ${
                filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              {f}
              {counts[f] > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-bold">{counts[f]}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            {filter === "all" ? "No testimonials yet. Share your TVC number with customers to receive reviews." : `No ${filter} testimonials.`}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((t) => {
              const cfg = STATUS_CONFIG[t.approval_status];
              const StatusIcon = cfg.icon;
              return (
                <div key={t.id} className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold">{t.customer_name}</p>
                      {t.customer_email && <p className="text-xs text-muted-foreground">{t.customer_email}</p>}
                      {t.service_received && <p className="text-xs text-muted-foreground">Service: {t.service_received}</p>}
                    </div>
                    <span className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cfg.cls} shrink-0`}>
                      <StatusIcon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground italic leading-relaxed mb-4">"{t.testimonial_text}"</p>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(t.submitted_at).toLocaleDateString("en-GB")}
                      {t.reviewed_at && ` · Reviewed ${new Date(t.reviewed_at).toLocaleDateString("en-GB")}`}
                    </p>
                    <div className="flex gap-2">
                      {t.approval_status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(t.id, "rejected")}
                            disabled={updating === t.id}
                            className="text-red-400 border-red-500/30 hover:bg-red-500/10 h-7 px-3 text-xs"
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateStatus(t.id, "approved")}
                            disabled={updating === t.id}
                            className="gradient-brand text-white border-0 hover:opacity-90 h-7 px-3 text-xs"
                          >
                            {updating === t.id ? "…" : "Approve"}
                          </Button>
                        </>
                      )}
                      {t.approval_status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(t.id, "rejected")}
                          disabled={updating === t.id}
                          className="h-7 px-3 text-xs text-muted-foreground"
                        >
                          Remove
                        </Button>
                      )}
                      {t.approval_status === "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(t.id, "approved")}
                          disabled={updating === t.id}
                          className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 h-7 px-3 text-xs"
                        >
                          Approve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
