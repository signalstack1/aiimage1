import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package, TrendingUp, SlidersHorizontal, X } from "lucide-react";
import { APP_CONFIG } from "@/config/app";

interface Tag { id: string; name: string; }
interface Category { id: string; name: string; parent_id: string | null; }
interface Product {
  id: string; name: string; description?: string; price_cents: number;
  currency?: string; interval: string; is_active: boolean; status?: string;
  payment_url?: string | null; button_label?: string | null; image_url?: string | null;
  stock_quantity?: number; show_stock?: boolean; category_id?: string | null;
  categories?: Category | null;
  product_tags?: { tag_id: string; tags: Tag }[];
  product_variants?: { id: string }[];
  created_at?: string;
}

function currencySymbol(c?: string) { return c === "gbp" ? "£" : "$"; }

function formatPrice(price_cents: number, currency?: string, interval?: string) {
  const sym = currencySymbol(currency);
  const amt = (price_cents / 100).toFixed(0);
  const sfx: Record<string, string> = { monthly: "/mo", yearly: "/yr", weekly: "/wk", quarterly: "/qtr" };
  return `${sym}${amt}${sfx[interval ?? ""] ?? ""}`;
}

function StockBadge({ qty, show_stock }: { qty: number; show_stock: boolean }) {
  if (qty === 0) return (
    <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-red-500/10 text-red-400 border-red-500/30">
      Out of stock
    </span>
  );
  if (show_stock && qty > 0 && qty <= 5) return (
    <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-500/10 text-amber-400 border-amber-500/30">
      Only {qty} left
    </span>
  );
  if (show_stock && qty > 5) return (
    <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-green-500/10 text-green-400 border-green-500/30">
      In stock
    </span>
  );
  return null;
}

type SortKey = "newest" | "price_asc" | "price_desc" | "instock";

function sortProducts(products: Product[], sort: SortKey): Product[] {
  const arr = [...products];
  if (sort === "price_asc") return arr.sort((a, b) => a.price_cents - b.price_cents);
  if (sort === "price_desc") return arr.sort((a, b) => b.price_cents - a.price_cents);
  if (sort === "newest") return arr.sort((a, b) => {
    return (b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0);
  });
  if (sort === "instock") return arr.sort((a, b) => {
    const aOos = (a.stock_quantity ?? -1) === 0 ? 1 : 0;
    const bOos = (b.stock_quantity ?? -1) === 0 ? 1 : 0;
    return aOos - bOos;
  });
  return arr;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-accent/30" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-accent/40 rounded w-1/3" />
        <div className="h-5 bg-accent/40 rounded w-3/4" />
        <div className="h-3 bg-accent/30 rounded w-full" />
        <div className="h-3 bg-accent/30 rounded w-4/5" />
        <div className="h-10 bg-accent/20 rounded mt-6" />
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [, navigate] = useLocation();
  const tags = (product.product_tags || []).map((pt) => pt.tags).filter(Boolean);
  const qty = product.stock_quantity ?? -1;
  const showStock = product.show_stock ?? false;
  const isOos = qty === 0;
  const hasVariants = (product.product_variants || []).length > 0;
  const priceStr = formatPrice(product.price_cents, product.currency, product.interval);

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
      onClick={() => !isOos && navigate(`/products/${product.id}`)}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-accent/20 shrink-0">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-muted-foreground/20" />
          </div>
        )}
        <StockBadge qty={qty} show_stock={showStock} />
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5 gap-2.5">
        {product.categories && (
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold leading-none">
            {product.categories.name}
          </p>
        )}

        <h3 className="font-bold text-base leading-snug line-clamp-2">{product.name}</h3>

        {product.description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1">
            {product.description}
          </p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs px-2 py-0 h-5">
                {tag.name}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-2 py-0 h-5">+{tags.length - 3}</Badge>
            )}
          </div>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between gap-3">
          <span className="text-xl font-extrabold shrink-0">{priceStr}</span>
          <Button
            size="sm"
            className={`h-8 text-xs font-semibold shrink-0 ${isOos ? "" : "gradient-brand text-white border-0 hover:opacity-90"}`}
            variant={isOos ? "outline" : "default"}
            disabled={isOos}
            onClick={(e) => { e.stopPropagation(); if (!isOos) navigate(`/products/${product.id}`); }}
          >
            {isOos ? "Out of stock" : hasVariants ? "View options" : "View product"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface FilterPanelProps {
  rootCategories: Category[];
  subCategories: Category[];
  allTags: Tag[];
  selectedCat: string;
  selectedSubCat: string;
  selectedTag: string;
  onCatChange: (id: string) => void;
  onSubCatChange: (id: string) => void;
  onTagChange: (id: string) => void;
}

function FilterPanel({
  rootCategories, subCategories, allTags,
  selectedCat, selectedSubCat, selectedTag,
  onCatChange, onSubCatChange, onTagChange,
}: FilterPanelProps) {
  return (
    <div className="space-y-7">
      {/* Categories */}
      {rootCategories.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Category</h3>
          <div className="space-y-0.5">
            <button
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${selectedCat === "all" ? "bg-primary/15 text-primary font-semibold" : "hover:bg-accent text-foreground"}`}
              onClick={() => { onCatChange("all"); onSubCatChange("all"); }}
            >
              All Products
            </button>
            {rootCategories.map((cat) => {
              const subs = subCategories.filter((sc) => sc.parent_id === cat.id);
              const active = selectedCat === cat.id;
              return (
                <div key={cat.id}>
                  <button
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${active ? "bg-primary/15 text-primary font-semibold" : "hover:bg-accent text-foreground"}`}
                    onClick={() => { onCatChange(cat.id); onSubCatChange("all"); }}
                  >
                    {cat.name}
                  </button>
                  {active && subs.length > 0 && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/60 pl-3">
                      {subs.map((sub) => (
                        <button
                          key={sub.id}
                          className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${selectedSubCat === sub.id ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
                          onClick={() => onSubCatChange(selectedSubCat === sub.id ? "all" : sub.id)}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tags */}
      {allTags.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Tags</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onTagChange("all")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selectedTag === "all" ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onTagChange(selectedTag === tag.id ? "all" : tag.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selectedTag === tag.id ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  const [, navigate] = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [selectedSubCat, setSelectedSubCat] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const { rootCategories, subCategories, allTags } = useMemo(() => {
    const catMap = new Map<string, Category>();
    const tagMap = new Map<string, Tag>();
    products.forEach((p) => {
      if (p.categories) catMap.set(p.categories.id, p.categories);
      (p.product_tags || []).forEach((pt) => { if (pt.tags) tagMap.set(pt.tags.id, pt.tags); });
    });
    const cats = Array.from(catMap.values());
    return {
      rootCategories: cats.filter((c) => !c.parent_id),
      subCategories: cats.filter((c) => !!c.parent_id),
      allTags: Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [products]);

  const filtered = useMemo(() => {
    let result = products;

    if (selectedCat !== "all") {
      if (selectedSubCat !== "all") {
        result = result.filter((p) => p.categories?.id === selectedSubCat || p.category_id === selectedSubCat);
      } else {
        const subIds = subCategories.filter((sc) => sc.parent_id === selectedCat).map((sc) => sc.id);
        result = result.filter((p) =>
          p.categories?.id === selectedCat || subIds.includes(p.categories?.id ?? "")
        );
      }
    }

    if (selectedTag !== "all") {
      result = result.filter((p) =>
        (p.product_tags || []).some((pt) => pt.tags?.id === selectedTag)
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.categories?.name || "").toLowerCase().includes(q) ||
        (p.product_tags || []).some((pt) => pt.tags?.name.toLowerCase().includes(q))
      );
    }

    return sortProducts(result, sort);
  }, [products, selectedCat, selectedSubCat, selectedTag, search, sort, subCategories]);

  const hasActiveFilters = selectedCat !== "all" || selectedTag !== "all" || search.trim() !== "";

  const clearFilters = () => {
    setSelectedCat("all"); setSelectedSubCat("all");
    setSelectedTag("all"); setSearch("");
  };

  const filterProps = {
    rootCategories, subCategories, allTags,
    selectedCat, selectedSubCat, selectedTag,
    onCatChange: (id: string) => { setSelectedCat(id); setSelectedSubCat("all"); },
    onSubCatChange: setSelectedSubCat,
    onTagChange: setSelectedTag,
  };

  const showSidebar = rootCategories.length > 0 || allTags.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight hidden sm:block">{APP_CONFIG.appName}</span>
          </button>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search products, categories, tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-sm bg-card"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mobile filters toggle */}
          {showSidebar && (
            <Button
              variant="outline"
              size="sm"
              className="md:hidden h-9 gap-1.5 shrink-0"
              onClick={() => setMobileFiltersOpen((o) => !o)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="text-xs">Filters</span>
              {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </Button>
          )}

          {/* Sort */}
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[140px] sm:w-[170px] h-9 text-xs shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="price_asc">Price: Low → High</SelectItem>
              <SelectItem value="price_desc">Price: High → Low</SelectItem>
              <SelectItem value="instock">In stock first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Mobile filter panel */}
      {mobileFiltersOpen && showSidebar && (
        <div className="md:hidden border-b border-border bg-card/80 px-5 py-5">
          <FilterPanel {...filterProps} />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className={`flex gap-8 ${showSidebar ? "" : ""}`}>
          {/* Desktop sidebar */}
          {showSidebar && (
            <aside className="hidden md:block w-52 shrink-0 pt-1">
              <FilterPanel {...filterProps} />
            </aside>
          )}

          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Status bar */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <h1 className="text-xl font-extrabold">Shop</h1>
              {!loading && (
                <span className="text-sm text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? "product" : "products"}
                </span>
              )}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <X className="w-3 h-3" />Clear filters
                </button>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
                <Package className="w-14 h-14 text-muted-foreground/25" />
                <h2 className="text-lg font-bold">No products found</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {hasActiveFilters
                    ? "No products match your current filters. Try clearing them."
                    : "No products are available right now. Check back soon."}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
