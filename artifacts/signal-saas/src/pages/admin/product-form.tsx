import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ImagePlus, X, Loader2, Plus, Trash2, GripVertical, AlertTriangle, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { APP_CONFIG } from "@/config/app";

interface ProductFormProps { id?: string; }

interface Category { id: string; name: string; parent_id: string | null; }
interface Tag { id: string; name: string; }
interface VariantDraft { name: string; options: string[]; }

interface FormData {
  name: string; description: string; price_cents: number; currency: string;
  interval: string; payment_provider: string; payment_url: string;
  button_label: string; image_url: string; category_id: string;
  stock_quantity: string; show_stock: boolean; status: string;
  free_delivery_enabled: boolean; faster_delivery_enabled: boolean;
  faster_delivery_payment_link: string;
}

const INTERVALS = ["one-time","weekly","monthly","quarterly","yearly","lifetime"];
const INTERVAL_LABELS: Record<string, string> = {
  "one-time":"One-time Payment", weekly:"Weekly", monthly:"Monthly",
  quarterly:"Quarterly", yearly:"Yearly", lifetime:"Lifetime",
};
const CURRENCIES = [{ value: "usd", label: "USD", symbol: "$" }, { value: "gbp", label: "GBP", symbol: "£" }];
const STATUS_OPTIONS = [
  { value: "active", label: "Active", desc: "Visible on the public pricing page" },
  { value: "draft",  label: "Draft",  desc: "Hidden — work in progress" },
  { value: "hidden", label: "Hidden", desc: "Created but not shown publicly" },
];
const EMPTY_FORM: FormData = {
  name: "", description: "", price_cents: 2900, currency: "usd", interval: "one-time",
  payment_provider: "", payment_url: "", button_label: "", image_url: "",
  category_id: "", stock_quantity: "", show_stock: false, status: "active",
  free_delivery_enabled: false, faster_delivery_enabled: false, faster_delivery_payment_link: "",
};

export default function ProductFormPage({ id }: ProductFormProps) {
  const isNew = !id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { singular } = APP_CONFIG.admin.products;
  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [priceInput, setPriceInput] = useState("29.00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Image
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<{ data: string; type: string; name: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tags
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [creatingTag, setCreatingTag] = useState(false);

  // Categories
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  // Variants
  const [variants, setVariants] = useState<VariantDraft[]>([]);

  const f = (field: keyof FormData, val: any) => setForm((p) => ({ ...p, [field]: val }));

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [catsRes, tagsRes] = await Promise.all([
          fetch("/api/admin/categories", { headers }),
          fetch("/api/admin/tags", { headers }),
        ]);
        if (catsRes.ok) setAllCategories(await catsRes.json());
        if (tagsRes.ok) setAllTags(await tagsRes.json());

        if (!isNew) {
          const plansRes = await fetch("/api/admin/plans", { headers });
          if (plansRes.ok) {
            const products = await plansRes.json();
            const p = products.find((x: any) => x.id === id);
            if (!p) { navigate("/admin/products"); return; }
            setForm({
              name: p.name || "", description: p.description || "",
              price_cents: p.price_cents || 2900,
              currency: p.currency === "gbp" ? "gbp" : "usd",
              interval: p.interval || "one-time",
              payment_provider: p.payment_provider || "",
              payment_url: p.payment_url || "",
              button_label: p.button_label || "",
              image_url: p.image_url || "",
              category_id: p.category_id || "",
              stock_quantity: p.stock_quantity != null && p.stock_quantity >= 0 ? String(p.stock_quantity) : "",
              show_stock: p.show_stock || false,
              status: p.status || (p.is_active === false ? "draft" : "active"),
              free_delivery_enabled: p.free_delivery_enabled || false,
              faster_delivery_enabled: p.faster_delivery_enabled || false,
              faster_delivery_payment_link: p.faster_delivery_payment_link || "",
            });
            setPriceInput(((p.price_cents || 2900) / 100).toFixed(2));
            if (p.image_url) setImagePreview(p.image_url);

            // Extract tag IDs from nested structure
            if (p.product_tags) {
              setSelectedTagIds(p.product_tags.map((pt: any) => pt.tag_id || pt.tags?.id).filter(Boolean));
            }

            // Extract variants
            if (p.product_variants && p.product_variants.length > 0) {
              const sorted = [...p.product_variants].sort((a: any, b: any) => a.sort_order - b.sort_order);
              setVariants(sorted.map((v: any) => ({
                name: v.name,
                options: [...(v.product_variant_options || [])].sort((a: any, b: any) => a.sort_order - b.sort_order).map((o: any) => o.value),
              })));
            }
          }
        }
      } catch {
        toast({ title: "Failed to load data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  // ── Image upload ─────────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { toast({ title: "Unsupported format. Use JPEG, PNG, WebP or GIF.", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Image too large — max 5 MB.", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      setImageFile({ data: result.split(",")[1], type: file.type, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => { setImagePreview(null); setImageFile(null); f("image_url", ""); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return form.image_url || null;
    setUploadingImage(true);
    try {
      const res = await fetch("/api/admin/upload-image", { method: "POST", headers, body: JSON.stringify(imageFile) });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      return url;
    } catch {
      toast({ title: "Image upload failed — product saved without image.", variant: "destructive" });
      return form.image_url || null;
    } finally { setUploadingImage(false); }
  };

  // ── Tags ────────────────────────────────────────────────────────────────────
  const toggleTag = (tid: string) =>
    setSelectedTagIds((p) => p.includes(tid) ? p.filter((x) => x !== tid) : [...p, tid]);

  const createTag = async () => {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    try {
      const res = await fetch("/api/admin/tags", { method: "POST", headers, body: JSON.stringify({ name: newTagName.trim() }) });
      if (!res.ok) throw new Error();
      const tag = await res.json();
      setAllTags((p) => [...p, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedTagIds((p) => [...p, tag.id]);
      setNewTagName("");
    } catch { toast({ title: "Failed to create tag", variant: "destructive" }); }
    finally { setCreatingTag(false); }
  };

  // ── Variants ────────────────────────────────────────────────────────────────
  const addVariant = () => setVariants((p) => [...p, { name: "", options: [""] }]);
  const removeVariant = (vi: number) => setVariants((p) => p.filter((_, i) => i !== vi));
  const setVariantName = (vi: number, name: string) =>
    setVariants((p) => p.map((v, i) => i === vi ? { ...v, name } : v));
  const addOption = (vi: number) =>
    setVariants((p) => p.map((v, i) => i === vi ? { ...v, options: [...v.options, ""] } : v));
  const setOption = (vi: number, oi: number, value: string) =>
    setVariants((p) => p.map((v, i) => i === vi ? { ...v, options: v.options.map((o, j) => j === oi ? value : o) } : v));
  const removeOption = (vi: number, oi: number) =>
    setVariants((p) => p.map((v, i) => i === vi ? { ...v, options: v.options.filter((_, j) => j !== oi) } : v));

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const imageUrl = await uploadImage();
      const priceCents = Math.round(parseFloat(priceInput || "0") * 100);
      const stockQty = form.stock_quantity === "" ? -1 : parseInt(form.stock_quantity, 10);

      const cleanVariants = variants
        .filter((v) => v.name.trim())
        .map((v) => ({ name: v.name.trim(), options: v.options.map((o) => o.trim()).filter(Boolean) }));

      const body = {
        ...form,
        price_cents: priceCents,
        image_url: imageUrl || null,
        payment_provider: form.payment_provider || null,
        payment_url: form.payment_url || null,
        button_label: form.button_label || null,
        category_id: form.category_id || null,
        stock_quantity: stockQty,
        tag_ids: selectedTagIds,
        variants: cleanVariants,
      };

      const url = isNew ? "/api/admin/plans" : `/api/admin/plans/${id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: isNew ? `${singular} created` : `${singular} updated` });
      navigate("/admin/products");
    } catch {
      toast({ title: "Error saving", variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) {
    return <AdminLayout><div className="p-8 flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }

  const isBusy = saving || uploadingImage;
  const parentCats = allCategories.filter((c) => !c.parent_id);
  const selectedParentId = form.category_id ? (allCategories.find((c) => c.id === form.category_id)?.parent_id ?? form.category_id) : "";
  const selectedIsChild = !!allCategories.find((c) => c.id === form.category_id)?.parent_id;
  const subCats = selectedParentId && !selectedIsChild ? allCategories.filter((c) => c.parent_id === selectedParentId) : allCategories.filter((c) => c.parent_id === selectedParentId);
  const currSymbol = CURRENCIES.find((c) => c.value === form.currency)?.symbol ?? "$";

  return (
    <AdminLayout>
      <div className="p-8 max-w-2xl">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/products")} className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2 mb-8">
          <ArrowLeft className="w-4 h-4" /> {APP_CONFIG.admin.products.plural}
        </Button>

        <h1 className="text-2xl font-bold mb-8">
          {isNew ? `New ${singular.toLowerCase()}` : `Edit ${singular.toLowerCase()}`}
        </h1>

        <div className="space-y-8">

          {/* ── Status ───────────────────────────────────────────────────────── */}
          <section className="space-y-2">
            <Label>Status</Label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button key={s.value} type="button" onClick={() => f("status", s.value)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition-all ${form.status === s.value ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card hover:border-primary/40"}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.value === "active" ? "bg-green-500" : s.value === "draft" ? "bg-yellow-500" : "bg-muted-foreground"}`} />
                    <span className="text-sm font-medium">{s.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* ── Image ────────────────────────────────────────────────────────── */}
          <section className="space-y-2">
            <Label>Product image <span className="text-muted-foreground text-xs">(optional)</span></Label>
            {imagePreview ? (
              <div className="relative w-full aspect-video max-w-sm rounded-xl overflow-hidden border border-border group">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={clearImage} className="absolute top-2 right-2 bg-background/80 hover:bg-background border border-border rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full max-w-sm aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-card hover:bg-muted/30 transition-colors text-muted-foreground gap-2">
                <ImagePlus className="w-7 h-7" />
                <span className="text-sm">Click to upload image</span>
                <span className="text-xs opacity-60">JPEG, PNG, WebP · max 5 MB</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileSelect} />
          </section>

          {/* ── Basic info ───────────────────────────────────────────────────── */}
          <section className="space-y-5">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive text-xs">*</span></Label>
              <Input value={form.name} onChange={(e) => f("name", e.target.value)} placeholder="Pro" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => f("description", e.target.value)} rows={3} placeholder="What customers get…" />
            </div>
          </section>

          {/* ── Pricing ──────────────────────────────────────────────────────── */}
          <section className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Price</Label>
                <div className="flex rounded-md border border-border overflow-hidden text-xs">
                  {CURRENCIES.map((c) => (
                    <button key={c.value} type="button" onClick={() => f("currency", c.value)}
                      className={`px-2.5 py-1 transition-colors ${form.currency === c.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}${c.value !== "usd" ? " border-l border-border" : ""}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">{currSymbol}</span>
                <Input type="number" min="0" step="0.01" value={priceInput} onChange={(e) => setPriceInput(e.target.value)}
                  onBlur={() => { const n = parseFloat(priceInput); if (!isNaN(n)) setPriceInput(n.toFixed(2)); }} className="pl-7" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Billing interval</Label>
              <Select value={form.interval} onValueChange={(v) => f("interval", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INTERVALS.map((i) => <SelectItem key={i} value={i}>{INTERVAL_LABELS[i]}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Display only — set billing in your payment link.</p>
            </div>
          </section>

          {/* ── Category ─────────────────────────────────────────────────────── */}
          {allCategories.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Category <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <a href="/admin/categories" className="text-xs text-primary hover:underline">Manage categories</a>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Category</p>
                  <Select value={selectedIsChild ? selectedParentId : (form.category_id || "__none__")} onValueChange={(v) => { f("category_id", v === "__none__" ? "" : v); }}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {parentCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {(() => {
                  const parentIdForSubs = selectedIsChild ? selectedParentId : (form.category_id || "");
                  const subs = allCategories.filter((c) => c.parent_id === parentIdForSubs);
                  if (!parentIdForSubs || subs.length === 0) return null;
                  return (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Sub-category</p>
                      <Select value={selectedIsChild ? form.category_id : "__none__"} onValueChange={(v) => f("category_id", v === "__none__" ? parentIdForSubs : v)}>
                        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None (use parent)</SelectItem>
                          {subs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}
              </div>
            </section>
          )}

          {/* ── Tags ─────────────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <Label>Tags <span className="text-muted-foreground text-xs">(optional)</span></Label>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${selected ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
                      {tag.name}
                      {selected && <X className="w-2.5 h-2.5" />}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="New tag…" className="h-8 text-sm max-w-xs"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createTag(); } }} />
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={createTag} disabled={creatingTag || !newTagName.trim()}>
                {creatingTag ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add tag
              </Button>
            </div>
          </section>

          {/* ── Variants / Options ───────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Product variants <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <p className="text-xs text-muted-foreground mt-0.5">e.g. Size → S, M, L &nbsp;·&nbsp; Colour → Black, White</p>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1 shrink-0" onClick={addVariant}>
                <Plus className="w-3 h-3" /> Add variant
              </Button>
            </div>

            {variants.length > 0 && (
              <div className="space-y-4">
                {variants.map((variant, vi) => (
                  <div key={vi} className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      <Input value={variant.name} onChange={(e) => setVariantName(vi, e.target.value)} placeholder="Variant name (e.g. Size)" className="h-8 text-sm font-medium flex-1" />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeVariant(vi)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="pl-6 space-y-2">
                      {variant.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <Input value={opt} onChange={(e) => setOption(vi, oi, e.target.value)} placeholder={`Option ${oi + 1}`} className="h-7 text-sm flex-1" />
                          {variant.options.length > 1 && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeOption(vi, oi)}>
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => addOption(vi)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1">
                        <Plus className="w-3 h-3" /> Add option
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Stock ────────────────────────────────────────────────────────── */}
          <section className="space-y-4">
            <Label>Stock control</Label>
            <div className="grid grid-cols-2 gap-5 items-start">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Quantity available</p>
                <Input type="number" min="0" value={form.stock_quantity} onChange={(e) => f("stock_quantity", e.target.value)}
                  placeholder="Unlimited" className="h-9" />
                <p className="text-xs text-muted-foreground">Leave blank for unlimited stock.</p>
              </div>
              <div className="space-y-2 pt-0.5">
                <p className="text-xs text-muted-foreground">Show stock count publicly</p>
                <div className="flex items-center gap-2.5">
                  <Switch checked={form.show_stock} onCheckedChange={(v) => f("show_stock", v)} id="show-stock" />
                  <Label htmlFor="show-stock" className="text-sm cursor-pointer font-normal">
                    {form.show_stock ? "Shown to customers" : "Hidden from customers"}
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">When on, shows "X left in stock" on the product page.</p>
              </div>
            </div>
          </section>

          {/* ── Payment ──────────────────────────────────────────────────────── */}
          <section className="space-y-5">
            <div className="space-y-1.5">
              <Label>Payment URL</Label>
              <Input value={form.payment_url} onChange={(e) => f("payment_url", e.target.value)} placeholder="https://buy.stripe.com/… or https://whop.com/checkout/…" />
              <p className="text-xs text-muted-foreground">The external checkout page users are sent to when they click buy.</p>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label>Button label <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input value={form.button_label} onChange={(e) => f("button_label", e.target.value)} placeholder="Subscribe" />
              </div>
              <div className="space-y-1.5">
                <Label>Provider <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input value={form.payment_provider} onChange={(e) => f("payment_provider", e.target.value)} placeholder="stripe" />
                <p className="text-xs text-muted-foreground">Display only</p>
              </div>
            </div>
          </section>

          {/* ── Delivery options ─────────────────────────────────────────────── */}
          <section className="space-y-4">
            <div>
              <Label className="text-base font-semibold flex items-center gap-2">
                <Truck className="w-4 h-4" /> Choose delivery options
              </Label>
              <p className="text-xs text-muted-foreground mt-1">Select which delivery options are available for this product.</p>
            </div>

            {/* Free delivery */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Free delivery</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Shipping price is already included in the product price.</p>
                </div>
                <Switch checked={form.free_delivery_enabled} onCheckedChange={(v) => f("free_delivery_enabled", v)} id="free-delivery" />
              </div>
            </div>

            {/* Faster delivery */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Faster delivery</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Customer can pay extra for faster delivery.</p>
                </div>
                <Switch checked={form.faster_delivery_enabled} onCheckedChange={(v) => f("faster_delivery_enabled", v)} id="faster-delivery" />
              </div>

              {form.faster_delivery_enabled && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-start gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400 leading-relaxed">
                      <strong>Important:</strong> Faster delivery requires a second payment link. You must create two payment links for this product. The first payment link should be the normal product price with free delivery included. The second payment link should include the product price plus the faster delivery courier cost.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Faster delivery payment link</Label>
                    <Input
                      value={form.faster_delivery_payment_link}
                      onChange={(e) => f("faster_delivery_payment_link", e.target.value)}
                      placeholder="https://buy.stripe.com/… or https://whop.com/checkout/…"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── Actions ──────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 pt-2">
            <Button className="gradient-brand text-white border-0 hover:opacity-90 min-w-[120px]" onClick={handleSave} disabled={isBusy}>
              {isBusy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{uploadingImage ? "Uploading…" : "Saving…"}</> : isNew ? `Create ${singular.toLowerCase()}` : "Save changes"}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/admin/products")} disabled={isBusy}>Cancel</Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
