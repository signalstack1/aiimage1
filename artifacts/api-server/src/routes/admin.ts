import { Router, type Request, type Response, type NextFunction } from "express";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const ADMIN_TOKEN_PREFIX = "ss_admin_";

function makeToken(): string {
  const ts = Date.now();
  const raw = `${ADMIN_PASSWORD}|${ts}`;
  return ADMIN_TOKEN_PREFIX + Buffer.from(raw).toString("base64");
}

function verifyToken(token: string): boolean {
  if (!token.startsWith(ADMIN_TOKEN_PREFIX)) return false;
  try {
    const raw = Buffer.from(token.slice(ADMIN_TOKEN_PREFIX.length), "base64").toString();
    const [pw, tsStr] = raw.split("|");
    if (pw !== ADMIN_PASSWORD) return false;
    const ts = Number(tsStr);
    if (Date.now() - ts > 30 * 24 * 60 * 60 * 1000) return false;
    return true;
  } catch { return false; }
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  if (!verifyToken(token)) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

// ── Login ─────────────────────────────────────────────────────────────────────
router.post("/admin/login", (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD)
    return res.status(401).json({ error: "Invalid password" });
  return res.json({ token: makeToken() });
});

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_PRODUCTS = [
  { id: "plan-starter", name: "Starter", description: "Core features for individuals.", price_cents: 2900, currency: "usd", interval: "monthly", is_active: true, status: "active", payment_provider: null, payment_url: null, button_label: null, image_url: null, category_id: null, stock_quantity: -1, show_stock: false, product_tags: [], product_variants: [] },
  { id: "plan-pro",     name: "Pro",     description: "Full feature access.",           price_cents: 7900, currency: "usd", interval: "monthly", is_active: true, status: "active", payment_provider: null, payment_url: null, button_label: null, image_url: null, category_id: null, stock_quantity: -1, show_stock: false, product_tags: [], product_variants: [] },
  { id: "plan-lifetime",name: "Lifetime",description: "All Pro features, forever.",     price_cents: 49900,currency: "usd", interval: "lifetime",is_active: true, status: "active", payment_provider: null, payment_url: null, button_label: null, image_url: null, category_id: null, stock_quantity: -1, show_stock: false, product_tags: [], product_variants: [] },
];

const MOCK_CUSTOMERS = [
  { id: "sub-1", email: "alex@example.com",  plan: "Pro",      plan_id: "plan-pro",      status: "active",    subscribed_at: "2024-11-15T10:00:00Z" },
  { id: "sub-2", email: "maria@example.com", plan: "Starter",  plan_id: "plan-starter",  status: "active",    subscribed_at: "2024-12-01T08:30:00Z" },
  { id: "sub-3", email: "james@example.com", plan: "Lifetime", plan_id: "plan-lifetime", status: "active",    subscribed_at: "2024-10-05T14:00:00Z" },
  { id: "sub-4", email: "priya@example.com", plan: "Pro",      plan_id: "plan-pro",      status: "active",    subscribed_at: "2025-01-10T09:15:00Z" },
  { id: "sub-5", email: "tom@example.com",   plan: "Starter",  plan_id: "plan-starter",  status: "cancelled", subscribed_at: "2024-09-20T11:00:00Z" },
];

const MOCK_LINKS = [
  { id: "link-discord",  platform: "discord",  label: "Members Community", invite_url: "https://discord.gg/example" },
  { id: "link-telegram", platform: "telegram", label: "Updates Channel",   invite_url: "https://t.me/example" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const PRODUCT_SELECT = `
  *, 
  product_tags(tag_id, tags(id, name)),
  product_variants(id, name, sort_order, product_variant_options(id, value, sort_order))
`;

async function upsertTagsForProduct(productId: string, tagIds: string[]) {
  await supabase.from("product_tags").delete().eq("product_id", productId);
  if (tagIds && tagIds.length > 0) {
    await supabase.from("product_tags").insert(
      tagIds.map((tid: string) => ({ product_id: productId, tag_id: tid }))
    );
  }
}

async function upsertVariantsForProduct(productId: string, variants: any[]) {
  await supabase.from("product_variants").delete().eq("product_id", productId);
  if (variants && variants.length > 0) {
    for (let vi = 0; vi < variants.length; vi++) {
      const v = variants[vi];
      const { data: vd } = await supabase
        .from("product_variants")
        .insert({ product_id: productId, name: v.name, sort_order: vi })
        .select()
        .single();
      if (vd && v.options && v.options.length > 0) {
        await supabase.from("product_variant_options").insert(
          v.options.map((val: string, oi: number) => ({ variant_id: vd.id, value: val, sort_order: oi }))
        );
      }
    }
  }
}

function resolveIsActive(status?: string, isActive?: boolean): boolean {
  if (status === "active") return true;
  if (status === "draft" || status === "hidden") return false;
  return isActive ?? true;
}

// ── Overview ──────────────────────────────────────────────────────────────────
router.get("/admin/overview", requireAdmin, async (req, res) => {
  if (!isSupabaseConfigured()) {
    const active = MOCK_CUSTOMERS.filter((s) => s.status === "active");
    return res.json({
      total_subscribers: MOCK_CUSTOMERS.length, active_subscribers: active.length,
      monthly_revenue_cents: 198300, total_revenue_cents: 584700,
      products_live: MOCK_PRODUCTS.filter((p) => p.is_active).length,
      recent_subscribers: MOCK_CUSTOMERS.slice(0, 5).map((s) => ({ email: s.email, plan: s.plan, status: s.status, subscribed_at: s.subscribed_at })),
    });
  }
  try {
    const { data: customers } = await supabase.from("customers").select("email, plan_name, status, subscribed_at").order("subscribed_at", { ascending: false });
    const { data: payments } = await supabase.from("payments").select("amount_cents, created_at");
    const { count: productsLive } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active");
    const allCustomers = customers || [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenue = (payments || []).filter((p) => new Date(p.created_at) >= monthStart).reduce((acc, p) => acc + p.amount_cents, 0);
    const totalRevenue = (payments || []).reduce((acc, p) => acc + p.amount_cents, 0);
    return res.json({
      total_subscribers: allCustomers.length,
      active_subscribers: allCustomers.filter((s) => s.status === "active").length,
      monthly_revenue_cents: monthlyRevenue, total_revenue_cents: totalRevenue,
      products_live: productsLive ?? 0,
      recent_subscribers: allCustomers.slice(0, 5).map((s) => ({ email: s.email, plan: s.plan_name, status: s.status, subscribed_at: s.subscribed_at })),
    });
  } catch (err: any) {
    logger.error({ err }, "Overview error");
    return res.status(500).json({ error: err.message });
  }
});

// ── Customers ─────────────────────────────────────────────────────────────────
router.get("/admin/subscribers", requireAdmin, async (req, res) => {
  if (!isSupabaseConfigured()) return res.json(MOCK_CUSTOMERS);
  const { data, error } = await supabase
    .from("customers")
    .select("id, email, plan_name, plan_id, status, subscribed_at, expires_at")
    .order("subscribed_at", { ascending: false });
  if (error) { logger.warn({ err: error.message }, "/admin/subscribers DB error"); return res.json(MOCK_CUSTOMERS); }
  return res.json((data || []).map((s: any) => ({ ...s, plan: s.plan_name })));
});

// ── Products ──────────────────────────────────────────────────────────────────
router.get("/admin/plans", requireAdmin, async (req, res) => {
  if (!isSupabaseConfigured()) return res.json(MOCK_PRODUCTS);
  // Try full select with joins first; fall back to basic select if schema not migrated yet
  const { data, error } = await supabase.from("products").select(PRODUCT_SELECT).order("price_cents");
  if (error) {
    logger.warn({ err: error.message }, "/admin/plans joined select failed — trying basic select");
    const { data: basic, error: basicErr } = await supabase.from("products").select("*").order("price_cents");
    if (basicErr) { logger.warn({ err: basicErr.message }, "/admin/plans basic select also failed"); return res.json(MOCK_PRODUCTS); }
    return res.json((basic || []).map((p: any) => ({ ...p, product_tags: [], product_variants: [] })));
  }
  return res.json(data || []);
});

router.post("/admin/plans", requireAdmin, async (req, res) => {
  const {
    name, description, price_cents, currency, interval,
    payment_provider, payment_url, button_label, image_url,
    category_id, stock_quantity, show_stock, status,
    free_delivery_enabled, faster_delivery_enabled, faster_delivery_payment_link,
    tag_ids, variants,
  } = req.body;

  if (!name || !price_cents || !interval)
    return res.status(400).json({ error: "name, price_cents, interval required" });

  const resolvedCurrency = currency === "gbp" ? "gbp" : "usd";
  const resolvedStatus = status || "active";
  const stockQty = stock_quantity != null && stock_quantity !== "" ? Number(stock_quantity) : -1;

  if (!isSupabaseConfigured()) {
    return res.status(201).json({ id: `plan-${Date.now()}`, name, description, price_cents, currency: resolvedCurrency, interval, is_active: resolvedStatus === "active", status: resolvedStatus, payment_provider: payment_provider || null, payment_url: payment_url || null, button_label: button_label || null, image_url: image_url || null, category_id: category_id || null, stock_quantity: stockQty, show_stock: show_stock || false, product_tags: [], product_variants: [] });
  }

  // Try insert with new columns first; if schema not migrated yet, fall back to basic columns
  let data: any;
  const fullInsert = {
    name, description, price_cents, currency: resolvedCurrency, interval,
    payment_provider: payment_provider || null, payment_url: payment_url || null,
    button_label: button_label || null, image_url: image_url || null,
    category_id: category_id || null,
    stock_quantity: stockQty, show_stock: show_stock || false,
    status: resolvedStatus, is_active: resolvedStatus === "active",
    free_delivery_enabled: free_delivery_enabled || false,
    faster_delivery_enabled: faster_delivery_enabled || false,
    faster_delivery_payment_link: faster_delivery_payment_link || null,
  };
  const { data: d1, error: e1 } = await supabase.from("products").insert(fullInsert).select().single();
  if (e1) {
    logger.warn({ err: e1.message }, "POST /admin/plans full insert failed — trying basic insert");
    const basicInsert = {
      name, description, price_cents, currency: resolvedCurrency, interval,
      payment_provider: payment_provider || null, payment_url: payment_url || null,
      button_label: button_label || null, image_url: image_url || null,
      is_active: resolvedStatus === "active",
    };
    const { data: d2, error: e2 } = await supabase.from("products").insert(basicInsert).select().single();
    if (e2) return res.status(500).json({ error: e2.message });
    data = d2;
  } else {
    data = d1;
    // Only attempt tag/variant writes if full schema exists
    try { await upsertTagsForProduct(data.id, tag_ids || []); } catch (e: any) { logger.warn({ err: e.message }, "upsertTags skipped — schema not migrated"); }
    try { await upsertVariantsForProduct(data.id, variants || []); } catch (e: any) { logger.warn({ err: e.message }, "upsertVariants skipped — schema not migrated"); }
  }

  const { data: full } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", data.id).single();
  return res.status(201).json(full || { ...data, product_tags: [], product_variants: [] });
});

router.patch("/admin/plans/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return res.json({ id, ...req.body });

  const { tag_ids, variants, ...fields } = req.body;

  if (fields.status !== undefined) {
    fields.is_active = fields.status === "active";
  }
  if (fields.stock_quantity !== undefined && fields.stock_quantity !== "") {
    fields.stock_quantity = Number(fields.stock_quantity);
  }
  if (fields.category_id === "") fields.category_id = null;

  const { data: existing } = await supabase.from("products").select("name, is_active").eq("id", id).single();
  const { data, error } = await supabase.from("products").update(fields).eq("id", id).select().single();
  if (error) {
    // If new columns don't exist yet, strip them and retry with basic fields only
    logger.warn({ err: error.message }, "PATCH /admin/plans full update failed — trying basic update");
    const { category_id: _c, stock_quantity: _s, show_stock: _ss, status: _st, free_delivery_enabled: _fd, faster_delivery_enabled: _fde, faster_delivery_payment_link: _fdpl, ...basicFields } = fields;
    const { data: d2, error: e2 } = await supabase.from("products").update(basicFields).eq("id", id).select().single();
    if (e2) return res.status(500).json({ error: e2.message });
    return res.json({ ...d2, product_tags: [], product_variants: [] });
  }

  if (fields.is_active === true && existing && !existing.is_active) {
    await supabase.from("events").insert({ event_type: "product_publish", product_id: id, product_name: data?.name ?? existing.name, actor: "admin", meta: {} });
  }

  try { if (tag_ids !== undefined) await upsertTagsForProduct(id, tag_ids); } catch (e: any) { logger.warn({ err: e.message }, "upsertTags skipped — schema not migrated"); }
  try { if (variants !== undefined) await upsertVariantsForProduct(id, variants); } catch (e: any) { logger.warn({ err: e.message }, "upsertVariants skipped — schema not migrated"); }

  const { data: full } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", id).single();
  return res.json(full || { ...data, product_tags: [], product_variants: [] });
});

router.delete("/admin/plans/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return res.json({ deleted: true });
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ deleted: true });
});

// ── Categories ────────────────────────────────────────────────────────────────
router.get("/admin/categories", requireAdmin, async (req, res) => {
  if (!isSupabaseConfigured()) return res.json([]);
  const { data, error } = await supabase.from("categories").select("id, name, parent_id, sort_order").order("sort_order").order("name");
  if (error) { logger.warn({ err: error.message }, "/admin/categories — schema not migrated yet, returning []"); return res.json([]); }
  return res.json(data || []);
});

router.post("/admin/categories", requireAdmin, async (req, res) => {
  const { name, parent_id } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  if (!isSupabaseConfigured()) return res.status(201).json({ id: `cat-${Date.now()}`, name, parent_id: parent_id || null });
  const { data, error } = await supabase.from("categories").insert({ name, parent_id: parent_id || null }).select().single();
  if (error) { logger.warn({ err: error.message }, "POST /admin/categories failed"); return res.status(500).json({ error: "Run migration 002 in Supabase first." }); }
  return res.status(201).json(data);
});

router.patch("/admin/categories/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  if (!isSupabaseConfigured()) return res.json({ id, name });
  const { data, error } = await supabase.from("categories").update({ name }).eq("id", id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.delete("/admin/categories/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return res.json({ deleted: true });
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ deleted: true });
});

// ── Tags ──────────────────────────────────────────────────────────────────────
router.get("/admin/tags", requireAdmin, async (req, res) => {
  if (!isSupabaseConfigured()) return res.json([]);
  const { data, error } = await supabase.from("tags").select("id, name").order("name");
  if (error) { logger.warn({ err: error.message }, "/admin/tags — schema not migrated yet, returning []"); return res.json([]); }
  return res.json(data || []);
});

router.post("/admin/tags", requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  if (!isSupabaseConfigured()) return res.status(201).json({ id: `tag-${Date.now()}`, name });
  const { data, error } = await supabase.from("tags").insert({ name }).select().single();
  if (error) { logger.warn({ err: error.message }, "POST /admin/tags failed"); return res.status(500).json({ error: "Run migration 002 in Supabase first." }); }
  return res.status(201).json(data);
});

router.delete("/admin/tags/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return res.json({ deleted: true });
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) { logger.warn({ err: error.message }, "DELETE /admin/tags failed"); return res.status(500).json({ error: error.message }); }
  return res.json({ deleted: true });
});

// ── Access Links ──────────────────────────────────────────────────────────────
router.get("/admin/links", requireAdmin, async (req, res) => {
  if (!isSupabaseConfigured()) return res.json(MOCK_LINKS);
  const { data, error } = await supabase.from("access_links").select("*").order("created_at", { ascending: true });
  if (error) { logger.warn({ err: error.message }, "/admin/links DB error"); return res.json(MOCK_LINKS); }
  return res.json(data || []);
});

router.post("/admin/links", requireAdmin, async (req, res) => {
  const { platform, label, invite_url } = req.body;
  if (!platform || !label || !invite_url) return res.status(400).json({ error: "platform, label, invite_url required" });
  if (!isSupabaseConfigured()) return res.status(201).json({ id: `link-${Date.now()}`, platform, label, invite_url });
  const { data, error } = await supabase.from("access_links").insert({ platform, label, invite_url }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

router.delete("/admin/links/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return res.json({ deleted: true });
  const { error } = await supabase.from("access_links").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ deleted: true });
});

// ── Image upload ──────────────────────────────────────────────────────────────
const IMAGE_BUCKET = "product-images";

async function ensureImageBucket() {
  const { error } = await supabase.storage.createBucket(IMAGE_BUCKET, { public: true });
  if (error && !error.message.toLowerCase().includes("already exist") && !error.message.toLowerCase().includes("duplicate")) {
    logger.warn({ err: error.message }, "ensureImageBucket warning");
  }
}

router.post("/admin/upload-image", requireAdmin, async (req, res) => {
  const { data, type, name } = req.body || {};
  if (!data || !type) return res.status(400).json({ error: "data and type required" });
  if (!isSupabaseConfigured()) return res.json({ url: "https://placehold.co/600x400/1a1a1a/ffffff?text=Image" });
  try {
    await ensureImageBucket();
    const ext = (name as string || "").split(".").pop()?.toLowerCase() || type.split("/")[1] || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(data as string, "base64");
    const { error: uploadError } = await supabase.storage.from(IMAGE_BUCKET).upload(filename, buffer, { contentType: type, upsert: false });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(filename);
    return res.json({ url: urlData.publicUrl });
  } catch (err: any) {
    logger.warn({ err }, "/admin/upload-image error");
    return res.status(500).json({ error: err?.message || "Upload failed" });
  }
});

// ── Activity log ──────────────────────────────────────────────────────────────
function eventLabel(type: string, productName: string | null): string {
  const p = productName || "a product";
  switch (type) {
    case "product_view":    return `Viewed ${p}`;
    case "purchase_click":  return `Clicked buy for ${p}`;
    case "product_publish": return `Published ${p}`;
    case "member_join":     return `New member joined ${p}`;
    case "member_cancel":   return `Member cancelled ${p}`;
    default:                return type;
  }
}

const MOCK_EVENTS = Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  event_type: ["product_view","purchase_click","member_join","product_publish","product_view","product_view"][i % 6],
  label: "",
  plan_name: ["Pro","Starter","Lifetime"][i % 3],
  created_at: new Date(Date.now() - i * 15 * 60000).toISOString(),
})).map((e) => ({ ...e, label: eventLabel(e.event_type, e.plan_name) }));

router.get("/admin/activity", requireAdmin, async (req, res) => {
  const type = (req.query.type as string) || "all";
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  if (!isSupabaseConfigured()) {
    const filtered = type === "all" ? MOCK_EVENTS : MOCK_EVENTS.filter((e) => e.event_type === type);
    return res.json({ events: filtered.slice(offset, offset + limit), total: filtered.length });
  }
  try {
    let query = supabase.from("events").select("id, event_type, product_name, created_at", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (type !== "all") query = query.eq("event_type", type);
    const { data, count, error } = await query;
    if (error) {
      logger.warn({ err: error.message }, "/admin/activity DB error");
      const filtered = type === "all" ? MOCK_EVENTS : MOCK_EVENTS.filter((e) => e.event_type === type);
      return res.json({ events: filtered.slice(offset, offset + limit), total: filtered.length });
    }
    const events = (data || []).map((e: any) => ({ id: e.id, event_type: e.event_type, label: eventLabel(e.event_type, e.product_name), plan_name: e.product_name, created_at: e.created_at }));
    return res.json({ events, total: count ?? 0 });
  } catch (err: any) {
    logger.warn({ err }, "/admin/activity error");
    const filtered = type === "all" ? MOCK_EVENTS : MOCK_EVENTS.filter((e) => e.event_type === type);
    return res.json({ events: filtered.slice(offset, offset + limit), total: filtered.length });
  }
});

export default router;
