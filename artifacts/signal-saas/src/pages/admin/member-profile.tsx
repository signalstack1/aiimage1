import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Shield, ShieldCheck, ShieldX, Phone, Mail, Globe,
  MapPin, FileText, ExternalLink, Download,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

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
  contact_email: string | null;
  description: string | null;
  via_number: string | null;
  user_id: string | null;
  application: { id: string; status: string; created_at: string } | null;
  documents: Array<{ id: string; document_type: string; file_name: string; created_at: string }>;
  verification_checks: Array<{ check_type: string; passed: boolean }>;
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

  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!id) return;
    fetch(`${BASE_URL}/api/admin/members/${id}`, { headers })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setProfile(d);
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

  const checkMap = Object.fromEntries(
    (profile?.verification_checks ?? []).map((c) => [c.check_type, c.passed])
  );

  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl">
        {/* Back nav */}
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
                {profile.contact_email && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="break-all">{profile.contact_email}</span>
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

            {/* Auth status */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-3">Account Status</h2>
              <div className="flex items-center gap-3 text-sm">
                {profile.user_id ? (
                  <>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                    <span className="text-muted-foreground">Linked to Supabase Auth account</span>
                    <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{profile.user_id.slice(0, 8)}…</code>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-muted-foreground rounded-full" />
                    <span className="text-muted-foreground">Not yet linked to a member login account</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
