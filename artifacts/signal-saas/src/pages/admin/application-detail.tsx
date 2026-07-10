import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, FileText,
  ExternalLink, Star, Send, RefreshCw, UserCheck, AlertTriangle,
  CalendarDays, MessageSquarePlus, ThumbsUp, ThumbsDown, Ban,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const CHECK_LABELS: Record<string, string> = {
  local_address:     "Local Address",
  business_type:     "Business Type",
  insurance:         "Public Liability Insurance",
  accreditations:    "Trade Accreditations",
  digital_footprint: "Digital Footprint",
  public_records:    "Contact & Public Records",
};

// Maps document_type → verification check_type
const DOC_TO_CHECK: Record<string, string> = {
  insurance:        "insurance",
  accreditation:    "accreditations",
  proof_of_address: "local_address",
};
const CHECK_ORDER = ["local_address","business_type","insurance","accreditations","digital_footprint","public_records"];

const STATUS_OPTIONS = ["pending_payment","pending","in_review","approved","rejected","expired"];
const STATUS_LABELS: Record<string, string> = {
  pending_payment:"Pending Payment", pending:"Pending Review", in_review:"In Review", approved:"Approved", rejected:"Rejected", expired:"Expired",
};
const STATUS_STYLE: Record<string, string> = {
  pending_payment: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  pending:   "bg-sky-500/15 text-sky-400 border-sky-500/30",
  in_review: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  approved:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected:  "bg-red-500/15 text-red-400 border-red-500/30",
  expired:   "bg-muted text-muted-foreground border-border",
};

interface Check { id?: string; check_type: string; status: "verified"|"unverified"|"pending"; checked_at: string|null }
interface Note  { id: string; body: string; created_at: string }
interface Doc   {
  id: string; document_type: string; file_name: string;
  file_size_bytes: number|null; uploaded_at: string;
  status: "pending_review"|"approved"|"rejected"|"expired";
  admin_notes: string|null; expiry_date: string|null;
}
interface AppDetail {
  id: string; status: string; priority: boolean;
  applicant_name: string; applicant_email: string; applicant_phone: string|null; message: string|null;
  created_at: string; updated_at: string;
  businesses: {
    id: string; business_name: string; trade_type: string; location: string;
    website: string|null; contact_phone: string|null; description: string|null;
    via_number: string|null; user_id: string|null;
  } | null;
  documents: Doc[];
  verification_checks: Check[];
  admin_notes: Note[];
}

function CheckToggle({ check, applicationId, businessId, token, onUpdate }: {
  check: Check; applicationId: string; businessId: string; token: string; onUpdate: (ct: string, s: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const cycle = (cur: string): string => {
    if (cur === "pending") return "verified";
    if (cur === "verified") return "unverified";
    return "pending";
  };
  const toggle = async () => {
    const next = cycle(check.status);
    setSaving(true);
    try {
      await fetch(`${BASE_URL}/api/admin/verification-checks/upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ application_id: applicationId, business_id: businessId, check_type: check.check_type, status: next }),
      });
      onUpdate(check.check_type, next);
    } catch { /* silent */ } finally { setSaving(false); }
  };
  const cfg = {
    verified:   { icon: CheckCircle2, cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", label: "Verified" },
    unverified: { icon: XCircle,      cls: "text-red-400 bg-red-500/10 border-red-500/30",             label: "Not Verified" },
    pending:    { icon: Clock,        cls: "text-amber-400 bg-amber-500/10 border-amber-500/30",        label: "Pending" },
  }[check.status] ?? { icon: Clock, cls: "text-muted-foreground bg-muted border-border", label: "Pending" };
  const Icon = cfg.icon;
  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all hover:opacity-80 ${cfg.cls}`}
      title="Click to cycle: Pending → Verified → Not Verified → Pending"
    >
      <span className="text-sm font-medium">{CHECK_LABELS[check.check_type] ?? check.check_type}</span>
      <span className={`flex items-center gap-1.5 text-xs font-semibold ${saving ? "opacity-50" : ""}`}>
        <Icon className="w-3.5 h-3.5" /> {cfg.label}
      </span>
    </button>
  );
}

export default function AdminApplicationDetailPage({ id }: { id?: string }) {
  const [, navigate] = useLocation();
  const [app, setApp]         = useState<AppDetail|null>(null);
  const [loading, setLoading] = useState(true);
  const [checks, setChecks]   = useState<Check[]>([]);
  const [notes, setNotes]     = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [postingNote, setPostingNote] = useState(false);
  const [statusVal, setStatusVal]     = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [viaInput, setViaInput]         = useState("");
  const [viaAssigning, setViaAssigning] = useState(false);
  const [viaAutoLoading, setViaAutoLoading] = useState(false);
  const [viaError, setViaError]         = useState<string|null>(null);
  const [viaSuccess, setViaSuccess]     = useState(false);
  const [docNotes, setDocNotes]         = useState<Record<string, string>>({});
  const [docExpiry, setDocExpiry]       = useState<Record<string, string>>({});
  const [docSaving, setDocSaving]       = useState<Record<string, boolean>>({});
  const [requestingDocs, setRequestingDocs] = useState(false);
  const [requestMsg, setRequestMsg]     = useState("");
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [markingPaid, setMarkingPaid]   = useState(false);
  const [markPaidNotes, setMarkPaidNotes] = useState("");
  const [markPaidSuccess, setMarkPaidSuccess] = useState(false);
  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${BASE_URL}/api/admin/applications/${id}`, { headers })
      .then((r) => r.json())
      .then((d) => {
        setApp(d);
        setStatusVal(d.status ?? "pending");
        setChecks(d.verification_checks ?? []);
        setNotes(d.admin_notes ?? []);
        if (d.businesses?.via_number) setViaInput(d.businesses.via_number);
        try {
          const raw = localStorage.getItem("admin_viewed_applications");
          const viewed: string[] = raw ? JSON.parse(raw) : [];
          if (!viewed.includes(id)) {
            viewed.push(id);
            localStorage.setItem("admin_viewed_applications", JSON.stringify(viewed));
          }
        } catch { /* storage unavailable */ }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const saveStatus = async () => {
    if (!app || !statusVal) return;
    setStatusSaving(true);
    try {
      await fetch(`${BASE_URL}/api/admin/applications/${app.id}`, {
        method: "PATCH", headers, body: JSON.stringify({ status: statusVal }),
      });
      setApp((a) => a ? { ...a, status: statusVal } : a);
    } catch { /* silent */ } finally { setStatusSaving(false); }
  };

  const assignVia = async () => {
    if (!app?.businesses?.id) return;
    const norm = viaInput.trim().toUpperCase();
    if (!norm.match(/^TVC\d{4,}$/)) {
      setViaError("TVC number format: TVC followed by 4+ digits (e.g. TVC1001)");
      return;
    }
    setViaAssigning(true);
    setViaError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/applications/${app.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: "approved",
          via_number: norm,
          via_number_for_business_id: app.businesses.id,
        }),
      });
      const j = await res.json();
      if (!res.ok) { setViaError(j.error || "Assignment failed"); return; }
      setStatusVal("approved");
      setApp((a) => a ? { ...a, status: "approved", businesses: a.businesses ? { ...a.businesses, via_number: norm } : null } : a);
      setViaSuccess(true);
      setTimeout(() => setViaSuccess(false), 3000);
    } catch (e: any) {
      setViaError(e.message);
    } finally { setViaAssigning(false); }
  };

  const autoGenerateVia = async () => {
    setViaAutoLoading(true);
    setViaError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/next-via-number`, { headers });
      const { via_number } = await res.json();
      if (via_number) setViaInput(via_number);
    } catch { /* silent */ } finally { setViaAutoLoading(false); }
  };

  const postNote = async () => {
    if (!noteText.trim() || !app) return;
    setPostingNote(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/admin-notes`, {
        method: "POST", headers,
        body: JSON.stringify({ application_id: app.id, body: noteText.trim() }),
      });
      const note = await res.json();
      if (res.ok) { setNotes((prev) => [...prev, note]); setNoteText(""); }
    } catch { /* silent */ } finally { setPostingNote(false); }
  };

  const handleCheckUpdate = (checkType: string, newStatus: string) => {
    setChecks((prev) => prev.map((c) =>
      c.check_type === checkType
        ? { ...c, status: newStatus as any, checked_at: newStatus !== "pending" ? new Date().toISOString() : null }
        : c
    ));
  };

  const viewDoc = async (docId: string) => {
    const res = await fetch(`${BASE_URL}/api/admin/documents/${docId}/url`, { headers });
    const { url } = await res.json();
    if (url) window.open(url, "_blank", "noopener");
  };

  const saveDocReview = async (docId: string, status: string) => {
    if (!app) return;
    setDocSaving((s) => ({ ...s, [docId]: true }));
    try {
      await fetch(`${BASE_URL}/api/admin/documents/${docId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status,
          admin_notes: docNotes[docId] ?? undefined,
          expiry_date: docExpiry[docId] ?? undefined,
        }),
      });
      // Update local document state
      const doc = app.documents.find((d) => d.id === docId);
      setApp((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          documents: prev.documents.map((d) =>
            d.id === docId
              ? { ...d, status: status as Doc["status"], admin_notes: docNotes[docId] ?? d.admin_notes, expiry_date: docExpiry[docId] ?? d.expiry_date }
              : d
          ),
        };
      });
      // Auto-update the linked verification check when approving or rejecting
      if (doc && (status === "approved" || status === "rejected")) {
        const checkType = DOC_TO_CHECK[doc.document_type];
        if (checkType && app.businesses?.id) {
          const checkStatus = status === "approved" ? "verified" : "unverified";
          await fetch(`${BASE_URL}/api/admin/verification-checks/upsert`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              application_id: app.id,
              business_id: app.businesses.id,
              check_type: checkType,
              status: checkStatus,
            }),
          });
          handleCheckUpdate(checkType, checkStatus);
        }
      }
    } catch { } finally {
      setDocSaving((s) => ({ ...s, [docId]: false }));
    }
  };

  const handleRequestDocs = async () => {
    if (!app) return;
    setRequestingDocs(true);
    try {
      await fetch(`${BASE_URL}/api/admin/applications/${app.id}/request-documents`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: requestMsg.trim() || undefined }),
      });
      setRequestSuccess(true);
      setRequestMsg("");
      setTimeout(() => setRequestSuccess(false), 4000);
    } catch { } finally {
      setRequestingDocs(false);
    }
  };

  const markAsPaid = async () => {
    if (!app) return;
    setMarkingPaid(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/applications/${app.id}/mark-paid`, {
        method: "POST",
        headers,
        body: JSON.stringify({ payment_notes: markPaidNotes.trim() || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to mark as paid");
      }
      setApp((a) => a ? { ...a, status: "pending" } : a);
      setStatusVal("pending");
      setMarkPaidSuccess(true);
      setMarkPaidNotes("");
      setTimeout(() => setMarkPaidSuccess(false), 6000);
    } catch { /* silent */ } finally { setMarkingPaid(false); }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid lg:grid-cols-3 gap-6">
            {[1,2,3].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!app) {
    return (
      <AdminLayout>
        <div className="p-8 text-center py-24">
          <AlertTriangle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Application not found.</p>
          <Link href="/admin/applications" className="text-primary hover:underline text-sm mt-2 inline-block">← Back to list</Link>
        </div>
      </AdminLayout>
    );
  }

  const biz = app.businesses;
  // Build full check list (fill in missing with pending stubs)
  const checkMap: Record<string, Check> = {};
  for (const c of checks) checkMap[c.check_type] = c;
  const allChecks = CHECK_ORDER.map((ct) => checkMap[ct] ?? { check_type: ct, status: "pending" as const, checked_at: null });
  const verifiedCount = allChecks.filter((c) => c.status === "verified").length;

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl">
        {/* Back + header */}
        <div className="flex items-start gap-4 mb-6 flex-wrap">
          <Link href="/admin/applications" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm mt-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{biz?.business_name ?? app.applicant_name}</h1>
              {app.priority && <Star className="w-4 h-4 text-amber-400 fill-amber-400" aria-label="Priority application" />}
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[app.status] ?? STATUS_STYLE.expired}`}>
                {STATUS_LABELS[app.status] ?? app.status}
              </span>
              {biz?.via_number && (
                <span className="text-sm font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg">
                  {biz.via_number}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Submitted {new Date(app.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              {" · "}{verifiedCount}/6 checks verified
            </p>
          </div>
        </div>

        {/* ── Payment confirmation banner ─────────────────────────────────── */}
        {app.status === "pending_payment" && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-400 mb-1">Awaiting payment confirmation</h3>
                <p className="text-sm text-muted-foreground">
                  This applicant has created their account but payment has not been confirmed yet.
                  Once you mark as paid, their application moves to Pending Review and verification can begin.
                </p>
              </div>
            </div>
            <div className="space-y-3 pl-8">
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Payment notes <span className="text-muted-foreground/60">(optional — reference number, method, amount)</span></label>
                <textarea
                  value={markPaidNotes}
                  onChange={(e) => setMarkPaidNotes(e.target.value)}
                  placeholder="e.g. Bank transfer ref: 123456, £20 received on 09/07/26"
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              {markPaidSuccess && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Payment confirmed — application moved to Pending Review.
                </div>
              )}
              <Button
                onClick={markAsPaid}
                disabled={markingPaid}
                className="gradient-brand text-white border-0 hover:opacity-90 font-semibold"
              >
                {markingPaid ? "Confirming…" : "✓ Mark as Paid — Move to Pending Review"}
              </Button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT: Applicant info + Documents */}
          <div className="space-y-5">
            {/* Applicant info */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">Applicant</h2>
              <dl className="space-y-2.5 text-sm">
                <div><dt className="text-xs text-muted-foreground mb-0.5">Name</dt><dd>{app.applicant_name}</dd></div>
                <div><dt className="text-xs text-muted-foreground mb-0.5">Email</dt><dd><a href={`mailto:${app.applicant_email}`} className="text-primary hover:underline">{app.applicant_email}</a></dd></div>
                {app.applicant_phone && <div><dt className="text-xs text-muted-foreground mb-0.5">Phone</dt><dd>{app.applicant_phone}</dd></div>}
                {app.message && <div><dt className="text-xs text-muted-foreground mb-0.5">Message</dt><dd className="text-muted-foreground">{app.message}</dd></div>}
              </dl>
            </div>
            {/* Business info */}
            {biz && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">Business</h2>
                <dl className="space-y-2.5 text-sm">
                  <div><dt className="text-xs text-muted-foreground mb-0.5">Trade type</dt><dd>{biz.trade_type}</dd></div>
                  <div><dt className="text-xs text-muted-foreground mb-0.5">Location</dt><dd>{biz.location}</dd></div>
                  {biz.website && <div><dt className="text-xs text-muted-foreground mb-0.5">Website</dt><dd><a href={biz.website} target="_blank" rel="noopener" className="text-primary hover:underline text-xs">{biz.website}</a></dd></div>}
                  {biz.contact_phone && <div><dt className="text-xs text-muted-foreground mb-0.5">Phone</dt><dd>{biz.contact_phone}</dd></div>}
                  {biz.description && <div><dt className="text-xs text-muted-foreground mb-0.5">Description</dt><dd className="text-muted-foreground text-xs">{biz.description}</dd></div>}
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">Auth linked</dt>
                    <dd className={biz.user_id ? "text-emerald-400 text-xs" : "text-amber-400 text-xs"}>
                      {biz.user_id ? "✓ Linked to member account" : "Not linked — member can't log in yet"}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
            {/* Documents */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Documents ({app.documents.length})
                </h2>
              </div>

              {/* Request more documents */}
              <div className="mb-4 border border-border rounded-xl p-3 bg-background space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Request additional documents</p>
                <textarea
                  value={requestMsg}
                  onChange={(e) => setRequestMsg(e.target.value)}
                  rows={2}
                  placeholder="Describe what's needed (optional — a default message will be sent if left blank)…"
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={requestingDocs} onClick={handleRequestDocs} className="h-7 text-xs">
                    <MessageSquarePlus className="w-3 h-3 mr-1.5" />
                    {requestingDocs ? "Sending…" : "Send request to member"}
                  </Button>
                  {requestSuccess && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Sent</span>}
                </div>
              </div>

              {app.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {app.documents.map((doc) => {
                    const isSaving = docSaving[doc.id] ?? false;
                    const docLabel = {
                      insurance: "Public Liability Insurance",
                      accreditation: "Trade Accreditation",
                      proof_of_address: "Proof of Address",
                      general: "General Document",
                      other: "Other",
                    }[doc.document_type] ?? doc.document_type;

                    const statusBadge = {
                      pending_review: <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px] gap-1"><Clock className="w-2.5 h-2.5" />Pending</Badge>,
                      approved:       <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] gap-1"><CheckCircle2 className="w-2.5 h-2.5" />Approved</Badge>,
                      rejected:       <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] gap-1"><XCircle className="w-2.5 h-2.5" />Rejected</Badge>,
                      expired:        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] gap-1"><CalendarDays className="w-2.5 h-2.5" />Expired</Badge>,
                    }[doc.status] ?? null;

                    return (
                      <div key={doc.id} className="border border-border rounded-xl overflow-hidden">
                        {/* Doc header row */}
                        <div className="flex items-center justify-between gap-2 p-2.5 bg-background">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{doc.file_name}</p>
                              <p className="text-[10px] text-muted-foreground">{docLabel}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {statusBadge}
                            <Button size="sm" variant="ghost" onClick={() => viewDoc(doc.id)} className="h-6 px-2">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Review controls */}
                        <div className="border-t border-border p-3 bg-card space-y-2.5">
                          {/* Admin notes */}
                          <textarea
                            value={docNotes[doc.id] ?? (doc.admin_notes || "")}
                            onChange={(e) => setDocNotes((n) => ({ ...n, [doc.id]: e.target.value }))}
                            rows={2}
                            placeholder="Admin notes / rejection reason…"
                            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          {/* Expiry date */}
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <Input
                              type="date"
                              value={docExpiry[doc.id] ?? (doc.expiry_date || "")}
                              onChange={(e) => setDocExpiry((x) => ({ ...x, [doc.id]: e.target.value }))}
                              className="h-7 text-xs flex-1"
                            />
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">Expiry date</span>
                          </div>
                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              size="sm"
                              disabled={isSaving}
                              onClick={() => saveDocReview(doc.id, "approved")}
                              className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                            >
                              <ThumbsUp className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              disabled={isSaving}
                              onClick={() => saveDocReview(doc.id, "rejected")}
                              className="h-7 px-2.5 text-xs bg-red-600 hover:bg-red-700 text-white border-0"
                            >
                              <ThumbsDown className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isSaving}
                              onClick={() => saveDocReview(doc.id, "expired")}
                              className="h-7 px-2.5 text-xs"
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              Expired
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isSaving}
                              onClick={() => saveDocReview(doc.id, doc.status)}
                              className="h-7 px-2.5 text-xs ml-auto"
                            >
                              {isSaving ? "Saving…" : "Save notes"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* MIDDLE: Verification checklist */}
          <div className="space-y-5">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Verification Checks</h2>
                <span className="text-xs text-muted-foreground">{verifiedCount}/6</span>
              </div>
              <div className="space-y-2">
                {allChecks.map((c) => (
                  <CheckToggle
                    key={c.check_type}
                    check={c}
                    applicationId={app.id}
                    businessId={biz?.id ?? ""}
                    token={token}
                    onUpdate={handleCheckUpdate}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 text-center">Click a check to cycle: Pending → Verified → Not Verified</p>
            </div>
          </div>

          {/* RIGHT: Status, VIA number, Notes */}
          <div className="space-y-5">
            {/* Status control */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">Application Status</h2>
              <div className="flex items-center gap-2">
                <Select value={statusVal} onValueChange={setStatusVal}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={saveStatus} disabled={statusSaving || statusVal === app.status} variant="outline">
                  {statusSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>

            {/* TVC number assignment */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-1">Assign TVC Number</h2>
              <p className="text-xs text-muted-foreground mb-4">Assigning a TVC number sets status to Approved and notifies the member.</p>
              {viaError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-lg px-3 py-2 mb-3">
                  {viaError}
                </div>
              )}
              {viaSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> TVC number assigned and member notified.
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  value={viaInput}
                  onChange={(e) => setViaInput(e.target.value.toUpperCase())}
                  placeholder="TVC1001"
                  className="font-mono flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={autoGenerateVia}
                  disabled={viaAutoLoading}
                  title="Auto-assign next sequential TVC number"
                  className="shrink-0 text-xs"
                >
                  {viaAutoLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Auto"}
                </Button>
                <Button
                  size="sm"
                  onClick={assignVia}
                  disabled={viaAssigning || !viaInput.trim() || !biz?.id}
                  className="gradient-brand text-white border-0 hover:opacity-90 shrink-0"
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  {viaAssigning ? "Saving…" : "Assign"}
                </Button>
              </div>
            </div>

            {/* Admin notes */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
                Internal Notes ({notes.length})
              </h2>
              {/* Note thread */}
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No notes yet.</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="bg-background border border-border rounded-lg p-3">
                      <p className="text-sm leading-relaxed">{note.body}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {new Date(note.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ))
                )}
              </div>
              {/* Add note */}
              <div className="flex gap-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                  placeholder="Add an internal note…"
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <Button
                size="sm"
                onClick={postNote}
                disabled={postingNote || !noteText.trim()}
                className="w-full mt-2"
                variant="outline"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {postingNote ? "Posting…" : "Post note"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
