/**
 * VIA Secured — Admin API Routes (VIA-specific)
 * Auth: same admin token pattern as admin.ts
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();
const DOC_BUCKET = "member-documents";

// ── Auth ──────────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD || "admin";
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

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_APPS = [
  {
    id: "mock-app-1", status: "pending", priority: false,
    applicant_name: "James Smith", applicant_email: "james@smithelectrical.co.uk", applicant_phone: "07700 900001",
    message: "Looking to get verified ASAP.",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    businesses: { id: "mock-biz-1", business_name: "Smith Electrical Ltd", trade_type: "Electrician", location: "Birmingham", website: "https://smithelectrical.co.uk", contact_phone: "07700 900001", via_number: null, user_id: null },
  },
  {
    id: "mock-app-2", status: "in_review", priority: true,
    applicant_name: "Sarah Jones", applicant_email: "sarah@jonesplumbing.co.uk", applicant_phone: "07700 900002",
    message: null,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    businesses: { id: "mock-biz-2", business_name: "Jones Plumbing", trade_type: "Plumber", location: "Manchester", website: null, contact_phone: "07700 900002", via_number: null, user_id: null },
  },
  {
    id: "mock-app-3", status: "approved", priority: false,
    applicant_name: "Dave Williams", applicant_email: "dave@williams-roofing.co.uk", applicant_phone: "07700 900003",
    message: null,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    businesses: { id: "mock-biz-3", business_name: "Williams Roofing", trade_type: "Roofer", location: "Leeds", website: "https://williamsroofing.co.uk", contact_phone: "07700 900003", via_number: "VIA1001", user_id: null },
  },
];

const MOCK_CHECKS = [
  { check_type: "local_address",     status: "verified",   checked_at: new Date().toISOString() },
  { check_type: "business_type",     status: "verified",   checked_at: new Date().toISOString() },
  { check_type: "insurance",         status: "pending",    checked_at: null },
  { check_type: "accreditations",    status: "pending",    checked_at: null },
  { check_type: "digital_footprint", status: "unverified", checked_at: new Date().toISOString() },
  { check_type: "public_records",    status: "pending",    checked_at: null },
];

const MOCK_NOTES = [
  { id: "note-1", application_id: "mock-app-2", body: "Insurance certificate uploaded — checking validity.", created_at: new Date(Date.now() - 3600000).toISOString() },
];

// =============================================================================
// VIA OVERVIEW STATS
// =============================================================================

router.get("/admin/via-overview", requireAdmin, async (_req, res) => {
  if (!isSupabaseConfigured()) {
    return ok(res, {
      applications: { total: 3, pending: 1, in_review: 1, approved: 1, rejected: 0, expired: 0 },
      members_approved: 1,
      leads_by_stage: { new: 2, contacted: 1, replied: 0, interested: 1, converted: 0, dead: 0 },
    });
  }
  try {
    const [{ data: apps }, { data: leads }] = await Promise.all([
      supabase.from("applications").select("status"),
      supabase.from("leads").select("stage, status"),  // select both for backward compat
    ]);
    const byStatus: Record<string, number> = {};
    for (const a of apps || []) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    const byStage: Record<string, number> = {};
    // Use `stage` (VIA schema) with `status` as fallback for pre-migration rows
    for (const l of leads || []) {
      const s: string = l.stage || l.status || "new";
      byStage[s] = (byStage[s] ?? 0) + 1;
    }
    return ok(res, {
      applications: {
        total: apps?.length ?? 0,
        pending:   byStatus["pending"]   ?? 0,
        in_review: byStatus["in_review"] ?? 0,
        approved:  byStatus["approved"]  ?? 0,
        rejected:  byStatus["rejected"]  ?? 0,
        expired:   byStatus["expired"]   ?? 0,
      },
      members_approved: byStatus["approved"] ?? 0,
      leads_by_stage: {
        new:       byStage["new"]       ?? 0,
        contacted: byStage["contacted"] ?? 0,
        replied:   byStage["replied"]   ?? 0,
        interested:byStage["interested"]?? 0,
        converted: byStage["converted"] ?? 0,
        dead:      byStage["dead"]      ?? 0,
      },
    });
  } catch (e: any) {
    logger.error({ err: e }, "GET /admin/via-overview error");
    return err(res, e.message);
  }
});

// =============================================================================
// ADMIN NOTIFICATIONS
// =============================================================================

// GET /api/admin/via-notifications — synthesized from DB tables
router.get("/admin/via-notifications", requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 40, 100);
  if (!isSupabaseConfigured()) {
    const now = new Date();
    return ok(res, [
      { id: "n-1", type: "new_application", title: "New application submitted", body: "Smith Electrical Ltd (Electrician, Birmingham)", link: "/admin/applications/mock-app-1", is_read: false, created_at: new Date(now.getTime() - 2 * 86400000).toISOString() },
      { id: "n-2", type: "new_application", title: "Priority application submitted", body: "Jones Plumbing (Plumber, Manchester) — priority", link: "/admin/applications/mock-app-2", is_read: false, created_at: new Date(now.getTime() - 5 * 86400000).toISOString() },
      { id: "n-3", type: "status_change",   title: "Application approved", body: "Williams Roofing → TVC1001 assigned", link: "/admin/applications/mock-app-3", is_read: true,  created_at: new Date(now.getTime() - 10 * 86400000).toISOString() },
    ]);
  }

  try {
    // Pull from notifications table (admin type) + synthesise from recent applications
    const { data: notifs } = await supabase
      .from("notifications")
      .select("id, title, body, is_read, link, created_at")
      .eq("recipient_type", "admin")
      .order("created_at", { ascending: false })
      .limit(limit);

    // Also pull recent applications as synthetic notifications
    const { data: recentApps } = await supabase
      .from("applications")
      .select("id, status, priority, applicant_name, created_at, businesses(business_name, trade_type)")
      .order("created_at", { ascending: false })
      .limit(20);

    const appEvents = (recentApps || []).map((a: any) => ({
      id: `app-${a.id}`,
      type: "new_application",
      title: a.priority ? "Priority application submitted" : "New application submitted",
      body: `${a.businesses?.business_name ?? a.applicant_name} (${a.businesses?.trade_type ?? "—"})`,
      link: `/admin/applications/${a.id}`,
      is_read: false,
      created_at: a.created_at,
    }));

    const all = [...(notifs || []).map((n: any) => ({ ...n, type: "system" })), ...appEvents]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    return ok(res, all);
  } catch (e: any) {
    logger.error({ err: e }, "GET /admin/via-notifications error");
    return err(res, e.message);
  }
});

// PATCH /api/admin/via-notifications/:id/read — mark notification as read
router.patch("/admin/via-notifications/:id/read", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { ok: true });
  try {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    return ok(res, { ok: true });
  } catch (e: any) {
    return err(res, e.message);
  }
});

// POST /api/admin/via-notifications/mark-all-read — mark all admin notifications read
router.post("/admin/via-notifications/mark-all-read", requireAdmin, async (_req, res) => {
  if (!isSupabaseConfigured()) return ok(res, { ok: true });
  try {
    await supabase.from("notifications").update({ is_read: true }).eq("recipient_type", "admin").eq("is_read", false);
    return ok(res, { ok: true });
  } catch (e: any) {
    return err(res, e.message);
  }
});

// =============================================================================
// VIA NUMBER — NEXT SEQUENTIAL
// =============================================================================

// GET /api/admin/next-via-number — returns next sequential VIA number (uses DB function if available)
router.get("/admin/next-via-number", requireAdmin, async (_req, res) => {
  if (!isSupabaseConfigured()) {
    return ok(res, { via_number: "TVC1001" });
  }
  try {
    // Try the DB function first (uses advisory lock for race-safety)
    const { data, error } = await supabase.rpc("next_via_number");
    if (!error && data) return ok(res, { via_number: data as string });

    // Fallback: query manually
    const { data: businesses } = await supabase
      .from("businesses")
      .select("via_number")
      .not("via_number", "is", null);
    const nums = (businesses || [])
      .map((b: any) => {
        const m = b.via_number?.match(/^VIA(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n: number) => n > 0);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1001;
    return ok(res, { via_number: `VIA${next}` });
  } catch (e: any) {
    logger.error({ err: e }, "GET /admin/next-via-number error");
    return err(res, e.message);
  }
});

// =============================================================================
// APPLICATIONS
// =============================================================================

// GET /api/admin/applications — list, optional ?status= filter
router.get("/admin/applications", requireAdmin, async (req, res) => {
  const { status } = req.query as Record<string, string>;
  if (!isSupabaseConfigured()) {
    const filtered = status && status !== "all"
      ? MOCK_APPS.filter((a) => a.status === status)
      : MOCK_APPS;
    return ok(res, filtered);
  }
  try {
    let q = supabase
      .from("applications")
      .select("id, status, priority, plan_code, applicant_name, applicant_email, created_at, updated_at, businesses(id, business_name, trade_type, location, via_number)")
      .order("created_at", { ascending: false });
    if (status && status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    return ok(res, data || []);
  } catch (e: any) {
    logger.error({ err: e }, "GET /admin/applications error");
    return err(res, e.message);
  }
});

// GET /api/admin/applications/:id — full detail
router.get("/admin/applications/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) {
    const app = MOCK_APPS.find((a) => a.id === id) ?? MOCK_APPS[0];
    return ok(res, {
      ...app,
      documents: [],
      verification_checks: MOCK_CHECKS,
      admin_notes: id === "mock-app-2" ? MOCK_NOTES : [],
    });
  }
  try {
    const { data: appl, error: applErr } = await supabase
      .from("applications")
      .select(`
        id, status, priority, plan_code, applicant_name, applicant_email, applicant_phone, message, created_at, updated_at,
        businesses(id, business_name, trade_type, location, website, contact_phone, description, via_number, user_id)
      `)
      .eq("id", id)
      .single();
    if (applErr || !appl) return err(res, "Application not found", 404);

    const biz = (appl as any).businesses;
    const [{ data: docs }, { data: checks }, { data: notes }] = await Promise.all([
      biz?.id ? supabase.from("documents").select("id, document_type, file_name, file_url, file_size_bytes, mime_type, uploaded_at, status, admin_notes, expiry_date").eq("business_id", biz.id).order("uploaded_at", { ascending: false }) : Promise.resolve({ data: [] }),
      biz?.id ? supabase.from("verification_checks").select("id, check_type, status, checked_at").eq("business_id", biz.id) : Promise.resolve({ data: [] }),
      supabase.from("admin_notes").select("id, body, created_at").eq("application_id", id).order("created_at"),
    ]);

    return ok(res, {
      ...appl,
      documents: docs || [],
      verification_checks: checks || [],
      admin_notes: notes || [],
    });
  } catch (e: any) {
    logger.error({ err: e }, "GET /admin/applications/:id error");
    return err(res, e.message);
  }
});

// PATCH /api/admin/applications/:id — update status; assign VIA number
// ORDER IS INTENTIONAL: validate VIA uniqueness first (no side effects),
// then assign VIA to business, then update application status — so a 409
// is returned without any partial writes.
router.patch("/admin/applications/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, via_number, via_number_for_business_id, plan_code, plan_change_note } = req.body || {};

  if (!isSupabaseConfigured()) {
    return ok(res, { id, status, via_number, plan_code });
  }

  try {
    // ── STEP 1: VIA uniqueness check — NO DB writes yet ───────────────────────
    if (via_number && via_number_for_business_id) {
      const normalized = via_number.trim().toUpperCase();
      if (!/^TVC\d+$/i.test(normalized)) {
        return err(res, "TVC number must be in the format TVC1001", 400);
      }
      const { data: conflict } = await supabase
        .from("businesses")
        .select("id")
        .eq("via_number", normalized)
        .maybeSingle();
      if (conflict && conflict.id !== via_number_for_business_id) {
        return err(res, `VIA number ${normalized} is already assigned to another business`, 409);
      }

      // ── STEP 2: Assign VIA to business (uniqueness confirmed) ──────────────
      const { error: bizErr } = await supabase
        .from("businesses")
        .update({ via_number: normalized, updated_at: new Date().toISOString() })
        .eq("id", via_number_for_business_id);
      if (bizErr) throw bizErr;

      // ── STEP 3: Member notification (best-effort, non-fatal) ───────────────
      try {
        await supabase.from("notifications").insert({
          business_id: via_number_for_business_id,
          recipient_type: "member",
          title: "Your TVC application has been approved!",
          body: `Congratulations — your TVC number is ${normalized}. You can now download your badge from the member dashboard.`,
        });
      } catch { /* non-fatal */ }
    }

    // ── STEP 4: Update application status ─────────────────────────────────────
    if (status) {
      const { error: applErr } = await supabase
        .from("applications")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (applErr) throw applErr;
    }

    // ── STEP 5: Plan code change ───────────────────────────────────────────────
    if ("plan_code" in (req.body || {})) {
      const newPlan = plan_code || null;

      // Fetch current plan for audit log
      const { data: currentAppl } = await supabase
        .from("applications")
        .select("plan_code, business_id")
        .eq("id", id)
        .maybeSingle();

      // Validate before writing
      const validPlans = ["tvc_basic", "tvc_plus", null];
      if (!validPlans.includes(newPlan)) {
        return err(res, "plan_code must be tvc_basic, tvc_plus, or null", 400);
      }

      const { error: planErr } = await supabase
        .from("applications")
        .update({ plan_code: newPlan, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (planErr) throw planErr;
      // Audit log to admin_notes
      const oldPlan = currentAppl?.plan_code ?? null;
      const auditTs = new Date().toISOString();
      const adminIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.headers['x-real-ip'] as string
        || req.ip
        || 'unknown';
      const noteBody = plan_change_note?.trim()
        ? `[${auditTs}] Plan changed by admin (IP: ${adminIp}): ${oldPlan ?? "unassigned"} → ${newPlan ?? "unassigned"}. Notes: ${plan_change_note.trim()}`
        : `[${auditTs}] Plan changed by admin (IP: ${adminIp}): ${oldPlan ?? "unassigned"} → ${newPlan ?? "unassigned"}.`;
      await supabase.from("admin_notes").insert({
        application_id: id,
        body: noteBody,
      }).throwOnError();
    }

    return ok(res, { ok: true });
  } catch (e: any) {
    logger.error({ err: e }, "PATCH /admin/applications/:id error");
    return err(res, e.message);
  }
});

// =============================================================================
// POST /api/admin/applications/:id/mark-paid — confirm payment, move to Pending Review
// =============================================================================
router.post("/admin/applications/:id/mark-paid", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { payment_notes } = req.body || {};

  if (!isSupabaseConfigured()) {
    return ok(res, { ok: true, id, status: "pending" });
  }

  try {
    const { error } = await supabase
      .from("applications")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    // Record payment note as an admin note (best-effort)
    if ((payment_notes as string | undefined)?.trim()) {
      try {
        await supabase.from("admin_notes").insert({
          application_id: id,
          body: `Payment confirmed. Notes: ${(payment_notes as string).trim()}`,
        });
      } catch { /* non-fatal */ }
    }

    // Notify member (best-effort)
    try {
      const { data: appl } = await supabase
        .from("applications")
        .select("businesses(user_id)")
        .eq("id", id)
        .single();
      const bizAny = appl?.businesses as any;
      const userId = bizAny?.user_id;
      if (userId) {
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "payment_confirmed",
          title: "Payment confirmed",
          body: "Your payment has been confirmed. We will begin your TVC verification shortly.",
          recipient_type: "member",
        });
      }
    } catch { /* non-fatal */ }

    return ok(res, { ok: true, id, status: "pending" });
  } catch (e: any) {
    logger.error({ err: e }, "POST /admin/applications/:id/mark-paid error");
    return err(res, e.message);
  }
});

// =============================================================================
// ADMIN NOTES
// =============================================================================

router.get("/admin/admin-notes", requireAdmin, async (req, res) => {
  const { application_id } = req.query as Record<string, string>;
  if (!application_id) return err(res, "application_id required", 400);
  if (!isSupabaseConfigured()) {
    return ok(res, MOCK_NOTES.filter((n) => n.application_id === application_id));
  }
  try {
    const { data, error } = await supabase
      .from("admin_notes")
      .select("id, body, created_at")
      .eq("application_id", application_id)
      .order("created_at");
    if (error) throw error;
    return ok(res, data || []);
  } catch (e: any) {
    return err(res, e.message);
  }
});

router.post("/admin/admin-notes", requireAdmin, async (req, res) => {
  const { application_id, body } = req.body || {};
  if (!application_id || !body?.trim()) return err(res, "application_id and body required", 400);
  if (!isSupabaseConfigured()) {
    return ok(res, { id: `note-${Date.now()}`, application_id, body, created_at: new Date().toISOString() }, 201);
  }
  try {
    const { data, error } = await supabase
      .from("admin_notes")
      .insert({ application_id, body: body.trim() })
      .select()
      .single();
    if (error) throw error;
    return ok(res, data, 201);
  } catch (e: any) {
    return err(res, e.message);
  }
});

// =============================================================================
// VERIFICATION CHECKS
// =============================================================================

// POST /api/admin/verification-checks/upsert — set/update a single check
router.post("/admin/verification-checks/upsert", requireAdmin, async (req, res) => {
  const { application_id, business_id, check_type, status } = req.body || {};
  if (!application_id || !business_id || !check_type || !status) {
    return err(res, "application_id, business_id, check_type, status required", 400);
  }

  const validStatuses = ["verified", "unverified", "pending"];
  if (!validStatuses.includes(status)) return err(res, `status must be one of: ${validStatuses.join(", ")}`, 400);

  if (!isSupabaseConfigured()) {
    return ok(res, { application_id, business_id, check_type, status, checked_at: status !== "pending" ? new Date().toISOString() : null });
  }

  try {
    const checked_at = status !== "pending" ? new Date().toISOString() : null;
    const { data, error } = await supabase
      .from("verification_checks")
      .upsert(
        { application_id, business_id, check_type, status, checked_at, updated_at: new Date().toISOString() },
        { onConflict: "application_id,check_type" }
      )
      .select()
      .single();
    if (error) throw error;
    return ok(res, data);
  } catch (e: any) {
    logger.error({ err: e }, "POST /admin/verification-checks/upsert error");
    return err(res, e.message);
  }
});

// =============================================================================
// DOCUMENTS (admin access — signed URLs)
// =============================================================================

router.get("/admin/documents/:id/url", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { url: "https://placehold.co/400?text=Doc" });
  try {
    const { data: doc } = await supabase.from("documents").select("file_url, file_name").eq("id", id).single();
    if (!doc) return err(res, "Document not found", 404);
    const { data: signed } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(doc.file_url, 3600);
    return ok(res, { url: signed?.signedUrl ?? null, file_name: doc.file_name });
  } catch (e: any) {
    return err(res, e.message);
  }
});

// =============================================================================
// MEMBERS
// =============================================================================

// GET /api/admin/members — enhanced with search + status filter
router.get("/admin/members", requireAdmin, async (req, res) => {
  const { search, status } = req.query as Record<string, string>;
  if (!isSupabaseConfigured()) {
    return ok(res, [
      {
        id: "mock-biz-3", business_name: "Williams Roofing", trade_type: "Roofer",
        location: "Leeds", via_number: "TVC1001", user_id: null,
        applications: [{ status: "approved", updated_at: new Date(Date.now() - 10 * 86400000).toISOString() }],
      },
    ]);
  }
  try {
    let q = supabase
      .from("businesses")
      .select("id, business_name, trade_type, location, via_number, user_id, applications(id, status, updated_at)")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      q = q.eq("applications.status", status);
    }

    const { data, error } = await q;
    if (error) throw error;

    let results = (data || []).filter((b: any) => b.applications?.length > 0);

    if (search) {
      const s = search.toLowerCase();
      results = results.filter((b: any) =>
        b.business_name?.toLowerCase().includes(s) ||
        b.via_number?.toLowerCase().includes(s) ||
        b.location?.toLowerCase().includes(s)
      );
    }

    return ok(res, results);
  } catch (e: any) {
    logger.error({ err: e }, "GET /admin/members error");
    return err(res, e.message);
  }
});

// GET /api/admin/members/:id — read-only member profile with documents
router.get("/admin/members/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) {
    return ok(res, {
      id: "mock-biz-3",
      business_name: "Williams Roofing",
      trade_type: "Roofer",
      location: "Leeds",
      website: "https://williamsroofing.co.uk",
      contact_phone: "07700 900003",
      contact_email: "info@williamsroofing.co.uk",
      description: "Professional roofing services across West Yorkshire.",
      via_number: "TVC1001",
      user_id: null,
      application: { id: "mock-app-3", status: "approved", created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
      documents: [
        { id: "doc-1", document_type: "insurance_certificate", file_name: "insurance-2024.pdf", created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
        { id: "doc-2", document_type: "trade_accreditation",   file_name: "gas-safe-cert.pdf",  created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
      ],
      verification_checks: [
        { check_type: "local_address", passed: true },
        { check_type: "business_type", passed: true },
        { check_type: "insurance",     passed: true },
        { check_type: "accreditation", passed: true },
        { check_type: "digital_footprint", passed: false },
        { check_type: "contact_records",   passed: true },
      ],
    });
  }
  try {
    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("id, business_name, trade_type, location, website, contact_phone, description, via_number, user_id, created_at")
      .eq("id", id)
      .single();
    if (bizErr || !biz) return err(res, bizErr?.message ?? "Not found", 404);

    const [{ data: apps }, { data: docs }, { data: checks }] = await Promise.all([
      supabase.from("applications").select("id, status, plan_code, applicant_email, created_at").eq("business_id", id).order("created_at", { ascending: false }).limit(1),
      supabase.from("documents").select("id, document_type, file_name, created_at").eq("business_id", id).order("created_at", { ascending: false }),
      supabase.from("verification_checks").select("check_type, passed").eq("business_id", id),
    ]);

    return ok(res, {
      ...biz,
      application: apps?.[0] ?? null,
      documents: docs ?? [],
      verification_checks: checks ?? [],
    });
  } catch (e: any) {
    logger.error({ err: e }, "GET /admin/members/:id error");
    return err(res, e.message);
  }
});

// PATCH /api/admin/businesses/:id — link user by email (for manual linking)
router.patch("/admin/businesses/:id/link-user", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { email } = req.body || {};
  if (!email) return err(res, "email required", 400);
  if (!isSupabaseConfigured()) return ok(res, { ok: true, linked: false, message: "Supabase not configured" });
  try {
    // Look up user by email in Supabase Auth (admin API)
    const { data: listData, error: usersErr } = await supabase.auth.admin.listUsers();
    if (usersErr) throw usersErr;
    const users: any[] = (listData as any)?.users ?? [];
    const user = users.find((u: any) => u.email === email);
    if (!user) return err(res, `No Supabase Auth user found with email: ${email}`, 404);
    // Fetch current user_id before updating so we can detect a first-time link
    const { data: existing, error: fetchErr } = await supabase
      .from("businesses")
      .select("user_id")
      .eq("id", id)
      .single();
    if (fetchErr) throw fetchErr;
    const isFirstLink = !existing?.user_id;

    const { error } = await supabase.from("businesses").update({ user_id: user.id }).eq("id", id);
    if (error) throw error;

    // Only send the welcome notification on the first-time link (no user_id → user_id)
    if (isFirstLink) {
      try {
        await supabase.from("notifications").insert({
          business_id: id,
          recipient_type: "member",
          title: "Your account is ready",
          body: "Your account is ready — log in to view your dashboard.",
        });
      } catch (notifErr: any) {
        logger.warn({ err: notifErr }, "Failed to insert welcome notification after link-user");
      }
    }

    return ok(res, { ok: true, linked: true, user_id: user.id });
  } catch (e: any) {
    logger.error({ err: e }, "PATCH /admin/businesses/:id/link-user error");
    return err(res, e.message);
  }
});

// =============================================================================
// PATCH /api/admin/documents/:id — approve / reject / expire a document
// Body: { status, admin_notes?, expiry_date?, reviewed_by? }
// =============================================================================
router.patch("/admin/documents/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, admin_notes, expiry_date, reviewed_by } = req.body || {};

  const validStatuses = ["pending_review", "approved", "rejected", "expired"];
  if (status && !validStatuses.includes(status)) {
    return err(res, `status must be one of: ${validStatuses.join(", ")}`, 400);
  }

  if (!isSupabaseConfigured()) return ok(res, { ok: true });

  try {
    const updates: Record<string, any> = {};
    if (status !== undefined) {
      updates.status = status;
      updates.reviewed_at = new Date().toISOString();
      updates.reviewed_by = reviewed_by || "admin";
    }
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;
    if (expiry_date !== undefined) updates.expiry_date = expiry_date || null;

    const { data, error } = await supabase
      .from("documents")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return ok(res, data);
  } catch (e: any) {
    logger.error({ err: e }, "PATCH /admin/documents/:id error");
    return err(res, e.message);
  }
});

// =============================================================================
// POST /api/admin/applications/:id/request-documents
// Body: { message? } — sends a notification to the member requesting more docs
// =============================================================================
router.post("/admin/applications/:id/request-documents", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { message } = req.body || {};

  if (!isSupabaseConfigured()) return ok(res, { ok: true });

  try {
    // Look up the application to find the business_id
    const { data: appl, error: applErr } = await supabase
      .from("applications")
      .select("id, business_id, applicant_name")
      .eq("id", id)
      .single();

    if (applErr || !appl) return err(res, "Application not found", 404);

    // Look up business to find the user_id (for the notification target)
    const { data: biz } = await supabase
      .from("businesses")
      .select("id, user_id")
      .eq("id", appl.business_id)
      .single();

    const notifMessage = message?.trim() ||
      "The TVC team requires additional supporting documents to progress your verification. Please log in to your dashboard and upload the requested files.";

    await supabase.from("notifications").insert({
      recipient_type: "member",
      business_id: appl.business_id,
      title: "Additional documents required",
      body: notifMessage,
      read: false,
    });

    return ok(res, { ok: true });
  } catch (e: any) {
    logger.error({ err: e }, "POST /admin/applications/:id/request-documents error");
    return err(res, e.message);
  }
});

export default router;
