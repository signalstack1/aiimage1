import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Upload, Trash2, ShieldCheck, Award, FileCheck,
  AlertCircle, CheckCircle2, ExternalLink, MapPin, HelpCircle,
  Clock, XCircle, CalendarDays,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const MAX_MB = 10;

type DocStatus = "pending_review" | "approved" | "rejected" | "expired";

interface Doc {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  uploaded_at: string;
  status: DocStatus;
  admin_notes: string | null;
  expiry_date: string | null;
}

interface DocSection {
  type: string;
  icon: React.ElementType;
  label: string;
  description: string;
}

const SECTIONS: DocSection[] = [
  {
    type: "insurance",
    icon: ShieldCheck,
    label: "Public Liability Insurance",
    description: "Certificate of public liability insurance. PDF or image, max 10 MB.",
  },
  {
    type: "accreditation",
    icon: Award,
    label: "Trade Accreditations",
    description: "Gas Safe, NICEIC, NAPIT, trust mark or other trade body certificates.",
  },
  {
    type: "proof_of_address",
    icon: MapPin,
    label: "Proof of Business Address",
    description: "Utility bill, bank statement, or council letter dated within 3 months.",
  },
  {
    type: "general",
    icon: FileCheck,
    label: "General Documents",
    description: "Companies House, ID, or any other supporting verification documents.",
  },
  {
    type: "other",
    icon: HelpCircle,
    label: "Other Supporting Documents",
    description: "Any additional evidence requested by the TVC team.",
  },
];

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: DocStatus }) {
  if (status === "approved") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0.5 gap-1 font-medium">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0.5 gap-1 font-medium">
        <XCircle className="w-2.5 h-2.5" />
        Rejected
      </Badge>
    );
  }
  if (status === "expired") {
    return (
      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0.5 gap-1 font-medium">
        <CalendarDays className="w-2.5 h-2.5" />
        Expired
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0.5 gap-1 font-medium">
      <Clock className="w-2.5 h-2.5" />
      Pending Review
    </Badge>
  );
}

export default function DashboardDocuments() {
  const { fetchWithAuth } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting]   = useState<Record<string, boolean>>({});
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadDocs = async () => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/api/member/documents`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setDocs(data);
    } catch { }
  };

  useEffect(() => { loadDocs(); }, []);

  const bufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  };

  const handleFileChange = async (docType: string, file: File) => {
    const mb = file.size / (1024 * 1024);
    if (mb > MAX_MB) {
      setErrors((e) => ({ ...e, [docType]: `File is too large (${mb.toFixed(1)} MB). Maximum is ${MAX_MB} MB.` }));
      return;
    }

    setErrors((e) => ({ ...e, [docType]: "" }));
    setUploading((u) => ({ ...u, [docType]: true }));

    try {
      const buffer = await file.arrayBuffer();
      const base64 = bufferToBase64(buffer);

      const res = await fetchWithAuth(`${BASE_URL}/api/member/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_data: base64,
          mime_type: file.type,
          file_name: file.name,
          document_type: docType,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Upload failed");
      }
      await loadDocs();
    } catch (err: any) {
      setErrors((e) => ({ ...e, [docType]: err.message || "Upload failed" }));
    } finally {
      setUploading((u) => ({ ...u, [docType]: false }));
      if (inputRefs.current[docType]) inputRefs.current[docType]!.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting((d) => ({ ...d, [id]: true }));
    try {
      await fetchWithAuth(`${BASE_URL}/api/member/documents/${id}`, {
        method: "DELETE",
      });
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch { } finally {
      setDeleting((d) => ({ ...d, [id]: false }));
    }
  };

  const handleViewDoc = async (id: string) => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/api/member/documents/${id}/url`);
      const { url } = await res.json();
      if (url) window.open(url, "_blank", "noopener");
    } catch { }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-extrabold mb-1">Documents</h1>
        <p className="text-muted-foreground mb-8">
          Upload supporting documents for your verification. You can upload now or add more at any time — our team reviews these as part of the checking process.
        </p>

        <div className="space-y-6">
          {SECTIONS.map(({ type, icon: Icon, label, description }) => {
            const sectionDocs = docs.filter((d) => d.document_type === type);
            const isUploading = uploading[type] ?? false;

            return (
              <div key={type} className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUploading}
                    onClick={() => inputRefs.current[type]?.click()}
                    className="shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {isUploading ? "Uploading…" : "Upload"}
                  </Button>
                  <input
                    ref={(el) => { inputRefs.current[type] = el; }}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(type, f); }}
                  />
                </div>

                {errors[type] && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {errors[type]}
                  </div>
                )}

                {sectionDocs.length === 0 ? (
                  <div className="border border-dashed border-border rounded-xl p-6 text-center">
                    <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sectionDocs.map((doc) => (
                      <div key={doc.id} className="border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between gap-3 p-3 bg-background">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{doc.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatBytes(doc.file_size_bytes)}
                                {doc.file_size_bytes ? " · " : ""}
                                {new Date(doc.uploaded_at).toLocaleDateString("en-GB")}
                                {doc.expiry_date ? ` · Expires ${new Date(doc.expiry_date).toLocaleDateString("en-GB")}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge status={doc.status} />
                            <Button size="sm" variant="ghost" onClick={() => handleViewDoc(doc.id)} className="h-7 px-2">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={deleting[doc.id]}
                              onClick={() => handleDelete(doc.id)}
                              className="h-7 px-2 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {doc.status === "rejected" && doc.admin_notes && (
                          <div className="flex items-start gap-2 px-3 py-2 bg-red-500/8 border-t border-red-500/20 text-xs text-red-400">
                            <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span><span className="font-semibold">Rejected: </span>{doc.admin_notes}</span>
                          </div>
                        )}
                        {doc.status === "expired" && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/8 border-t border-amber-500/20 text-xs text-amber-400">
                            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                            <span>This document has expired. Please upload a renewed version.</span>
                          </div>
                        )}
                        {doc.admin_notes && doc.status === "approved" && (
                          <div className="flex items-start gap-2 px-3 py-2 bg-emerald-500/8 border-t border-emerald-500/20 text-xs text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{doc.admin_notes}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-card border border-border rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Documents are stored securely and only visible to TVC verifiers. They are never shared publicly. PDF, JPG, PNG and WebP accepted (max 10 MB each). You can upload new documents or replace expired ones at any time.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
