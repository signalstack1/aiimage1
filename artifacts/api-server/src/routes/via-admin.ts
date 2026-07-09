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
      supabase.from("leads").select("status"),
    ]);
    const byStatus: Record<string, number> = {};
    for (const a of apps || []) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    const byStage: Record<string, number> = {};
    for (const l of leads || []) byStage[l.status] = (byStage[l.status] ?? 0) + 1;
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
      .select("id, status, priority, applicant_name, applicant_email, created_at, updated_at, businesses(id, business_name, trade_type, location, via_number)")
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
        id, status, priority, applicant_name, applicant_email, applicant_phone, message, created_at, updated_at,
        businesses(id, business_name, trade_type, location, website, contact_phone, description, via_number, user_id)
      `)
      .eq("id", id)
      .single();
    if (applErr || !appl) return err(res, "Application not found", 404);

    const biz = (appl as any).businesses;
    const [{ data: docs }, { data: checks }, { data: notes }] = await Promise.all([
      biz?.id ? supabase.from("documents").select("id, document_type, file_name, file_url, file_size_bytes, mime_type, uploaded_at").eq("business_id", biz.id).order("uploaded_at", { ascending: false }) : Promise.resolve({ data: [] }),
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
router.patch("/admin/applications/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, via_number, via_number_for_business_id } = req.body || {};

  if (!isSupabaseConfigured()) {
    return ok(res, { id, status, via_number });
  }

  try {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;

    const { error: applErr } = await supabase.from("applications").update(updates).eq("id", id);
    if (applErr) throw applErr;

    if (via_number && via_number_for_business_id) {
      // Validate uniqueness
      const { data: existing } = await supabase
        .from("businesses")
        .select("id")
        .eq("via_number", via_number.trim().toUpperCase())
        .maybeSingle();
      if (existing && existing.id !== via_number_for_business_id) {
        return err(res, `VIA number ${via_number} is already assigned to another business`, 409);
      }

      const normalized = via_number.trim().toUpperCase();
      await supabase
        .from("businesses")
        .update({ via_number: normalized })
        .eq("id", via_number_for_business_id);

      // Create notification for member (best-effort)
      try {
        await supabase.from("notifications").insert({
          business_id: via_number_for_business_id,
          recipient_type: "member",
          title: "Your VIA application has been approved!",
          body: `Congratulations — your VIA number is ${normalized}. You can now download your badge from the member dashboard.`,
        });
      } catch { /* non-fatal */ }
    }

    return ok(res, { ok: true });
  } catch (e: any) {
    logger.error({ err: e }, "PATCH /admin/applications/:id error");
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
        location: "Leeds", via_number: "VIA1001", user_id: null,
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

// PATCH /api/admin/businesses/:id — link user by email (for manual linking)
router.patch("/admin/businesses/:id/link-user", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { email } = req.body || {};
  if (!email) return err(res, "email required", 400);
  if (!isSupabaseConfigured()) return ok(res, { ok: true, linked: false, message: "Supabase not configured" });
  try {
    // Look up user by email in Supabase Auth (admin API)
    const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers();
    if (usersErr) throw usersErr;
    const user = users.find((u) => u.email === email);
    if (!user) return err(res, `No Supabase Auth user found with email: ${email}`, 404);
    const { error } = await supabase.from("businesses").update({ user_id: user.id }).eq("id", id);
    if (error) throw error;
    return ok(res, { ok: true, linked: true, user_id: user.id });
  } catch (e: any) {
    logger.error({ err: e }, "PATCH /admin/businesses/:id/link-user error");
    return err(res, e.message);
  }
});

export default router;
