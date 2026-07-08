import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ExternalLink, ImageOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { APP_CONFIG } from "@/config/app";

interface Product {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  currency: string;
  interval: string;
  is_active: boolean;
  status?: string;
  payment_provider?: string | null;
  payment_url?: string | null;
  button_label?: string | null;
  image_url?: string | null;
}

const INTERVAL_LABELS: Record<string, string> = {
  monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly", lifetime: "Lifetime",
};

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const { singular, plural } = APP_CONFIG.admin.products;

  const load = () =>
    fetch("/api/admin/plans", { headers })
      .then((r) => r.json())
      .then(setProducts)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete this ${singular.toLowerCase()}?`)) return;
    try {
      await fetch(`/api/admin/plans/${id}`, { method: "DELETE", headers });
      await load();
      toast({ title: `${singular} deleted` });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleToggle = async (p: Product) => {
    try {
      const nowActive = !p.is_active;
      await fetch(`/api/admin/plans/${p.id}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ is_active: nowActive, status: nowActive ? "active" : "draft" }),
      });
      await load();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{plural}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your subscription offerings. {products.filter((p) => p.is_active).length} live.
            </p>
          </div>
          <Button
            onClick={() => navigate("/admin/products/new")}
            className="gradient-brand text-white border-0 hover:opacity-90 gap-2"
            data-testid="button-create-product"
          >
            <Plus className="w-4 h-4" /> New {singular.toLowerCase()}
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : !products.length ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground text-sm">No {plural.toLowerCase()} yet. Create your first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-4 rounded-xl border border-border bg-card hover:border-border/80 transition-colors gap-4">
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-border bg-muted shrink-0">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                      <ImageOff className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold truncate">{p.name}</span>
                    <Badge variant="outline" className={`text-xs shrink-0 ${
                      (p.status ?? (p.is_active ? "active" : "draft")) === "active"
                        ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                        : (p.status === "hidden" ? "text-amber-400 border-amber-500/20 bg-amber-500/5" : "text-muted-foreground")
                    }`}>
                      {p.status === "active" || (!p.status && p.is_active) ? "Live" : p.status === "hidden" ? "Hidden" : "Draft"}
                    </Badge>
                    <Badge variant="outline" className="text-xs shrink-0">{INTERVAL_LABELS[p.interval] || p.interval}</Badge>
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
                  {p.payment_url ? (
                    <p className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {p.payment_provider ? `${p.payment_provider} · ` : ""}Payment URL set
                    </p>
                  ) : (
                    <p className="text-xs text-amber-500/80 mt-0.5">⚠ No payment URL — button will be disabled</p>
                  )}
                </div>

                {/* Price + Actions */}
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-bold text-lg">${(p.price_cents / 100).toFixed(0)}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleToggle(p)} className="text-xs text-muted-foreground hover:text-foreground">
                      {p.is_active ? "Unpublish" : "Publish"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/products/${p.id}`)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
