import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Shield, ShieldCheck, ShieldX, Phone, Mail, Globe,
  MapPin, FileText, ExternalLink, Download, Link2, CheckCircle2, AlertTriangle, RefreshCw,
  Image, Trash2, MessageSquare, ThumbsUp, ThumbsDown,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const CHECK_LABELS: Record<string, string> = {
  local_address:     "Local Address",
  business_type:     "Business Type",
  insurance:         "Public Liability Insurance",
  accreditation:     "Trade Accreditations",
  digital_footprint: "Digital Footprint",
  contact_records:   "Contact & Public Records",
};

const DOC_LABELS: Record<string, string> = {
  insurance_certificate: "Insurance Certificate",
  trade_accreditation:   "Trade Accreditation",
  proof_of_address:      "Proof of Address",
  business_registration: "Business Registration",
  other:                 "Other Document",
};

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-amber-500/10 text-amber-400 border-amber-500/30",
  in_review: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  approved:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  rejected:  "bg-red-500/10 text-red-400 border-red-500/30",
  expired:   "bg-muted text-muted-foreground border-border",
};

interface Profile {
  id: string;
  business_name: string;
  trade_type: string;
  location: string;
  website: string | null;
  contact_phone: string | null;
  description: string | null;
  via_number: string | null;
  user_id: string | null;
  application: { id: string; status: string; plan_code: string | null; applicant_email: string | null; created_at: string } | null;
  documents: Array<{ id: string; document_type: string; file_name: string; created_at: string }>;
  verification_checks: Array<{ check_type: string; passed: boolean }>;
}

interface PortfolioImage { id: string; public_url: string | null; description: string | null; upload_month: string; created_at: string; }
interface AdminTestimonial {
  id: string; customer_name: string; testimonial_text: string; customer_email: string | null;
  service_received: string | null; work_date: string | null;
  approval_status: "pending" | "approved" | "rejected"; moderation_notes: string | null;
  submitted_at: string; reviewed_at: string | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function MemberProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [linkEmail, setLinkEmail]     = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkResult, setLinkResult]   = useState<{ ok: boolean; message: string } | null>(null);

  const [planChangeVal, setPlanChangeVal]       = useState<string>("");
  const [planChangeNote, setPlanChangeNote]     = useState("");
  const [planChanging, setPlanChanging]         = useState(false);
  const [planChangeConfirm, setPlanChangeConfirm] = useState(false);
  const [planChangeSuccess, setPlanChangeSuccess] = useState(false);
  const [planChangeError, setPlanChangeError]   = useState<string | null>(null);

  const [portfolio, setPortfolio]               = useState<PortfolioImage[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [testimonials, setTestimonials]         = useState<AdminTestimonial[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(false);
  const [updatingTestimonial, setUpdatingTestimonial] = useState<string | null>(null);

  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { ...headers, "Content-Type": "application/json" };

  useEffect(() => {
    if (!id) return;
    fetch(`${BASE_URL}/api/admin/members/${id}`, { headers })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setProfile(d);
          setPlanChangeVal(d.application?.plan_code ?? "");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const downloadDoc = async (docId: string, fileName: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/documents/${docId}/url`, { headers });
      const { url } = await res.json();
      if (url) window.open(url, "_blank");
    } catch { window.alert("Could not generate download link. Please try again."); }
  };

  const handleLinkUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkEmail.trim() || !id) return;
    setLinkLoading(true);
    setLinkResult(null);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/businesses/${id}/link-user`, {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify({ email: linkEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLinkResult({ ok: false, message: data.error ?? "Failed to link account." });
      } else {
        setLinkResult({ ok: true, message: `Linked to ${linkEmail.trim()} successfully.` });
        setProfile((prev) => prev ? { ...prev, user_id: data.user_id ?? prev.user_id } : prev);
        setLinkEmail("");
      }
    } catch (e: any) {
      setLinkResult({ ok: false, message: e.message });
    } finally {
      setLinkLoading(false);
    }
  };

  const changePlan = async () => {
    if (!profile?.application?.id) return;
    setPlanChanging(true);
    setPlanChangeError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/applications/${profile.application.id}`, {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify({
          plan_code: planChangeVal || null,
          plan_change_note: planChangeNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to change plan");
      }
      const oldPlan = profile.application.plan_code;
      setProfile((p) => p && p.application
        ? { ...p, application: { ...p.application, plan_code: planChangeVal || null } }
        : p);
      setPlanChangeNote("");
      setPlanChangeSuccess(true);
      setTimeout(() => setPlanChangeSuccess(false), 3000);
    } catch (e: any) {
      setPlanChangeError(e.message || "Failed to change plan");
    } finally {
      setPlanChanging(false);
    }
  };

  const checkMap = Object.fromEntries(
    (profile?.verification_checks ?? []).map((c) => [c.check_type, c.passed])
  );

  useEffect(() => {
    if (!profile?.id) return;
    if (profile.application?.plan_code === "tvc_plus") {
      setPortfolioLoading(true);
      fetch(`${BASE_URL}/api/admin/portfolio?business_id=${profile.id}`, { headers })
        .then(r => r.json())
        .then((d: any) => setPortfolio(Array.isArray(d) ? d : (d.images ?? [])))
        .catch(() => {})
        .finally(() => setPortfolioLoading(false));
    }
    setTestimonialsLoading(true);
    fetch(`${BASE_URL}/api/admin/testimonials?business_id=${profile.id}`, { headers })
      .then(r => r.json())
      .then((d: any) => setTestimonials(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setTestimonialsLoading(false));
  }, [profile?.id]);

  const deletePortfolioImage = async (imgId: string) => {
    if (!window.confirm("Permanently remove this portfolio image? This cannot be undone.")) return;
    await fetch(`${BASE_URL}/api/admin/portfolio-images/${imgId}`, { method: "DELETE", headers });
    setPortfolio(prev => prev.filter(i => i.id !== imgId));
  };

  const updateTestimonial = async (id: string, approval_status: string) => {
    setUpdatingTestimonial(id);
    try {
      const r = await fetch(`${BASE_URL}/api/admin/testimonials/${id}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ approval_status }) });
      if (r.ok) { const updated = await r.json(); setTestimonials(prev => prev.map(t => t.id === id ? updated : t)); }
    } finally { setUpdatingTestimonial(null); }
  };

  const removeTestimonial = async (id: string) => {
    if (!window.confirm("Permanently delete this testimonial? This cannot be undone.")) return;
    setUpdatingTestimonial(id);
    try {
      await fetch(`${BASE_URL}/api/admin/testimonials/${id}`, { method: "DELETE", headers });
      setTestimonials(prev => prev.filter(t => t.id !== id));
    } finally { setUpdatingTestimonial(null); }
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl">
        <Link href="/admin/members" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Members
        </Link>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl p-6 text-sm">{error}</div>
        ) : !profile ? null : (
          <div className="space-y-6">
            {/* Header card */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h1 className="text-2xl font-bold">{profile.business_name}</h1>
                    {profile.via_number && (
                      <span className="text-sm font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg">
                        {profile.via_number}
                      </span>
                    )}
                    {profile.application && (
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[profile.application.status] ?? STATUS_STYLE.expired}`}>
                        {profile.application.status.replace("_", " ")}
                      </span>
                    )}
                    {profile.application?.plan_code === "tvc_plus" && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/30">
                        TVC Plus
                      </span>
                    )}
                    {profile.application?.plan_code === "tvc_basic" && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-sky-500/10 text-sky-400 border-sky-500/30">
                        TVC Basic
                      </span>
                    )}
                    {!profile.application?.plan_code && profile.application && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
                        Legacy — Unassigned
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">{profile.trade_type}</p>
                  {profile.description && <p className="text-sm mt-2 text-muted-foreground">{profile.description}</p>}
                </div>
                {profile.application && (
                  <Link href={`/admin/applications/${profile.application.id}`}>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View Application
                    </Button>
                  </Link>
                )}
              </div>

              {/* Contact info */}
              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {profile.location && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{profile.location}</span>
                  </div>
                )}
                {profile.contact_phone && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{profile.contact_phone}</span>
                  </div>
                )}
                {profile.application?.applicant_email && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="break-all">{profile.application.applicant_email}</span>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <Globe className="w-4 h-4 mt-0.5 shrink-0" />
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                      {profile.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Verification checks */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Verification Checks
                </h2>
                <div className="space-y-2.5">
                  {Object.entries(CHECK_LABELS).map(([key, label]) => {
                    const passed = checkMap[key];
                    return (
                      <div key={key} className="flex items-center gap-3">
                        {passed === true ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : passed === false ? (
                          <ShieldX className="w-4 h-4 text-red-400 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-border shrink-0" />
                        )}
                        <span className={`text-sm ${passed === true ? "text-foreground" : "text-muted-foreground"}`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Documents */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Uploaded Documents
                </h2>
                {profile.documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {profile.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {DOC_LABELS[doc.document_type] ?? doc.document_type.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{doc.file_name} · {fmtDate(doc.created_at)}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={() => downloadDoc(doc.id, doc.file_name)}
                          title="Download document"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Change Plan — only shown when member has an application */}
            {profile.application && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-1">Membership Plan</h2>
                <p className="text-xs text-muted-foreground mb-4">Plan changes are logged to the application's internal notes.</p>
                {planChangeError && (
                  <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-lg px-3 py-2 mb-3">
                    {planChangeError}
                  </div>
                )}
                {planChangeSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Plan updated and logged.
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Select value={planChangeVal} onValueChange={setPlanChangeVal}>
                      <SelectTrigger><SelectValue placeholder="Legacy — Unassigned" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Legacy — Unassigned</SelectItem>
                        <SelectItem value="tvc_basic">TVC Basic (£15/month)</SelectItem>
                        <SelectItem value="tvc_plus">TVC Plus (£30/month)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={planChangeNote}
                      onChange={(e) => setPlanChangeNote(e.target.value)}
                      placeholder="Reason for change (optional)"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {planChangeConfirm ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-9 whitespace-nowrap"
                        onClick={() => { setPlanChangeConfirm(false); changePlan(); }}
                        disabled={planChanging}
                      >
                        {planChanging ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9"
                        onClick={() => setPlanChangeConfirm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setPlanChangeConfirm(true)}
                      disabled={planChanging || planChangeVal === (profile.application.plan_code ?? "")}
                      variant="outline"
                      className="h-9 whitespace-nowrap"
                    >
                      Update Plan
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Portfolio — TVC Plus members only */}
            {profile.application?.plan_code === "tvc_plus" && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-semibold text-sm mb-1 flex items-center gap-2">
                  <Image className="w-4 h-4 text-primary" /> Portfolio Images
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  {portfolio.filter(i => i.upload_month === new Date().toISOString().slice(0,7)).length} of 20 uploads used this month
                  {" · "}{portfolio.filter(i => i.public_url).length} active image{portfolio.filter(i => i.public_url).length !== 1 ? "s" : ""}
                </p>
                {portfolioLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : portfolio.filter(i => i.public_url).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active portfolio images.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {portfolio.filter(i => i.public_url).map((img) => (
                      <div key={img.id} className="relative group rounded-lg overflow-hidden bg-muted aspect-square">
                        <img src={img.public_url!} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => deletePortfolioImage(img.id)}
                          className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity text-white"
                          title="Remove image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Testimonials */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" /> Testimonials
                {testimonials.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground font-normal">{testimonials.length} total</span>
                )}
              </h2>
              {testimonialsLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : testimonials.length === 0 ? (
                <p className="text-sm text-muted-foreground">No testimonials yet.</p>
              ) : (
                <div className="space-y-3">
                  {testimonials.map((t) => (
                    <div key={t.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{t.customer_name}</p>
                          {t.customer_email && <p className="text-xs text-muted-foreground truncate">{t.customer_email}</p>}
                          {t.service_received && (
                            <p className="text-xs text-muted-foreground">
                              {t.service_received}{t.work_date ? ` · ${fmtDate(t.work_date)}` : ""}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${STATUS_STYLE[t.approval_status] ?? ""}`}>
                          {t.approval_status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">"{t.testimonial_text}"</p>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          disabled={updatingTestimonial === t.id || t.approval_status === "approved"}
                          onClick={() => updateTestimonial(t.id, "approved")}>
                          <ThumbsUp className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          disabled={updatingTestimonial === t.id || t.approval_status === "rejected"}
                          onClick={() => updateTestimonial(t.id, "rejected")}>
                          <ThumbsDown className="w-3 h-3 mr-1" /> Reject
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive ml-auto"
                          disabled={updatingTestimonial === t.id}
                          onClick={() => removeTestimonial(t.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Auth status + link-user */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" /> Member Login Account
              </h2>

              <div className="flex items-center gap-3 text-sm mb-4">
                {profile.user_id ? (
                  <>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full shrink-0" />
                    <span className="text-muted-foreground">Linked to Supabase Auth account</span>
                    <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{profile.user_id.slice(0, 8)}…</code>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-amber-400 rounded-full shrink-0" />
                    <span className="text-muted-foreground">Not yet linked to a member login account</span>
                  </>
                )}
              </div>

              <form onSubmit={handleLinkUser} className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <Label htmlFor="link-email" className="text-xs text-muted-foreground mb-1 block">
                    {profile.user_id ? "Re-link to a different account" : "Link to member's login account"}
                  </Label>
                  <Input
                    id="link-email"
                    type="email"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    placeholder="member@example.co.uk"
                    className="h-9 text-sm"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={linkLoading || !linkEmail.trim()}
                  className="sm:self-end h-9 whitespace-nowrap"
                >
                  {linkLoading ? "Linking…" : "Link account"}
                </Button>
              </form>

              {linkResult && (
                <div className={`mt-3 flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                  linkResult.ok
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-destructive/10 border border-destructive/20 text-destructive"
                }`}>
                  {linkResult.ok
                    ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                    : <AlertTriangle className="w-4 h-4 shrink-0" />
                  }
                  {linkResult.message}
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-3">
                The member must first sign up at <code className="text-xs bg-muted px-1 py-0.5 rounded">/signup</code> using the same email address before linking.
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
