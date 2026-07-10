import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { getPlanEntitlements } from "@/config/app";
import { Images, Trash2, Upload, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "";
const MAX_SIZE_MB = 10;
const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface PortfolioImage {
  id: string;
  public_url: string | null;
  storage_path: string;
  description: string | null;
  upload_month: string;
  display_order: number;
  created_at: string;
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DashboardPortfolio() {
  const { member, fetchWithAuth } = useAuth();
  const planCode = member?.application?.plan_code ?? null;
  const entitlements = getPlanEntitlements(planCode);
  const canAccess = entitlements.portfolio_access;
  const monthLimit = entitlements.monthly_image_limit as number;

  const [images, setImages]     = useState<PortfolioImage[]>([]);
  const [monthCount, setMonthCount] = useState(0);
  const [uploading, setUploading]   = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPortfolio = async () => {
    try {
      const r = await fetchWithAuth(`${BASE_URL}/api/member/portfolio`);
      if (r.ok) {
        const data = await r.json();
        setImages(data.images ?? []);
        setMonthCount(data.month_count ?? 0);
      }
    } catch {}
  };

  useEffect(() => {
    if (canAccess) loadPortfolio();
  }, [canAccess]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!VALID_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be ${MAX_SIZE_MB} MB or smaller.`);
      return;
    }
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      const file_data = await toBase64(file);
      const r = await fetchWithAuth(`${BASE_URL}/api/member/portfolio/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_data, mime_type: file.type }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Upload failed"); return; }
      setSuccess("Image uploaded successfully.");
      setTimeout(() => setSuccess(null), 3000);
      await loadPortfolio();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this image? This cannot be undone. Note: deleted images do not restore your monthly upload quota.")) return;
    setDeleting(id);
    try {
      const r = await fetchWithAuth(`${BASE_URL}/api/member/portfolio/${id}`, { method: "DELETE" });
      if (r.ok) {
        setImages((prev) => prev.filter((img) => img.id !== id));
      } else {
        const j = await r.json().catch(() => ({}));
        setError(j.error || "Delete failed");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const usagePercent = monthLimit > 0 ? Math.min(100, Math.round((monthCount / monthLimit) * 100)) : 0;
  const currentMonthLabel = new Date().toLocaleString("en-GB", { month: "long", year: "numeric" });

  if (!canAccess) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-2xl">
          <h1 className="text-2xl font-extrabold mb-1">Portfolio & Gallery</h1>
          <p className="text-muted-foreground mb-8">Showcase your best work with photos on your public profile.</p>
          <div className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center text-center">
            <Lock className="w-10 h-10 text-muted-foreground mb-4" />
            <p className="font-bold mb-1">TVC Plus only</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Upgrade to TVC Plus to upload up to 20 photos per month to your public profile.
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
          <Images className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-extrabold">Portfolio & Gallery</h1>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">TVC Plus</span>
        </div>
        <p className="text-muted-foreground mb-6">Upload photos of your work. They appear on your public TVC profile once your verification is approved.</p>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 mb-5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg px-4 py-3 mb-5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Monthly uploads — {currentMonthLabel}</p>
            <span className="text-sm font-mono font-bold">{monthCount} / {monthLimit}</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usagePercent >= 100 ? "bg-red-500" : usagePercent >= 75 ? "bg-amber-400" : "bg-emerald-500"}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Limit resets on the 1st of each month. Deleting images does not restore your monthly upload quota.
          </p>
        </div>

        <div className="bg-card border border-dashed border-border rounded-2xl p-8 mb-6 text-center">
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold mb-1">Upload a photo</p>
          <p className="text-xs text-muted-foreground mb-4">JPEG, PNG, or WebP · Max {MAX_SIZE_MB} MB</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading || monthCount >= monthLimit}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || monthCount >= monthLimit}
            className="gradient-brand text-white border-0 hover:opacity-90 font-semibold"
          >
            {uploading ? "Uploading…" : monthCount >= monthLimit ? "Monthly limit reached" : "Choose image"}
          </Button>
        </div>

        {images.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No images yet. Upload your first photo above.
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold mb-4 text-muted-foreground">{images.length} image{images.length !== 1 ? "s" : ""} in your gallery</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((img) => (
                <div key={img.id} className="relative group rounded-xl overflow-hidden border border-border bg-muted aspect-square">
                  {img.public_url ? (
                    <img
                      src={img.public_url}
                      alt={img.description || "Portfolio image"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Processing…</div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(img.id)}
                      disabled={deleting === img.id}
                      className="gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deleting === img.id ? "Deleting…" : "Delete"}
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-[10px] text-white/80">
                    {new Date(img.created_at).toLocaleDateString("en-GB")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
