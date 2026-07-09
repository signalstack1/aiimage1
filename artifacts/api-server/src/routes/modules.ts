import { Router, type Request, type Response, type NextFunction } from "express";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

// ── Auth (duplicated from admin.ts to avoid circular imports) ─────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const ADMIN_TOKEN_PREFIX = "ss_admin_";

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
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!verifyToken(token)) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function ok(res: Response, data: any, status = 200) { return res.status(status).json(data); }
function err(res: Response, msg: string, status = 500) { return res.status(status).json({ error: msg }); }

// =============================================================================
// PUBLIC ENDPOINTS
// =============================================================================

// GET /api/business-profile
router.get("/business-profile", async (_req, res) => {
  if (!isSupabaseConfigured()) return ok(res, { id: "default", business_name: "" });
  const { data, error } = await supabase.from("business_profile").select("*").eq("id", "default").single();
  if (error) { logger.warn({ err: error.message }, "GET /business-profile failed"); return ok(res, { id: "default", business_name: "" }); }
  return ok(res, data);
});

// GET /api/services
router.get("/services", async (_req, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);
  const { data, error } = await supabase.from("services").select("*").eq("is_active", true).order("sort_order").order("created_at");
  if (error) { logger.warn({ err: error.message }, "GET /services failed"); return ok(res, []); }
  return ok(res, data || []);
});

// POST /api/leads  (public quote/lead form)
router.post("/leads", async (req, res) => {
  const { name, email, phone, location, service_needed, message } = req.body || {};
  if (!isSupabaseConfigured()) return ok(res, { ok: true });
  const { data, error } = await supabase.from("leads").insert({ name: name || "", email, phone, location, service_needed, message }).select().single();
  if (error) { logger.warn({ err: error.message }, "POST /leads failed"); return err(res, error.message); }
  return ok(res, data, 201);
});

// POST /api/bookings  (public booking form)
router.post("/bookings", async (req, res) => {
  const { customer_name, email, phone, service, preferred_date, preferred_time, message } = req.body || {};
  if (!isSupabaseConfigured()) return ok(res, { ok: true });
  const { data, error } = await supabase.from("bookings").insert({ customer_name: customer_name || "", email, phone, service, preferred_date, preferred_time, message }).select().single();
  if (error) { logger.warn({ err: error.message }, "POST /bookings failed"); return err(res, error.message); }
  return ok(res, data, 201);
});

// GET /api/reviews  (published only)
router.get("/reviews", async (_req, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);
  const { data, error } = await supabase.from("reviews").select("*").eq("is_published", true).order("created_at", { ascending: false });
  if (error) { logger.warn({ err: error.message }, "GET /reviews failed"); return ok(res, []); }
  return ok(res, data || []);
});

// GET /api/gallery  (published only)
router.get("/gallery", async (_req, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);
  const { data, error } = await supabase.from("gallery").select("*").eq("is_published", true).order("sort_order").order("created_at", { ascending: false });
  if (error) { logger.warn({ err: error.message }, "GET /gallery failed"); return ok(res, []); }
  return ok(res, data || []);
});

// POST /api/messages  (public contact form)
router.post("/messages", async (req, res) => {
  const { name, email, subject, body } = req.body || {};
  if (!email || !body) return err(res, "email and body required", 400);
  if (!isSupabaseConfigured()) return ok(res, { ok: true });
  const { data, error } = await supabase.from("messages").insert({ email, name: name || "", subject: subject || "", body }).select().single();
  if (error) { logger.warn({ err: error.message }, "POST /messages failed"); return err(res, error.message); }
  return ok(res, data, 201);
});

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

// ── Business Profile ──────────────────────────────────────────────────────────
router.get("/admin/business-profile", requireAdmin, async (_req, res) => {
  if (!isSupabaseConfigured()) return ok(res, { id: "default", business_name: "" });
  const { data, error } = await supabase.from("business_profile").select("*").eq("id", "default").single();
  if (error) return ok(res, { id: "default", business_name: "" });
  return ok(res, data);
});

router.patch("/admin/business-profile", requireAdmin, async (req, res) => {
  if (!isSupabaseConfigured()) return ok(res, { ...req.body, id: "default" });
  const fields = { ...req.body, updated_at: new Date().toISOString() };
  delete fields.id;
  const { data, error } = await supabase.from("business_profile").upsert({ id: "default", ...fields }).select().single();
  if (error) return err(res, error.message);
  return ok(res, data);
});

// ── Services ──────────────────────────────────────────────────────────────────
router.get("/admin/services", requireAdmin, async (_req, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);
  const { data, error } = await supabase.from("services").select("*").order("sort_order").order("created_at");
  if (error) { logger.warn({ err: error.message }, "GET /admin/services failed"); return ok(res, []); }
  return ok(res, data || []);
});

router.post("/admin/services", requireAdmin, async (req, res) => {
  const { name, description, image_url, category, starting_price, cta_type, is_active, is_featured, sort_order } = req.body || {};
  if (!name) return err(res, "name required", 400);
  if (!isSupabaseConfigured()) return ok(res, { id: `svc-${Date.now()}`, name, is_active: true, is_featured: false }, 201);
  const { data, error } = await supabase.from("services").insert({ name, description, image_url, category, starting_price, cta_type: cta_type || "quote", is_active: is_active ?? true, is_featured: is_featured ?? false, sort_order: sort_order ?? 0 }).select().single();
  if (error) return err(res, error.message);
  return ok(res, data, 201);
});

router.patch("/admin/services/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { id, ...req.body });
  const { data, error } = await supabase.from("services").update(req.body).eq("id", id).select().single();
  if (error) return err(res, error.message);
  return ok(res, data);
});

router.delete("/admin/services/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { deleted: true });
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) return err(res, error.message);
  return ok(res, { deleted: true });
});

// ── Leads ─────────────────────────────────────────────────────────────────────
router.get("/admin/leads", requireAdmin, async (_req, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);
  const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (error) { logger.warn({ err: error.message }, "GET /admin/leads failed"); return ok(res, []); }
  return ok(res, data || []);
});

router.post("/admin/leads", requireAdmin, async (req, res) => {
  const { name, business_name, email, phone, trade, town, website, location, service_needed, message, stage, status } = req.body || {};
  const resolvedStage = stage || status || "new";
  if (!isSupabaseConfigured()) return ok(res, { id: `lead-${Date.now()}`, name: name || "", business_name: business_name || "", email, phone, trade: trade || service_needed || "", town: town || location || "", website: website || "", message, stage: resolvedStage, last_contacted_at: null, created_at: new Date().toISOString() }, 201);
  const { data, error } = await supabase.from("leads").insert({ name: name || "", business_name: business_name || "", email, phone, trade: trade || service_needed || "", town: town || location || "", website: website || "", location, service_needed, message, stage: resolvedStage }).select().single();
  if (error) return err(res, error.message);
  return ok(res, data, 201);
});

router.patch("/admin/leads/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { id, ...req.body });
  const { data, error } = await supabase.from("leads").update(req.body).eq("id", id).select().single();
  if (error) return err(res, error.message);
  return ok(res, data);
});

router.delete("/admin/leads/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { deleted: true });
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return err(res, error.message);
  return ok(res, { deleted: true });
});

// ── Bookings ──────────────────────────────────────────────────────────────────
router.get("/admin/bookings", requireAdmin, async (_req, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);
  const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
  if (error) { logger.warn({ err: error.message }, "GET /admin/bookings failed"); return ok(res, []); }
  return ok(res, data || []);
});

router.patch("/admin/bookings/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { id, ...req.body });
  const { data, error } = await supabase.from("bookings").update(req.body).eq("id", id).select().single();
  if (error) return err(res, error.message);
  return ok(res, data);
});

router.delete("/admin/bookings/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { deleted: true });
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) return err(res, error.message);
  return ok(res, { deleted: true });
});

// ── Orders ────────────────────────────────────────────────────────────────────
router.get("/admin/orders", requireAdmin, async (_req, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (error) { logger.warn({ err: error.message }, "GET /admin/orders failed"); return ok(res, []); }
  return ok(res, data || []);
});

router.post("/admin/orders", requireAdmin, async (req, res) => {
  if (!isSupabaseConfigured()) return ok(res, { id: `ord-${Date.now()}`, ...req.body }, 201);
  const { data, error } = await supabase.from("orders").insert(req.body).select().single();
  if (error) return err(res, error.message);
  return ok(res, data, 201);
});

router.patch("/admin/orders/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { id, ...req.body });
  const { data, error } = await supabase.from("orders").update(req.body).eq("id", id).select().single();
  if (error) return err(res, error.message);
  return ok(res, data);
});

router.delete("/admin/orders/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { deleted: true });
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) return err(res, error.message);
  return ok(res, { deleted: true });
});

// ── Reviews ───────────────────────────────────────────────────────────────────
router.get("/admin/reviews", requireAdmin, async (_req, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);
  const { data, error } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
  if (error) { logger.warn({ err: error.message }, "GET /admin/reviews failed"); return ok(res, []); }
  return ok(res, data || []);
});

router.post("/admin/reviews", requireAdmin, async (req, res) => {
  if (!isSupabaseConfigured()) return ok(res, { id: `rev-${Date.now()}`, ...req.body }, 201);
  const { data, error } = await supabase.from("reviews").insert(req.body).select().single();
  if (error) return err(res, error.message);
  return ok(res, data, 201);
});

router.patch("/admin/reviews/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { id, ...req.body });
  const { data, error } = await supabase.from("reviews").update(req.body).eq("id", id).select().single();
  if (error) return err(res, error.message);
  return ok(res, data);
});

router.delete("/admin/reviews/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { deleted: true });
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) return err(res, error.message);
  return ok(res, { deleted: true });
});

// ── Gallery ───────────────────────────────────────────────────────────────────
router.get("/admin/gallery", requireAdmin, async (_req, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);
  const { data, error } = await supabase.from("gallery").select("*").order("sort_order").order("created_at", { ascending: false });
  if (error) { logger.warn({ err: error.message }, "GET /admin/gallery failed"); return ok(res, []); }
  return ok(res, data || []);
});

router.post("/admin/gallery", requireAdmin, async (req, res) => {
  if (!isSupabaseConfigured()) return ok(res, { id: `gal-${Date.now()}`, ...req.body }, 201);
  const { data, error } = await supabase.from("gallery").insert(req.body).select().single();
  if (error) return err(res, error.message);
  return ok(res, data, 201);
});

router.patch("/admin/gallery/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { id, ...req.body });
  const { data, error } = await supabase.from("gallery").update(req.body).eq("id", id).select().single();
  if (error) return err(res, error.message);
  return ok(res, data);
});

router.delete("/admin/gallery/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { deleted: true });
  const { error } = await supabase.from("gallery").delete().eq("id", id);
  if (error) return err(res, error.message);
  return ok(res, { deleted: true });
});

// ── Messages (admin inbox) ────────────────────────────────────────────────────
router.get("/admin/messages", requireAdmin, async (_req, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);
  const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: false });
  if (error) { logger.warn({ err: error.message }, "GET /admin/messages failed"); return ok(res, []); }
  return ok(res, data || []);
});

router.patch("/admin/messages/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { id, ...req.body });
  const { data, error } = await supabase.from("messages").update(req.body).eq("id", id).select().single();
  if (error) return err(res, error.message);
  return ok(res, data);
});

router.delete("/admin/messages/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { deleted: true });
  const { error } = await supabase.from("messages").delete().eq("id", id);
  if (error) return err(res, error.message);
  return ok(res, { deleted: true });
});

export default router;
