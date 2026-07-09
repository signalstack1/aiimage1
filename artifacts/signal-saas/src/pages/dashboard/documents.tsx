import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Upload, Trash2, ShieldCheck, Award, FileCheck,
  AlertCircle, CheckCircle2, ExternalLink,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const MAX_MB = 10;

interface Doc {
  id: string;
  document_type: "general" | "insurance" | "accreditation";
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  uploaded_at: string;
}

interface DocSection {
  type: "general" | "insurance" | "accreditation";
  icon: React.ElementType;
  label: string;
  description: string;
  accept: string;
}

const SECTIONS: DocSection[] = [
  {
    type: "insurance",
    icon: ShieldCheck,
    label: "Insurance Proof",
    description: "Public liability insurance certificate. PDF or image, max 10 MB.",
    accept: ".pdf,.jpg,.jpeg,.png,.webp",
  },
  {
    type: "accreditation",
    icon: Award,
    label: "Accreditation Proof",
    description: "Trade body certificates, Gas Safe card, NICEIC card, etc.",
    accept: ".pdf,.jpg,.jpeg,.png,.webp",
  },
  {
    type: "general",
    icon: FileCheck,
    label: "General Documents",
    description: "Any other supporting documents — Companies House, ID, etc.",
    accept: ".pdf,.jpg,.jpeg,.png,.webp",
  },
];

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DashboardDocuments() {
  const { session } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting]   = useState<Record<string, boolean>>({});
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const token = session?.access_token;

  const loadDocs = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/member/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setDocs(data);
    } catch { /* silent */ }
  };

  useEffect(() => { loadDocs(); }, [token]);

  /** Safe base64 encoding for large files — processes in 8 KB chunks to avoid stack overflow. */
  const bufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  };

  const handleFileChange = async (docType: DocSection["type"], file: File) => {
    if (!token) return;
    const mb = file.size / (1024 * 1024);
    if (mb > MAX_MB) {
      setErrors((e) => ({ ...e, [docType]: `File is too large (${mb.toFixed(1)} MB). Maximum is ${MAX_MB} MB.` }));
      return;
    }

    setErrors((e) => ({ ...e, [docType]: "" }));
    setUploading((u) => ({ ...u, [docType]: true }));

    try {
      // Convert file to base64 using chunked encoding (safe for files up to 10 MB)
      const buffer = await file.arrayBuffer();
      const base64 = bufferToBase64(buffer);

      const res = await fetch(`${BASE_URL}/api/member/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    if (!token) return;
    setDeleting((d) => ({ ...d, [id]: true }));
    try {
      await fetch(`${BASE_URL}/api/member/documents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch { /* silent */ } finally {
      setDeleting((d) => ({ ...d, [id]: false }));
    }
  };

  const handleViewDoc = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/member/documents/${id}/url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { url } = await res.json();
      if (url) window.open(url, "_blank", "noopener");
    } catch { /* silent */ }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-extrabold mb-1">Documents</h1>
        <p className="text-muted-foreground mb-8">
          Upload supporting documents for your verification. Our team reviews these as part of the checking process.
        </p>

        <div className="space-y-6">
          {SECTIONS.map(({ type, icon: Icon, label, description, accept }) => {
            const sectionDocs = docs.filter((d) => d.document_type === type);
            const isUploading = uploading[type] ?? false;

            return (
              <div key={type} className="bg-card border border-border rounded-2xl p-6">
                {/* Header */}
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
                    accept={accept}
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(type, f); }}
                  />
                </div>

                {/* Error */}
                {errors[type] && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {errors[type]}
                  </div>
                )}

                {/* Uploaded files */}
                {sectionDocs.length === 0 ? (
                  <div className="border border-dashed border-border rounded-xl p-6 text-center">
                    <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sectionDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-3 p-3 bg-background border border-border rounded-lg">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatBytes(doc.file_size_bytes)} · {new Date(doc.uploaded_at).toLocaleDateString("en-GB")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
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
            Documents are stored securely and only visible to VIA verifiers. They are never shared publicly. Only PDF and image files are accepted (max 10 MB each).
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
