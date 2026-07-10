/**
 * VIA Secured API Routes
 * - Public: /api/via/verify/:viaNumber, /api/via/apply, /api/payment-links
 * - Admin:  /api/admin/payment-links (GET, POST, PATCH, DELETE)
 *           /api/admin/via/applications, /api/admin/via/members (stubs for Task 3)
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { logger } from "../lib/logger";
import { getPlanEntitlements } from "../lib/plan-entitlements";

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
    if (normalized === "TVC1001") {
      return ok(res, MOCK_PROFILE);
    }
    return res.status(404).json({ error: "Not found" });
  }

  try {
    const { data: business, error: bErr } = await supabase
      .from("businesses")
      .select(`
        id, via_number, business_name, trade_type, location,
        website, contact_phone, contact_enabled, business_intro,
        applications!inner(status, updated_at, plan_code),
        verification_checks(check_type, status, checked_at)
      `)
      .eq("via_number", normalized)
      .eq("applications.status", "approved")
      .single();

    if (bErr || !business) return res.status(404).json({ error: "Not found" });

    // Step 5: contact_enabled = false → neutral inactive response; do not expose details
    if (!(business as any).contact_enabled) {
      return ok(res, { status: "inactive", via_number: business.via_number });
    }

    const app = (business as any).applications?.[0];
    // Legacy (null plan_code) → basic tier. Only tvc_plus → plus tier.
    const planCode: string | null = app?.plan_code ?? null;
    const isPlus = planCode === "tvc_plus";
    const bizId = (business as any).id;

    const base = {
      via_number: business.via_number,
      business_name: business.business_name,
      trade_type: business.trade_type,
      location: business.location,
      website: (business as any).website ?? null,
      status: "approved" as const,
      last_checked: app?.updated_at ?? null,
      contact_phone: business.contact_phone,
      contact_enabled: business.contact_enabled ?? false,
      checks: (business as any).verification_checks ?? [],
      plan_tier: isPlus ? "plus" : "basic",
    };

    if (!isPlus) return ok(res, base);

    // Plus: fetch enhanced profile data in parallel
    const [portfolioRes, socialRes, testimonialRes] = await Promise.all([
      supabase.from("portfolio_images")
        .select("id, public_url, description, display_order")
        .eq("business_id", bizId)
        .not("public_url", "is", null)
        .order("display_order", { ascending: true })
        .limit(30),
      supabase.from("social_links")
        .select("platform, url")
        .eq("business_id", bizId),
      supabase.from("testimonials")
        .select("id, customer_name, testimonial_text, service_received, work_date, submitted_at")
        .eq("business_id", bizId)
        .eq("approval_status", "approved")
        .order("submitted_at", { ascending: false })
        .limit(20),
    ]);

    return ok(res, {
      ...base,
      business_intro: (business as any).business_intro ?? null,
      portfolio: portfolioRes.data ?? [],
      social_links: socialRes.data ?? [],
      testimonials: testimonialRes.data ?? [],
    });
  } catch (e: any) {
    logger.error({ err: e }, "GET /via/verify/:viaNumber error");
    return err(res, e.message);
  }
});

// POST /api/via/apply — public application form submission (creates Supabase auth user)
router.post("/via/apply", async (req, res) => {
  const { name, business_name, trade_type, location, website, email, phone, message, password, plan_code, plan_price_pence } = req.body || {};

  if (!name || !business_name || !trade_type || !email) {
    return err(res, "name, business_name, trade_type, and email are required", 400);
  }
  if (!password || (password as string).length < 8) {
    return err(res, "password must be at least 8 characters", 400);
  }

  if (!isSupabaseConfigured()) {
    logger.info({ email }, "via/apply — Supabase not configured, returning mock ok");
    return ok(res, { ok: true, id: `mock-${Date.now()}`, payment_url: null }, 201);
  }

  try {
    // 1. Create Supabase auth user (auto-confirmed — TVC manually vets members)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: (email as string).trim().toLowerCase(),
      password: password as string,
      email_confirm: true,
    });
    if (authErr) {
      if ((authErr as any).status === 422 || authErr.message?.toLowerCase().includes("already")) {
        return err(res, "An account with this email already exists. Please sign in instead.", 409);
      }
      throw authErr;
    }
    const userId = authData.user.id;

    // 2. Create business record linked to the new auth user
    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .insert({
        business_name,
        trade_type,
        location: location || "",
        website: website || null,
        contact_phone: phone || null,
        contact_enabled: false,
        user_id: userId,
      })
      .select()
      .single();

    if (bizErr) throw bizErr;

    // 3. Create application at "pending_payment" status
    const resolvedPlanCode = ["tvc_basic", "tvc_plus"].includes(plan_code) ? plan_code : null;
    const { data: appl, error: applErr } = await supabase
      .from("applications")
      .insert({
        business_id: biz.id,
        applicant_name: name,
        applicant_email: (email as string).trim().toLowerCase(),
        applicant_phone: phone || null,
        message: message || null,
        status: "pending_payment",
        plan_code: resolvedPlanCode,
        plan_price_pence: plan_price_pence ? Number(plan_price_pence) : null,
      })
      .select()
      .single();

    if (applErr) throw applErr;

    // 4. Fetch the correct payment link for the chosen plan (best-effort)
    let paymentUrl: string | null = null;
    try {
      const paymentSlug = resolvedPlanCode === "tvc_basic" ? "tvc-basic"
        : resolvedPlanCode === "tvc_plus" ? "tvc-plus"
        : "via-membership";
      const { data: pl } = await supabase
        .from("payment_links")
        .select("url")
        .eq("slug", paymentSlug)
        .eq("is_active", true)
        .maybeSingle();
      paymentUrl = pl?.url ?? null;
    } catch { /* non-fatal */ }

    // 5. Log event (best-effort)
    try {
      await supabase.from("events").insert({
        event_type: "application_submit",
        actor: email,
        meta: { business_name, trade_type, plan_code: resolvedPlanCode },
      });
    } catch { /* non-fatal */ }

    return ok(res, { ok: true, id: appl.id, payment_url: paymentUrl }, 201);
  } catch (e: any) {
    logger.error({ err: e }, "POST /via/apply error");
    return err(res, e.message);
  }
});

// POST /api/via/sticker-orders — save a sticker order linked to an application
router.post("/via/sticker-orders", async (req, res) => {
  const { application_id, sticker_size, van_count, price_per_van_pence, expected_total_pence } = req.body || {};
  if (!application_id || !sticker_size || !van_count) {
    return err(res, "application_id, sticker_size, and van_count are required", 400);
  }
  if (!["small", "medium"].includes(sticker_size)) {
    return err(res, "sticker_size must be small or medium", 400);
  }
  const count = Number(van_count);
  if (!Number.isInteger(count) || count < 1) {
    return err(res, "van_count must be a whole number ≥ 1", 400);
  }

  if (!isSupabaseConfigured()) {
    return ok(res, {
      id: `mock-sticker-${Date.now()}`,
      application_id, sticker_size, van_count: count,
      payment_status: "pending", fulfilment_status: "awaiting_payment",
    }, 201);
  }

  try {
    const { data: appl } = await supabase.from("applications").select("business_id").eq("id", application_id).single();
    if (!appl) return err(res, "Application not found", 404);
    const { data, error } = await supabase
      .from("sticker_orders")
      .insert({
        application_id,
        business_id: appl.business_id,
        sticker_size,
        van_count: count,
        price_per_van_pence: price_per_van_pence ? Number(price_per_van_pence) : null,
        expected_total_pence: expected_total_pence ? Number(expected_total_pence) : null,
        payment_status: "pending",
        fulfilment_status: "awaiting_payment",
      })
      .select()
      .single();
    if (error) return err(res, error.message);
    return ok(res, data, 201);
  } catch (e: any) {
    logger.error({ err: e }, "POST /via/sticker-orders error");
    return err(res, e.message);
  }
});

// =============================================================================
// POST /api/via/applications/:applicationId/documents — public doc upload
// Used during the join flow before the member has an account.
// applicationId acts as a semi-secret token (UUID, unguessable).
// Body: { file_data: base64, mime_type, file_name, document_type }
// =============================================================================
const JOIN_DOC_BUCKET = "member-documents";
const JOIN_VALID_TYPES = ["general", "insurance", "accreditation", "proof_of_address", "other"];

router.post("/via/applications/:applicationId/documents", async (req, res) => {
  const { applicationId } = req.params;
  const { file_data, mime_type, file_name, document_type = "general" } = req.body || {};

  if (!file_data || !mime_type || !file_name) {
    return err(res, "file_data (base64), mime_type, and file_name are required", 400);
  }

  const resolvedType = JOIN_VALID_TYPES.includes(document_type) ? document_type : "general";

  if (!isSupabaseConfigured()) {
    return ok(res, {
      id: `mock-join-doc-${Date.now()}`,
      document_type: resolvedType,
      file_name,
      status: "pending_review",
      uploaded_at: new Date().toISOString(),
    }, 201);
  }

  try {
    // Verify the application exists and get business_id
    const { data: appl, error: applErr } = await supabase
      .from("applications")
      .select("id, business_id")
      .eq("id", applicationId)
      .single();

    if (applErr || !appl) return err(res, "Application not found", 404);

    const ext = file_name.split(".").pop()?.toLowerCase() || "pdf";
    const storagePath = `applications/${applicationId}/${resolvedType}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(file_data as string, "base64");

    const { error: uploadErr } = await supabase.storage
      .from(JOIN_DOC_BUCKET)
      .upload(storagePath, buffer, { contentType: mime_type, upsert: false });

    if (uploadErr) throw uploadErr;

    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .insert({
        business_id: appl.business_id,
        application_id: applicationId,
        document_type: resolvedType,
        file_name,
        file_url: storagePath,
        file_size_bytes: buffer.byteLength,
        mime_type,
        status: "pending_review",
      })
      .select("id, document_type, file_name, file_size_bytes, status, uploaded_at")
      .single();

    if (docErr) throw docErr;
    return ok(res, doc, 201);
  } catch (e: any) {
    logger.error({ err: e }, "POST /via/applications/:id/documents error");
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
  { id: "pl-1", slug: "via-membership",    label: "VIA Membership (legacy — £20/month)",  url: null, is_active: true, sort_order: 0 },
  { id: "pl-2", slug: "tvc-basic",         label: "TVC Basic (£15/month)",                url: null, is_active: true, sort_order: 1 },
  { id: "pl-3", slug: "tvc-plus",          label: "TVC Plus (£30/month)",                 url: null, is_active: true, sort_order: 2 },
  { id: "pl-4", slug: "sticker-small",     label: "TVC Van Sticker — Small (£30/van)",   url: null, is_active: true, sort_order: 3 },
  { id: "pl-5", slug: "sticker-medium",    label: "TVC Van Sticker — Medium (£50/van)",  url: null, is_active: true, sort_order: 4 },
  { id: "pl-6", slug: "priority-checking", label: "Priority Checking (legacy — £49)",     url: null, is_active: true, sort_order: 5 },
];

const MOCK_PROFILE = {
  via_number: "TVC1001",
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
