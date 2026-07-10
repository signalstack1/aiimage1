/**
 * VIA Secured — Member API Routes
 * All routes require a valid Supabase JWT (Bearer token from frontend auth).
 *
 * Auth pattern: extract JWT → supabase.auth.getUser(token) → user.id
 * Then query data where user_id = user.id (or via business_id).
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { logger } from "../lib/logger";
import { getPlanEntitlements } from "../lib/plan-entitlements";

const router = Router();

const DOC_BUCKET = "member-documents";
const PORTFOLIO_BUCKET = "portfolio-images";

// ── Auth middleware ────────────────────────────────────────────────────────────

interface AuthedRequest extends Request {
  userId?: string;
}

async function requireMember(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Authentication required" }); return; }

  if (!isSupabaseConfigured()) {
    // Dev mode — accept any non-empty token, use a mock user ID
    req.userId = "mock-user-id";
    next();
    return;
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) { res.status(401).json({ error: "Invalid or expired session" }); return; }
    req.userId = data.user.id;
    next();
  } catch (e: any) {
    res.status(401).json({ error: "Authentication failed" });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ok(res: Response, data: any, status = 200) { return res.status(status).json(data); }
function err(res: Response, msg: string, status = 500) { return res.status(status).json({ error: msg }); }

async function ensureDocBucket() {
  const { error } = await supabase.storage.createBucket(DOC_BUCKET, {
    public: false,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/jpg"],
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB
  });
  if (error && !error.message.toLowerCase().includes("already exist") && !error.message.toLowerCase().includes("duplicate")) {
    logger.warn({ err: error.message }, "ensureDocBucket warning");
  }
}

async function ensurePortfolioBucket() {
  const { error } = await supabase.storage.createBucket(PORTFOLIO_BUCKET, {
    public: true,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/jpg"],
    fileSizeLimit: 10 * 1024 * 1024,
  });
  if (error && !error.message.toLowerCase().includes("already exist") && !error.message.toLowerCase().includes("duplicate")) {
    logger.warn({ err: error.message }, "ensurePortfolioBucket warning");
  }
}

// ── Mock data (used when Supabase is not configured) ─────────────────────────

const MOCK_ME = {
  business: {
    id: "mock-biz-id",
    via_number: null as string | null,
    business_name: "Demo Trades Ltd",
    trade_type: "Electrician",
    location: "Birmingham",
    website: null,
    contact_phone: null,
    contact_enabled: false,
    description: null,
    business_intro: null,
    logo_url: null,
    referral_code: "REF12345",
  },
  application: {
    id: "mock-app-id",
    status: "pending" as const,
    priority: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

// =============================================================================
// GET /api/member/me — current member's business + application
// =============================================================================
router.get("/member/me", requireMember, async (req: AuthedRequest, res) => {
  if (!isSupabaseConfigured()) return ok(res, MOCK_ME);

  try {
    let biz: any = null;
    {
      const { data, error: bizErr } = await supabase
        .from("businesses")
        .select("id, via_number, business_name, trade_type, location, website, contact_phone, contact_enabled, description, business_intro, logo_url, referral_code")
        .eq("user_id", req.userId!)
        .maybeSingle();
      if (bizErr && (bizErr.code === "42703" || bizErr.message?.includes("column"))) {
        // logo_url or referral_code or business_intro column may not exist in dev DB — fall back
        const { data: fallback, error: fbErr } = await supabase
          .from("businesses")
          .select("id, via_number, business_name, trade_type, location, website, contact_phone, contact_enabled, description")
          .eq("user_id", req.userId!)
          .maybeSingle();
        if (fbErr) throw fbErr;
        biz = fallback ? { ...fallback, business_intro: null, logo_url: null, referral_code: null } : null;
      } else if (bizErr) {
        throw bizErr;
      } else {
        biz = data;
      }
    }
    if (!biz) return ok(res, null); // No business record yet (user not linked to application)

    const { data: appl } = await supabase
      .from("applications")
      .select("id, status, priority, plan_code, created_at, updated_at")
      .eq("business_id", biz.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return ok(res, { business: biz, application: appl ?? null });
  } catch (e: any) {
    logger.error({ err: e }, "GET /member/me error");
    return err(res, e.message);
  }
});

// =============================================================================
// PATCH /api/member/profile — update business profile
// =============================================================================
router.patch("/member/profile", requireMember, async (req: AuthedRequest, res) => {
  const { business_name, trade_type, location, website, contact_phone, contact_enabled, description } = req.body || {};

  if (!isSupabaseConfigured()) {
    return ok(res, { ...MOCK_ME.business, ...req.body });
  }

  try {
    // ── Server-side plan entitlement check ──────────────────────────────────
    if (description !== undefined) {
      const { data: bizForPlan } = await supabase.from("businesses").select("id").eq("user_id", req.userId!).maybeSingle();
      if (bizForPlan?.id) {
        const { data: applForPlan } = await supabase.from("applications").select("plan_code").eq("business_id", (bizForPlan as any).id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        const pc = (applForPlan as any)?.plan_code ?? null;
        if (!getPlanEntitlements(pc).enhanced_profile) {
          return err(res, "Business description is a TVC Plus feature. Upgrade to access this field.", 403);
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    const { data, error } = await supabase
      .from("businesses")
      .update({
        ...(business_name    !== undefined && { business_name }),
        ...(trade_type       !== undefined && { trade_type }),
        ...(location         !== undefined && { location }),
        ...(website          !== undefined && { website: website || null }),
        ...(contact_phone    !== undefined && { contact_phone: contact_phone || null }),
        ...(contact_enabled  !== undefined && { contact_enabled }),
        ...(description      !== undefined && { description: description || null }),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", req.userId!)
      .select()
      .single();

    if (error) return err(res, error.message);
    return ok(res, data);
  } catch (e: any) {
    logger.error({ err: e }, "PATCH /member/profile error");
    return err(res, e.message);
  }
});

// =============================================================================
// GET /api/member/documents — list member's uploaded documents
// =============================================================================
router.get("/member/documents", requireMember, async (req: AuthedRequest, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);

  try {
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", req.userId!)
      .single();

    if (!biz) return ok(res, []);

    const { data, error } = await supabase
      .from("documents")
      .select("id, document_type, file_name, file_url, file_size_bytes, mime_type, uploaded_at, status, admin_notes, expiry_date, reviewed_at")
      .eq("business_id", biz.id)
      .order("uploaded_at", { ascending: false });

    // If columns don't exist yet (migration pending), fall back to base columns
    if (error && (error.code === "42703" || error.message?.includes("column"))) {
      const { data: fallback } = await supabase
        .from("documents")
        .select("id, document_type, file_name, file_url, file_size_bytes, mime_type, uploaded_at")
        .eq("business_id", biz.id)
        .order("uploaded_at", { ascending: false });
      return ok(res, (fallback || []).map((d: any) => ({ ...d, status: "pending_review", admin_notes: null, expiry_date: null })));
    }
    if (error) return err(res, error.message);
    return ok(res, data || []);
  } catch (e: any) {
    logger.error({ err: e }, "GET /member/documents error");
    return err(res, e.message);
  }
});

// =============================================================================
// POST /api/member/documents — upload a document to Supabase Storage
// Body: { file_data: base64, mime_type, file_name, document_type }
// =============================================================================
router.post("/member/documents", requireMember, async (req: AuthedRequest, res) => {
  const { file_data, mime_type, file_name, document_type = "general", application_id } = req.body || {};

  if (!file_data || !mime_type || !file_name) {
    return err(res, "file_data (base64), mime_type, and file_name are required", 400);
  }

  const validTypes = ["general", "insurance", "accreditation", "proof_of_address", "other"];
  const resolvedType = validTypes.includes(document_type) ? document_type : "general";

  if (!isSupabaseConfigured()) {
    return ok(res, {
      id: `mock-doc-${Date.now()}`,
      document_type: resolvedType,
      file_name,
      file_url: "https://placehold.co/400x300?text=Document",
      mime_type,
      status: "pending_review",
      admin_notes: null,
      expiry_date: null,
      uploaded_at: new Date().toISOString(),
    }, 201);
  }

  try {
    // Get business ID
    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", req.userId!)
      .single();

    if (bizErr || !biz) return err(res, "Business not found", 404);

    await ensureDocBucket();

    const ext = file_name.split(".").pop()?.toLowerCase() || "pdf";
    const storagePath = `${req.userId}/${resolvedType}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(file_data as string, "base64");
    const fileSize = buffer.byteLength;

    const { error: uploadErr } = await supabase.storage
      .from(DOC_BUCKET)
      .upload(storagePath, buffer, { contentType: mime_type, upsert: false });

    if (uploadErr) throw uploadErr;

    // Get signed URL for display (private bucket)
    const { data: signedData } = await supabase.storage
      .from(DOC_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7-day URL

    const file_url = signedData?.signedUrl ?? storagePath;

    // Store metadata in documents table — try with status column, fall back if migration pending
    let doc: any;
    const insertBase = {
      business_id: biz.id,
      application_id: application_id || null,
      document_type: resolvedType,
      file_name,
      file_url: storagePath,
      file_size_bytes: fileSize,
      mime_type,
    };
    const { data: docWithStatus, error: docErr } = await supabase
      .from("documents")
      .insert({ ...insertBase, status: "pending_review" })
      .select()
      .single();

    if (docErr && (docErr.code === "42703" || docErr.message?.includes("column"))) {
      const { data: docFallback, error: docErr2 } = await supabase
        .from("documents")
        .insert(insertBase)
        .select()
        .single();
      if (docErr2) throw docErr2;
      doc = { ...docFallback, status: "pending_review", admin_notes: null, expiry_date: null };
    } else {
      if (docErr) throw docErr;
      doc = docWithStatus;
    }

    return ok(res, { ...doc, file_url }, 201);
  } catch (e: any) {
    logger.error({ err: e }, "POST /member/documents error");
    return err(res, e.message);
  }
});

// =============================================================================
// DELETE /api/member/documents/:id
// =============================================================================
router.delete("/member/documents/:id", requireMember, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { deleted: true });

  try {
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", req.userId!).single();
    if (!biz) return err(res, "Business not found", 404);

    const { data: doc } = await supabase.from("documents").select("file_url").eq("id", id).eq("business_id", biz.id).single();
    if (!doc) return err(res, "Document not found", 404);

    // Delete from storage
    if (doc.file_url && !doc.file_url.startsWith("http")) {
      await supabase.storage.from(DOC_BUCKET).remove([doc.file_url]).catch(() => {});
    }

    const { error } = await supabase.from("documents").delete().eq("id", id).eq("business_id", biz.id);
    if (error) return err(res, error.message);
    return ok(res, { deleted: true });
  } catch (e: any) {
    logger.error({ err: e }, "DELETE /member/documents/:id error");
    return err(res, e.message);
  }
});

// =============================================================================
// GET /api/member/documents/:id/url — get a fresh signed URL for a document
// =============================================================================
router.get("/member/documents/:id/url", requireMember, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { url: "https://placehold.co/400?text=Doc" });

  try {
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", req.userId!).single();
    if (!biz) return err(res, "Business not found", 404);

    const { data: doc } = await supabase.from("documents").select("file_url, file_name").eq("id", id).eq("business_id", biz.id).single();
    if (!doc) return err(res, "Document not found", 404);

    const { data: signed } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(doc.file_url, 3600);
    return ok(res, { url: signed?.signedUrl ?? null, file_name: doc.file_name });
  } catch (e: any) {
    logger.error({ err: e }, "GET /member/documents/:id/url error");
    return err(res, e.message);
  }
});

// =============================================================================
// GET /api/member/notifications — list notifications for this member
// =============================================================================
router.get("/member/notifications", requireMember, async (req: AuthedRequest, res) => {
  if (!isSupabaseConfigured()) {
    return ok(res, [
      { id: "n1", title: "Application received", body: "Your TVC application has been received and is being reviewed.", is_read: false, link: null, created_at: new Date().toISOString() },
    ]);
  }

  try {
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", req.userId!).single();
    if (!biz) return ok(res, []);

    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, body, is_read, link, created_at")
      .eq("business_id", biz.id)
      .eq("recipient_type", "member")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return err(res, error.message);
    return ok(res, data || []);
  } catch (e: any) {
    logger.error({ err: e }, "GET /member/notifications error");
    return err(res, e.message);
  }
});

// =============================================================================
// PATCH /api/member/notifications/:id/read — mark notification as read
// =============================================================================
router.patch("/member/notifications/:id/read", requireMember, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured()) return ok(res, { ok: true });

  try {
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", req.userId!).single();
    if (!biz) return err(res, "Business not found", 404);

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("business_id", biz.id);

    if (error) return err(res, error.message);
    return ok(res, { ok: true });
  } catch (e: any) {
    return err(res, e.message);
  }
});

// =============================================================================
// PATCH /api/member/notifications/read-all — mark all as read
// =============================================================================
router.patch("/member/notifications/read-all", requireMember, async (req: AuthedRequest, res) => {
  if (!isSupabaseConfigured()) return ok(res, { ok: true });

  try {
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", req.userId!).single();
    if (!biz) return err(res, "Business not found", 404);

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("business_id", biz.id)
      .eq("recipient_type", "member")
      .eq("is_read", false);

    return ok(res, { ok: true });
  } catch (e: any) {
    return err(res, e.message);
  }
});

// =============================================================================
// GET /api/member/sticker-orders — list sticker orders for this member's business
// =============================================================================
router.get("/member/sticker-orders", requireMember, async (req: AuthedRequest, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);

  try {
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", req.userId!)
      .maybeSingle();

    if (!biz) return ok(res, []);

    const { data, error } = await supabase
      .from("sticker_orders")
      .select("id, sticker_size, van_count, price_per_van_pence, expected_total_pence, payment_status, fulfilment_status, ordered_at, paid_at, dispatched_at")
      .eq("business_id", biz.id)
      .order("ordered_at", { ascending: false });

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) return ok(res, []);
      return err(res, error.message);
    }
    return ok(res, data || []);
  } catch (e: any) {
    logger.error({ err: e }, "GET /member/sticker-orders error");
    return err(res, e.message);
  }
});

// GET /api/member/verification-checks — get this member's checks
// =============================================================================
router.get("/member/verification-checks", requireMember, async (req: AuthedRequest, res) => {
  if (!isSupabaseConfigured()) {
    return ok(res, [
      { check_type: "local_address", status: "pending", checked_at: null },
      { check_type: "business_type", status: "pending", checked_at: null },
      { check_type: "insurance",     status: "pending", checked_at: null },
      { check_type: "accreditations",status: "pending", checked_at: null },
      { check_type: "digital_footprint", status: "pending", checked_at: null },
      { check_type: "public_records",status: "pending", checked_at: null },
    ]);
  }

  try {
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", req.userId!).single();
    if (!biz) return ok(res, []);

    const { data, error } = await supabase
      .from("verification_checks")
      .select("check_type, status, checked_at")
      .eq("business_id", biz.id)
      .order("check_type");

    if (error) return err(res, error.message);
    return ok(res, data || []);
  } catch (e: any) {
    return err(res, e.message);
  }
});

// =============================================================================
// PATCH /api/member/business-intro — update business introduction (Plus/legacy)
// =============================================================================
router.patch("/member/business-intro", requireMember, async (req: AuthedRequest, res) => {
  const { business_intro } = req.body || {};

  if (!isSupabaseConfigured()) {
    return ok(res, { business_intro: business_intro ?? null });
  }

  try {
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", req.userId!).maybeSingle();
    if (biz) {
      const { data: appl } = await supabase.from("applications").select("plan_code").eq("business_id", (biz as any).id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!getPlanEntitlements((appl as any)?.plan_code ?? null).portfolio_access) {
        return err(res, "Business intro is a TVC Plus feature.", 403);
      }
    }

    const intro = business_intro ? String(business_intro).slice(0, 1500) : null;
    const { data, error } = await supabase.from("businesses")
      .update({ business_intro: intro, updated_at: new Date().toISOString() })
      .eq("user_id", req.userId!)
      .select("business_intro")
      .single();
    if (error) return err(res, error.message);
    return ok(res, data);
  } catch (e: any) {
    return err(res, e.message);
  }
});

// =============================================================================
// GET /api/member/portfolio — list portfolio images
// =============================================================================
router.get("/member/portfolio", requireMember, async (req: AuthedRequest, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);

  try {
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", req.userId!).single();
    if (!biz) return ok(res, []);

    const { data, error } = await supabase.from("portfolio_images")
      .select("id, public_url, description, upload_month, display_order, created_at")
      .eq("business_id", biz.id)
      .order("display_order", { ascending: true });

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) return ok(res, []);
      return err(res, error.message);
    }
    return ok(res, data ?? []);
  } catch (e: any) {
    return err(res, e.message);
  }
});

// =============================================================================
// POST /api/member/portfolio — upload a portfolio image
// Body: { file_data: base64, mime_type, file_name, description? }
// =============================================================================
router.post("/member/portfolio", requireMember, async (req: AuthedRequest, res) => {
  const { file_data, mime_type, file_name, description } = req.body || {};

  if (!file_data || !mime_type || !file_name) {
    return err(res, "file_data (base64), mime_type, and file_name are required", 400);
  }

  if (!isSupabaseConfigured()) {
    return ok(res, {
      id: `mock-img-${Date.now()}`,
      public_url: "https://placehold.co/600x400?text=Portfolio",
      description: description ?? null,
      upload_month: new Date().toISOString().slice(0, 7),
      display_order: 0,
      created_at: new Date().toISOString(),
    }, 201);
  }

  try {
    const { data: biz, error: bizErr } = await supabase.from("businesses").select("id").eq("user_id", req.userId!).single();
    if (bizErr || !biz) return err(res, "Business not found", 404);

    const { data: appl } = await supabase.from("applications").select("plan_code").eq("business_id", biz.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const pc = (appl as any)?.plan_code ?? null;
    if (!getPlanEntitlements(pc).portfolio_access) return err(res, "Portfolio is a TVC Plus feature.", 403);

    const uploadMonth = new Date().toISOString().slice(0, 7);
    const { count: monthCount } = await supabase.from("portfolio_images").select("id", { count: "exact", head: true }).eq("business_id", biz.id).eq("upload_month", uploadMonth);
    const imgLimit = Number(getPlanEntitlements(pc).monthly_image_limit) || 20;
    if ((monthCount ?? 0) >= imgLimit) {
      return err(res, `Monthly upload limit of ${imgLimit} images reached. Limit resets next month.`, 429);
    }

    await ensurePortfolioBucket();

    const ext = (file_name as string).split(".").pop()?.toLowerCase() || "jpg";
    const storagePath = `${biz.id}/${uploadMonth}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(file_data as string, "base64");

    const { error: uploadErr } = await supabase.storage.from(PORTFOLIO_BUCKET).upload(storagePath, buffer, { contentType: mime_type, upsert: false });
    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(storagePath);
    const publicUrl = (urlData as any)?.publicUrl ?? null;

    const { data: img, error: imgErr } = await supabase.from("portfolio_images").insert({
      business_id: biz.id,
      storage_path: storagePath,
      public_url: publicUrl,
      description: description ? String(description).slice(0, 300) : null,
      upload_month: uploadMonth,
      display_order: monthCount ?? 0,
    }).select().single();
    if (imgErr) throw imgErr;
    return ok(res, img, 201);
  } catch (e: any) {
    logger.error({ err: e }, "POST /member/portfolio error");
    return err(res, e.message);
  }
});

// =============================================================================
// DELETE /api/member/portfolio/:id — delete a portfolio image (no quota restore)
// =============================================================================
router.delete("/member/portfolio/:id", requireMember, async (req: AuthedRequest, res) => {
  if (!isSupabaseConfigured()) return ok(res, { deleted: true });

  try {
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", req.userId!).single();
    if (!biz) return err(res, "Business not found", 404);

    const { data: img } = await supabase.from("portfolio_images").select("storage_path").eq("id", req.params.id).eq("business_id", biz.id).maybeSingle();
    if (!img) return err(res, "Image not found", 404);

    if ((img as any).storage_path) {
      await supabase.storage.from(PORTFOLIO_BUCKET).remove([(img as any).storage_path]);
    }

    const { error } = await supabase.from("portfolio_images").delete().eq("id", req.params.id).eq("business_id", biz.id);
    if (error) return err(res, error.message);
    return ok(res, { deleted: true });
  } catch (e: any) {
    return err(res, e.message);
  }
});

// =============================================================================
// GET /api/member/social-links — list social links for current member
// =============================================================================
router.get("/member/social-links", requireMember, async (req: AuthedRequest, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);

  try {
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", req.userId!).single();
    if (!biz) return ok(res, []);

    const { data, error } = await supabase.from("social_links").select("id, platform, url").eq("business_id", biz.id).order("platform");
    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) return ok(res, []);
      return err(res, error.message);
    }
    return ok(res, data ?? []);
  } catch (e: any) {
    return err(res, e.message);
  }
});

// =============================================================================
// PUT /api/member/social-links — replace all social links at once
// Body: { links: [{ platform, url }] }
// =============================================================================
router.put("/member/social-links", requireMember, async (req: AuthedRequest, res) => {
  const { links } = req.body || {};
  if (!Array.isArray(links)) return err(res, "links array required", 400);

  if (!isSupabaseConfigured()) return ok(res, links);

  try {
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", req.userId!).single();
    if (!biz) return err(res, "Business not found", 404);

    const { data: appl } = await supabase.from("applications").select("plan_code").eq("business_id", biz.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!getPlanEntitlements((appl as any)?.plan_code ?? null).social_links) {
      return err(res, "Social links are a TVC Plus feature.", 403);
    }

    const VALID_PLATFORMS = ["facebook", "instagram", "linkedin", "tiktok", "youtube", "x", "other"];
    const rows = (links as any[])
      .filter((l: any) => VALID_PLATFORMS.includes(l.platform) && typeof l.url === "string" && l.url.trim().startsWith("https://"))
      .map((l: any) => ({ business_id: biz.id, platform: l.platform, url: l.url.trim() }));

    await supabase.from("social_links").delete().eq("business_id", biz.id);
    if (rows.length > 0) {
      const { error: insertErr } = await supabase.from("social_links").insert(rows);
      if (insertErr) return err(res, insertErr.message);
    }

    const { data: result } = await supabase.from("social_links").select("id, platform, url").eq("business_id", biz.id).order("platform");
    return ok(res, result ?? []);
  } catch (e: any) {
    return err(res, e.message);
  }
});

// =============================================================================
// GET /api/member/testimonials — list testimonials for current member
// =============================================================================
router.get("/member/testimonials", requireMember, async (req: AuthedRequest, res) => {
  if (!isSupabaseConfigured()) return ok(res, []);

  try {
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", req.userId!).single();
    if (!biz) return ok(res, []);

    const { data, error } = await supabase.from("testimonials")
      .select("id, customer_name, testimonial_text, customer_email, service_received, work_date, approval_status, moderation_notes, submitted_at, reviewed_at")
      .eq("business_id", biz.id)
      .order("submitted_at", { ascending: false });

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) return ok(res, []);
      return err(res, error.message);
    }
    return ok(res, data ?? []);
  } catch (e: any) {
    return err(res, e.message);
  }
});

// =============================================================================
// PATCH /api/member/testimonials/:id — member edits a testimonial before approval
// =============================================================================
router.patch("/member/testimonials/:id", requireMember, async (req: AuthedRequest, res) => {
  if (!isSupabaseConfigured()) return ok(res, { id: req.params.id, ...req.body });

  try {
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", req.userId!).single();
    if (!biz) return err(res, "Business not found", 404);

    const { customer_name, testimonial_text, customer_email, service_received, work_date } = req.body || {};
    const { data, error } = await supabase.from("testimonials")
      .update({
        ...(customer_name     !== undefined && { customer_name }),
        ...(testimonial_text  !== undefined && { testimonial_text }),
        ...(customer_email    !== undefined && { customer_email }),
        ...(service_received  !== undefined && { service_received }),
        ...(work_date         !== undefined && { work_date: work_date || null }),
      })
      .eq("id", req.params.id)
      .eq("business_id", biz.id)
      .select()
      .single();
    if (error) return err(res, error.message);
    return ok(res, data);
  } catch (e: any) {
    return err(res, e.message);
  }
});

export default router;
