/**
 * VIA Secured API Routes
 * - Public: /api/via/verify/:viaNumber, /api/via/apply, /api/payment-links
 * - Admin:  /api/admin/payment-links (GET, POST, PATCH, DELETE)
 *           /api/admin/via/applications, /api/admin/via/members (stubs for Task 3)
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

// ── Auth (same pattern as admin.ts) ──────────────────────────────────────────
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

function ok(res: Response, data: any, status = 200) { return res.status(status).json(data); }
function err(res: Response, msg: string, status = 500) { return res.status(status).json({ error: msg }); }

// =============================================================================
// PUBLIC ENDPOINTS
// =============================================================================

// GET /api/via/verify/:viaNumber — public profile lookup (approved members only)
router.get("/via/verify/:viaNumber", async (req, res) => {
  const { viaNumber } = req.params;
  const normalized = viaNumber.trim().toUpperCase();

  if (!isSupabaseConfigured()) {
    // Dev mock — return a sample profile for VIA1001
    if (normalized === "VIA1001") {
      return ok(res, MOCK_PROFILE);
    }
    return res.status(404).json({ error: "Not found" });
  }

  try {
    const { data: business, error: bErr } = await supabase
      .from("businesses")
      .select(`
        via_number, business_name, trade_type, location,
        contact_phone, contact_enabled,
        applications!inner(status, updated_at),
        verification_checks(check_type, status, checked_at)
      `)
      .eq("via_number", normalized)
      .eq("applications.status", "approved")
      .single();

    if (bErr || !business) return res.status(404).json({ error: "Not found" });

    const app = (business as any).applications?.[0];
    return ok(res, {
      via_number: business.via_number,
      business_name: business.business_name,
      trade_type: business.trade_type,
      location: business.location,
      status: "approved",
      last_checked: app?.updated_at ?? null,
      contact_phone: business.contact_phone,
      contact_enabled: business.contact_enabled ?? false,
      checks: (business as any).verification_checks ?? [],
    });
  } catch (e: any) {
    logger.error({ err: e }, "GET /via/verify/:viaNumber error");
    return err(res, e.message);
  }
});

// POST /api/via/apply — public application form submission
router.post("/via/apply", async (req, res) => {
  const { name, business_name, trade_type, location, website, email, phone, message } = req.body || {};

  if (!name || !business_name || !trade_type || !email) {
    return err(res, "name, business_name, trade_type, and email are required", 400);
  }

  if (!isSupabaseConfigured()) {
    logger.info({ email }, "via/apply — Supabase not configured, returning mock ok");
    return ok(res, { ok: true, id: `mock-${Date.now()}` }, 201);
  }

  try {
    // Create or find business record
    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .insert({
        business_name,
        trade_type,
        location: location || "",
        website: website || null,
        contact_phone: phone || null,
        contact_enabled: false,
      })
      .select()
      .single();

    if (bizErr) throw bizErr;

    // Create application linked to business
    const { data: appl, error: applErr } = await supabase
      .from("applications")
      .insert({
        business_id: biz.id,
        applicant_name: name,
        applicant_email: email,
        applicant_phone: phone || null,
        message: message || null,
        status: "pending",
      })
      .select()
      .single();

    if (applErr) throw applErr;

    // Log event (best-effort, non-fatal)
    try {
      await supabase.from("events").insert({
        event_type: "application_submit",
        actor: email,
        meta: { business_name, trade_type },
      });
    } catch { /* non-fatal */ }

    return ok(res, { ok: true, id: appl.id }, 201);
  } catch (e: any) {
    logger.error({ err: e }, "POST /via/apply error");
    return err(res, e.message);
  }
});

// GET /api/payment-links — public, returns all active payment links by slug
router.get("/payment-links", async (_req, res) => {
  if (!isSupabaseConfigured()) {
    return ok(res, MOCK_PAYMENT_LINKS);
  }
  try {
    const { data, error } = await supabase
      .from("payment_links")
      .select("id, slug, label, url, is_active")
      .eq("is_active", true)
      .order("sort_order");
    if (error) {
      logger.warn({ err: error.message }, "GET /payment-links DB error — returning mock");
      return ok(res, MOCK_PAYMENT_LINKS);
    }
    return ok(res, data || []);
  } catch (e: any) {
    logger.warn({ err: e }, "GET /payment-links error");
    return ok(res, MOCK_PAYMENT_LINKS);
  }
});

// =============================================================================
// ADMIN ENDPOINTS — Payment Links
// =============================================================================

// GET /api/admin/payment-links
router.get("/admin/payment-links", requireAdmin, async (_req, res) => {
  if (!isSupabaseConfigured()) return ok(res, MOCK_PAYMENT_LINKS);
  const { data, error } = await supabase
    .from("payment_links")
    .select("*")
    .order("sort_order");
  if (error) { logger.warn({ err: error.message }, "GET /admin/payment-links error"); return ok(res, MOCK_PAYMENT_LINKS); }
  return ok(res, data || []);
});

// POST /api/admin/payment-links
router.post("/admin/payment-links", requireAdmin, async (req, res) => {
  const { slug, label, url, is_active, sort_order } = req.body || {};
  if (!slug || !label) return err(res, "slug and label required", 400);
  if (!isSupabaseConfigured()) return ok(res, { id: `pl-${Date.now()}`, slug, label, url: url || null, is_active: is_active ?? true, sort_order: sort_order ?? 0 }, 201);
  const { data, error } = await supabase
    .from("payment_links")
    .insert({ slug, label, url: url || null, is_active: is_active ?? true, sort_order: sort_order ?? 0 })
    .select()
    .single();
  if (error) return err(res, error.message);
  return ok(res, data, 201);
});

// PATCH /api/admin/payment-links/:id  (partial update)
// PUT   /api/admin/payment-links/:id  (full replacement — same implementation)
async function updatePaymentLink(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!isSupabaseConfigured()) { ok(res, { id, ...req.body }); return; }
  const { data, error } = await supabase
    .from("payment_links")
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) { err(res, error.message); return; }
  ok(res, data);
}
router.patch("/admin/payment-links/:id", requireAdmin, updatePaymentLink);
router.put("/admin/payment-links/:id",   requireAdmin, updatePaymentLink);

// DELETE /api/admin/payment-links/:id
router.delete("/admin/payment-links/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { deleted: true });
  const { error } = await supabase.from("payment_links").delete().eq("id", id);
  if (error) return err(res, error.message);
  return ok(res, { deleted: true });
});

// =============================================================================
// ADMIN ENDPOINTS — Applications & Members (stubs — fully built in Task 3)
// =============================================================================

router.get("/admin/via/applications", requireAdmin, async (_req, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);
  const { data, error } = await supabase
    .from("applications")
    .select(`*, businesses(business_name, trade_type, location)`)
    .order("created_at", { ascending: false });
  if (error) { logger.warn({ err: error.message }, "GET /admin/via/applications error"); return ok(res, []); }
  return ok(res, data || []);
});

router.get("/admin/via/members", requireAdmin, async (_req, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);
  const { data, error } = await supabase
    .from("businesses")
    .select(`*, applications!inner(status, updated_at)`)
    .eq("applications.status", "approved")
    .order("created_at", { ascending: false });
  if (error) { logger.warn({ err: error.message }, "GET /admin/via/members error"); return ok(res, []); }
  return ok(res, data || []);
});

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_PAYMENT_LINKS = [
  { id: "pl-1", slug: "via-membership",    label: "VIA Membership (£20/month)",    url: null, is_active: true, sort_order: 0 },
  { id: "pl-2", slug: "priority-checking", label: "Priority Checking (£49 one-off)", url: null, is_active: true, sort_order: 1 },
];

const MOCK_PROFILE = {
  via_number: "VIA1001",
  business_name: "Demo Electrical Services Ltd",
  trade_type: "Electrician",
  location: "Birmingham",
  status: "approved",
  last_checked: new Date().toISOString(),
  contact_phone: null,
  contact_enabled: false,
  checks: [
    { check_type: "local_address",     status: "verified",   checked_at: new Date().toISOString() },
    { check_type: "business_type",     status: "verified",   checked_at: new Date().toISOString() },
    { check_type: "insurance",         status: "verified",   checked_at: new Date().toISOString() },
    { check_type: "accreditations",    status: "verified",   checked_at: new Date().toISOString() },
    { check_type: "digital_footprint", status: "verified",   checked_at: new Date().toISOString() },
    { check_type: "public_records",    status: "verified",   checked_at: new Date().toISOString() },
  ],
};

export default router;
