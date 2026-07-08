import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ShoppingCart, AlertTriangle, Package, Truck, Zap } from "lucide-react";
import { APP_CONFIG } from "@/config/app";

interface VariantOption { id: string; value: string; sort_order: number; }
interface Variant { id: string; name: string; sort_order: number; product_variant_options: VariantOption[]; }
interface Tag { id: string; name: string; }
interface Category { id: string; name: string; parent_id: string | null; }
interface Product {
  id: string; name: string; description?: string; price_cents: number;
  currency?: string; interval: string; is_active: boolean; status: string;
  payment_url?: string | null; button_label?: string | null; image_url?: string | null;
  stock_quantity: number; show_stock: boolean; category_id?: string | null;
  free_delivery_enabled?: boolean; faster_delivery_enabled?: boolean;
  faster_delivery_payment_link?: string | null;
  categories?: Category | null;
  product_tags?: { tag_id: string; tags: Tag }[];
  product_variants?: Variant[];
}

interface ProductPageProps { id: string; }

function currencySymbol(currency?: string) { return currency === "gbp" ? "£" : "$"; }

function formatInterval(interval: string): string | null {
  switch (interval) {
    case "one-time": case "lifetime": return null;
    case "weekly":  return "wk";
    case "monthly": return "mo";
    case "quarterly": return "qtr";
    case "yearly":  return "yr";
    default: return null;
  }
}

function intervalLabel(interval: string): string {
  switch (interval) {
    case "one-time":   return "One-time payment";
    case "weekly":     return "Billed weekly";
    case "monthly":    return "Billed monthly";
    case "quarterly":  return "Billed quarterly";
    case "yearly":     return "Billed yearly";
    case "lifetime":   return "Lifetime access";
    default:           return "";
  }
}

function defaultButtonLabel(interval: string): string {
  return interval === "one-time" || interval === "lifetime" ? "Buy Now" : "Subscribe";
}

export default function ProductPage({ id }: ProductPageProps) {
  const [, navigate] = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedDelivery, setSelectedDelivery] = useState<"free" | "faster" | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    fetch(`/api/plans?id=${id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((p) => { setProduct(p); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center p-8">
        <Package className="w-12 h-12 text-muted-foreground/40" />
        <h1 className="text-2xl font-bold">Product not found</h1>
        <p className="text-muted-foreground">This product doesn't exist or has been removed.</p>
        <Button variant="outline" onClick={() => navigate("/")}>Back to home</Button>
      </div>
    );
  }

  const variants = (product.product_variants || []).sort((a, b) => a.sort_order - b.sort_order);
  const tags = (product.product_tags || []).map((pt) => pt.tags).filter(Boolean);
  const symbol = currencySymbol(product.currency);
  const price = (product.price_cents / 100).toFixed(0);
  const period = formatInterval(product.interval);
  const intLabel = intervalLabel(product.interval);
  const btnLabel = product.button_label || defaultButtonLabel(product.interval);
  const category = product.categories;

  const hasVariants = variants.length > 0;
  const allVariantsSelected = variants.every((v) => selectedOptions[v.id]);
  const stockQty = product.stock_quantity;
  const isOutOfStock = stockQty === 0;
  const isLimited = stockQty > 0;

  // Delivery logic
  const hasFreeDelivery = product.free_delivery_enabled ?? false;
  const hasFasterDelivery = product.faster_delivery_enabled ?? false;
  const bothDelivery = hasFreeDelivery && hasFasterDelivery;
  const deliveryChoiceRequired = bothDelivery && selectedDelivery === null;

  // Resolve the active payment URL based on delivery selection
  const activePaymentUrl: string | null | undefined = (() => {
    if (bothDelivery) {
      if (selectedDelivery === "faster") return product.faster_delivery_payment_link;
      if (selectedDelivery === "free") return product.payment_url;
      return null; // not chosen yet
    }
    if (hasFasterDelivery && !hasFreeDelivery) return product.faster_delivery_payment_link;
    return product.payment_url; // free only, or no delivery config
  })();

  const canBuy = !isOutOfStock && (!hasVariants || allVariantsSelected) && !!activePaymentUrl && !deliveryChoiceRequired;

  const handleBuy = () => {
    if (!canBuy || !activePaymentUrl) return;
    setRedirecting(true);
    window.location.href = activePaymentUrl;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-semibold text-foreground">{APP_CONFIG.appName}</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* ── Left: Image ─────────────────────────────────── */}
          <div className="space-y-4">
            {product.image_url ? (
              <div className="aspect-square rounded-2xl overflow-hidden border border-border bg-card">
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-square rounded-2xl border-2 border-dashed border-border bg-card/50 flex items-center justify-center">
                <Package className="w-16 h-16 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* ── Right: Info ──────────────────────────────────── */}
          <div className="space-y-6">
            {/* Category breadcrumb */}
            {category && (
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{category.name}</p>
            )}

            {/* Name */}
            <h1 className="text-3xl font-extrabold leading-tight">{product.name}</h1>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-xs">{tag.name}</Badge>
                ))}
              </div>
            )}

            {/* Price */}
            <div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-extrabold">{symbol}{price}</span>
                {period && <span className="text-muted-foreground mb-1.5 text-sm">/{period}</span>}
              </div>
              {intLabel && <p className="text-sm text-muted-foreground mt-1">{intLabel}</p>}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {/* Variants */}
            {hasVariants && (
              <div className="space-y-4">
                {variants.map((variant) => {
                  const opts = [...variant.product_variant_options].sort((a, b) => a.sort_order - b.sort_order);
                  return (
                    <div key={variant.id} className="space-y-1.5">
                      <label className="text-sm font-medium">{variant.name}</label>
                      <Select value={selectedOptions[variant.id] || ""} onValueChange={(v) => setSelectedOptions((p) => ({ ...p, [variant.id]: v }))}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={`Select ${variant.name.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {opts.map((opt) => <SelectItem key={opt.id} value={opt.value}>{opt.value}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Delivery options */}
            {(hasFreeDelivery || hasFasterDelivery) && (
              <div className="space-y-2">
                {bothDelivery ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Choose delivery</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDelivery("free")}
                        className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left transition-all ${selectedDelivery === "free" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card hover:border-primary/40"}`}
                      >
                        <Truck className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium leading-tight">Free delivery</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Included in price</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDelivery("faster")}
                        className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left transition-all ${selectedDelivery === "faster" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card hover:border-primary/40"}`}
                      >
                        <Zap className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium leading-tight">Faster delivery</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Express courier</p>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : hasFasterDelivery ? (
                  <div className="flex items-center gap-2 text-sm text-foreground/80">
                    <Zap className="w-4 h-4 text-primary shrink-0" />
                    <span>Faster delivery</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-foreground/80">
                    <Truck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Free delivery</span>
                  </div>
                )}
              </div>
            )}

            {/* Stock status */}
            {isOutOfStock ? (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Out of stock
              </div>
            ) : product.show_stock && isLimited ? (
              <p className="text-sm font-medium text-amber-400">Only {stockQty} left in stock</p>
            ) : null}

            {/* Buy button */}
            <div className="space-y-2">
              {!product.payment_url && !product.faster_delivery_payment_link ? (
                <Button className="w-full h-12 text-base font-semibold" disabled>Coming soon</Button>
              ) : (
                <Button
                  className="w-full h-12 text-base font-semibold gradient-brand text-white border-0 hover:opacity-90 glow-primary-sm"
                  onClick={handleBuy}
                  disabled={!canBuy || redirecting}
                >
                  {redirecting ? (
                    <><span className="mr-2 w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />Redirecting…</>
                  ) : (
                    <><ShoppingCart className="w-4 h-4 mr-2" />{btnLabel}</>
                  )}
                </Button>
              )}
              {hasVariants && !allVariantsSelected && (
                <p className="text-xs text-center text-muted-foreground">Please select all options above before buying.</p>
              )}
              {deliveryChoiceRequired && (
                <p className="text-xs text-center text-muted-foreground">Please choose a delivery option above before buying.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
