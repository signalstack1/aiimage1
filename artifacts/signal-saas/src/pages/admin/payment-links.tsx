import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ExternalLink, Key, RefreshCw } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface PaymentLink {
  id: string;
  slug: string;
  label: string;
  url: string | null;
  is_active: boolean;
  sort_order: number;
}

interface LinkRowProps {
  link: PaymentLink;
  token: string;
  onSaved: (id: string, url: string) => void;
}

function LinkRow({ link, token, onSaved }: LinkRowProps) {
  const [url, setUrl]         = useState(link.url ?? "");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const isDirty = url !== (link.url ?? "");

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/payment-links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: url.trim() || null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
      onSaved(link.id, url.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="font-semibold">{link.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">slug: {link.slug}</p>
        </div>
        {link.url && (
          <a href={link.url} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-primary hover:underline">
            <ExternalLink className="w-3 h-3" /> Preview
          </a>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-3 py-2 mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`url-${link.id}`}>Payment URL</Label>
          <div className="flex gap-2">
            <Input
              id={`url-${link.id}`}
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setSaved(false); }}
              placeholder="https://checkout.stripe.com/pay/..."
              className="flex-1 font-mono text-sm"
            />
            <Button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="shrink-0"
              variant={saved ? "outline" : "default"}
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <><CheckCircle2 className="w-4 h-4 text-emerald-400 mr-1.5" /> Saved</>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>

        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${link.url ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${link.url ? "bg-emerald-400" : "bg-amber-400"}`} />
          {link.url ? "Active — this URL is shown to members in their dashboard." : "Not configured — members will see a 'contact us' message instead."}
        </div>
      </div>
    </div>
  );
}

export default function AdminPaymentLinksPage() {
  const [links, setLinks]     = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem("admin_token") || "";

  useEffect(() => {
    fetch(`${BASE_URL}/api/admin/payment-links`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setLinks(Array.isArray(d) ? d.sort((a: PaymentLink, b: PaymentLink) => a.sort_order - b.sort_order) : []))
      .catch(() => setLinks([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (id: string, url: string) => {
    setLinks((prev) => prev.map((l) => l.id === id ? { ...l, url: url || null } : l));
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="w-6 h-6" /> Payment Links
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure the payment URLs shown to members. These are plain links — no Stripe integration required.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 space-y-3">
                <div className="h-5 bg-muted animate-pulse rounded w-48" />
                <div className="h-10 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : links.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-12 text-center">
            <Key className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No payment links found.</p>
            <p className="text-xs text-muted-foreground">
              Run the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">VIA_SUPABASE_SETUP.sql</code> migration to seed the default payment link rows.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {links.map((link) => (
              <LinkRow key={link.id} link={link} token={token} onSaved={handleSaved} />
            ))}
          </div>
        )}

        <div className="mt-6 bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>How it works:</strong> These URLs are fetched by the member dashboard and displayed as buttons. They open in a new tab. You can use any payment provider — Stripe Checkout, GoCardless, PayPal, or even a Calendly booking link. No API keys or webhooks required.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
