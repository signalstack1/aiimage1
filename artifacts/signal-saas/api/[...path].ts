import { supabase, configured } from "./_lib/supabase";
import { makeAdminToken, verifyAdminToken, getAdminToken } from "./_lib/auth";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

const DOC_BUCKET = "member-documents";

// ── Helpers ────────────────────────────────────────────────────────────────────

function ok(res: any, data: any, status = 200) {
  res.status(status).json(data);
}
function fail(res: any, msg: string, status = 500) {
  res.status(status).json({ error: msg });
}
function cors(res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}
function adminHeaders(req: any) {
  return { Authorization: req.headers.authorization ?? "" };
}

// ── Auth helpers ───────────────────────────────────────────────────────────────

function isAdmin(req: any): boolean {
  return verifyAdminToken(getAdminToken(req.headers.authorization ?? ""));
}

async function getMemberId(req: any): Promise<string | null> {
  const token = getAdminToken(req.headers.authorization ?? "");
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

// ── Main handler ───────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  cors(res);
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  const segments: string[] = Array.isArray(req.query.path)
    ? req.query.path
    : (req.query.path ?? "").split("/").filter(Boolean);
  const method = req.method?.toUpperCase() ?? "GET";

  // route: [group, ...rest]
  const [g0, g1, g2, g3, g4] = segments;

  try {
    // ── Public ─────────────────────────────────────────────────────────────────

    // GET /api/payment-links
    if (g0 === "payment-links" && method === "GET") {
      if (!configured) { ok(res, []); return; }
      const { data, error } = await supabase
        .from("payment_links").select("id,slug,label,url,is_active")
        .eq("is_active", true).order("sort_order");
      if (error) { ok(res, []); return; }
      ok(res, data ?? []);
      return;
    }

    // GET /api/via/verify/:viaNumber
    if (g0 === "via" && g1 === "verify" && g2 && method === "GET") {
      const normalized = g2.trim().toUpperCase();
      if (!configured) { fail(res, "Not found", 404); return; }
      const { data: business, error: bErr } = await supabase
        .from("businesses")
        .select(`via_number,business_name,trade_type,location,contact_phone,contact_enabled,
          applications!inner(status,updated_at),
          verification_checks(check_type,status,checked_at)`)
        .eq("via_number", normalized)
        .eq("applications.status", "approved")
        .single();
      if (bErr || !business) { fail(res, "Not found", 404); return; }
      const app = (business as any).applications?.[0];
      ok(res, {
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
      return;
    }

    // POST /api/via/apply
    if (g0 === "via" && g1 === "apply" && method === "POST") {
      const { name, business_name, trade_type, location, website, email, phone, message, password } = req.body ?? {};
      if (!name || !business_name || !trade_type || !email) { fail(res, "name, business_name, trade_type, and email are required", 400); return; }
      if (!password || (password as string).length < 8) { fail(res, "password must be at least 8 characters", 400); return; }
      if (!configured) { ok(res, { ok: true, id: `mock-${Date.now()}`, payment_url: null }, 201); return; }

      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: (email as string).trim().toLowerCase(),
        password: password as string,
        email_confirm: true,
      });
      if (authErr) {
        if ((authErr as any).status === 422 || authErr.message?.toLowerCase().includes("already")) {
          fail(res, "An account with this email already exists. Please sign in instead.", 409); return;
        }
        throw authErr;
      }
      const userId = authData.user.id;

      const { data: biz, error: bizErr } = await supabase.from("businesses").insert({
        business_name, trade_type, location: location ?? "",
        website: website ?? null, contact_phone: phone ?? null,
        contact_enabled: false, user_id: userId,
      }).select().single();
      if (bizErr) throw bizErr;

      const { data: appl, error: applErr } = await supabase.from("applications").insert({
        business_id: biz.id, applicant_name: name,
        applicant_email: (email as string).trim().toLowerCase(),
        applicant_phone: phone ?? null, message: message ?? null,
        status: "pending_payment",
      }).select().single();
      if (applErr) throw applErr;

      let paymentUrl: string | null = null;
      try {
        const { data: pl } = await supabase.from("payment_links").select("url")
          .eq("slug", "via-membership").eq("is_active", true).maybeSingle();
        paymentUrl = pl?.url ?? null;
      } catch { /* non-fatal */ }

      try {
        await supabase.from("events").insert({ event_type: "application_submit", actor: email, meta: { business_name, trade_type } });
      } catch { /* non-fatal */ }

      ok(res, { ok: true, id: appl.id, payment_url: paymentUrl }, 201);
      return;
    }

    // POST /api/via/applications/:id/documents
    if (g0 === "via" && g1 === "applications" && g2 && g3 === "documents" && method === "POST") {
      const applicationId = g2;
      const { file_data, mime_type, file_name, document_type = "general" } = req.body ?? {};
      if (!file_data || !mime_type || !file_name) { fail(res, "file_data, mime_type, and file_name are required", 400); return; }
      const validTypes = ["general","insurance","accreditation","proof_of_address","other"];
      const resolvedType = validTypes.includes(document_type) ? document_type : "general";
      if (!configured) { ok(res, { id: `mock-doc-${Date.now()}`, document_type: resolvedType, file_name, status: "pending_review", uploaded_at: new Date().toISOString() }, 201); return; }

      const { data: appl, error: applErr } = await supabase.from("applications").select("id,business_id").eq("id", applicationId).single();
      if (applErr || !appl) { fail(res, "Application not found", 404); return; }

      const ext = file_name.split(".").pop()?.toLowerCase() ?? "pdf";
      const storagePath = `applications/${applicationId}/${resolvedType}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const buffer = Buffer.from(file_data as string, "base64");
      const { error: uploadErr } = await supabase.storage.from(DOC_BUCKET).upload(storagePath, buffer, { contentType: mime_type, upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: doc, error: docErr } = await supabase.from("documents").insert({
        business_id: appl.business_id, application_id: applicationId,
        document_type: resolvedType, file_name, file_url: storagePath,
        file_size_bytes: buffer.byteLength, mime_type, status: "pending_review",
      }).select("id,document_type,file_name,file_size_bytes,status,uploaded_at").single();
      if (docErr) throw docErr;
      ok(res, doc, 201);
      return;
    }

    // ── Admin ──────────────────────────────────────────────────────────────────

    // POST /api/admin/login
    if (g0 === "admin" && g1 === "login" && method === "POST") {
      const { password } = req.body ?? {};
      if (!password || password !== process.env.ADMIN_PASSWORD) { fail(res, "Invalid password", 401); return; }
      ok(res, { token: makeAdminToken() });
      return;
    }

    // All remaining admin routes require auth
    if (g0 === "admin") {
      if (!isAdmin(req)) { fail(res, "Unauthorized", 401); return; }

      // GET /api/admin/via-overview
      if (g1 === "via-overview" && method === "GET") {
        if (!configured) { ok(res, { applications: { total:0,pending:0,in_review:0,approved:0,rejected:0,expired:0 }, members_approved:0, leads_by_stage:{} }); return; }
        const [{ data: apps }, { data: leads }] = await Promise.all([
          supabase.from("applications").select("status"),
          supabase.from("leads").select("stage,status"),
        ]);
        const byStatus: Record<string,number> = {};
        for (const a of apps ?? []) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
        const byStage: Record<string,number> = {};
        for (const l of leads ?? []) { const s = l.stage ?? l.status ?? "new"; byStage[s] = (byStage[s] ?? 0) + 1; }
        ok(res, {
          applications: { total: apps?.length ?? 0, pending: byStatus["pending"]??0, in_review: byStatus["in_review"]??0, approved: byStatus["approved"]??0, rejected: byStatus["rejected"]??0, expired: byStatus["expired"]??0 },
          members_approved: byStatus["approved"] ?? 0,
          leads_by_stage: { new: byStage["new"]??0, contacted: byStage["contacted"]??0, replied: byStage["replied"]??0, interested: byStage["interested"]??0, converted: byStage["converted"]??0, dead: byStage["dead"]??0 },
        });
        return;
      }

      // GET /api/admin/via-notifications
      if (g1 === "via-notifications" && method === "GET") {
        const limit = Math.min(Number(req.query.limit) || 40, 100);
        if (!configured) { ok(res, []); return; }
        const [{ data: notifs }, { data: recentApps }] = await Promise.all([
          supabase.from("notifications").select("id,title,body,is_read,link,created_at").eq("recipient_type","admin").order("created_at",{ascending:false}).limit(limit),
          supabase.from("applications").select("id,status,priority,applicant_name,created_at,businesses(business_name,trade_type)").order("created_at",{ascending:false}).limit(20),
        ]);
        const appEvents = (recentApps ?? []).map((a: any) => ({
          id: `app-${a.id}`, type: "new_application",
          title: a.priority ? "Priority application submitted" : "New application submitted",
          body: `${a.businesses?.business_name ?? a.applicant_name} (${a.businesses?.trade_type ?? "—"})`,
          link: `/admin/applications/${a.id}`, is_read: false, created_at: a.created_at,
        }));
        const all = [...(notifs ?? []).map((n: any) => ({ ...n, type: "system" })), ...appEvents]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit);
        ok(res, all);
        return;
      }

      // POST /api/admin/via-notifications/mark-all-read
      if (g1 === "via-notifications" && g2 === "mark-all-read" && method === "POST") {
        if (configured) await supabase.from("notifications").update({ is_read: true }).eq("recipient_type","admin").eq("is_read",false);
        ok(res, { ok: true });
        return;
      }

      // PATCH /api/admin/via-notifications/:id/read
      if (g1 === "via-notifications" && g2 && g3 === "read" && method === "PATCH") {
        if (configured) await supabase.from("notifications").update({ is_read: true }).eq("id", g2);
        ok(res, { ok: true });
        return;
      }

      // GET /api/admin/next-via-number
      if (g1 === "next-via-number" && method === "GET") {
        if (!configured) { ok(res, { via_number: "TVC1001" }); return; }
        const { data, error } = await supabase.rpc("next_via_number");
        if (!error && data) { ok(res, { via_number: data as string }); return; }
        const { data: businesses } = await supabase.from("businesses").select("via_number").not("via_number","is",null);
        const nums = (businesses ?? []).map((b: any) => { const m = b.via_number?.match(/^TVC(\d+)$/i); return m ? parseInt(m[1],10) : 0; }).filter((n: number) => n > 0);
        ok(res, { via_number: `TVC${nums.length > 0 ? Math.max(...nums)+1 : 1001}` });
        return;
      }

      // GET /api/admin/applications
      if (g1 === "applications" && !g2 && method === "GET") {
        if (!configured) { ok(res, []); return; }
        const { status } = req.query as Record<string,string>;
        let q = supabase.from("applications")
          .select("id,status,priority,applicant_name,applicant_email,created_at,updated_at,businesses(id,business_name,trade_type,location,via_number)")
          .order("created_at",{ascending:false});
        if (status && status !== "all") q = q.eq("status", status);
        const { data, error } = await q;
        if (error) throw error;
        ok(res, data ?? []);
        return;
      }

      // GET /api/admin/applications/:id
      if (g1 === "applications" && g2 && !g3 && method === "GET") {
        if (!configured) { fail(res, "Not found", 404); return; }
        const { data: appl, error: applErr } = await supabase.from("applications")
          .select(`id,status,priority,applicant_name,applicant_email,applicant_phone,message,created_at,updated_at,
            businesses(id,business_name,trade_type,location,website,contact_phone,description,via_number,user_id)`)
          .eq("id", g2).single();
        if (applErr || !appl) { fail(res, "Application not found", 404); return; }
        const biz = (appl as any).businesses;
        const [{ data: docs }, { data: checks }, { data: notes }] = await Promise.all([
          biz?.id ? supabase.from("documents").select("id,document_type,file_name,file_url,file_size_bytes,mime_type,uploaded_at,status,admin_notes,expiry_date").eq("business_id",biz.id).order("uploaded_at",{ascending:false}) : Promise.resolve({ data: [] }),
          biz?.id ? supabase.from("verification_checks").select("id,check_type,status,checked_at").eq("business_id",biz.id) : Promise.resolve({ data: [] }),
          supabase.from("admin_notes").select("id,body,created_at").eq("application_id",g2).order("created_at"),
        ]);
        ok(res, { ...appl, documents: docs??[], verification_checks: checks??[], admin_notes: notes??[] });
        return;
      }

      // PATCH /api/admin/applications/:id
      if (g1 === "applications" && g2 && !g3 && method === "PATCH") {
        const { status, via_number, via_number_for_business_id } = req.body ?? {};
        if (!configured) { ok(res, { ok: true }); return; }
        if (via_number && via_number_for_business_id) {
          const normalized = (via_number as string).trim().toUpperCase();
          if (!/^TVC\d+$/i.test(normalized)) { fail(res, "TVC number must be in format TVC1001", 400); return; }
          const { data: conflict } = await supabase.from("businesses").select("id").eq("via_number",normalized).maybeSingle();
          if (conflict && (conflict as any).id !== via_number_for_business_id) { fail(res, `${normalized} is already assigned to another business`, 409); return; }
          const { error: bizErr } = await supabase.from("businesses").update({ via_number: normalized, updated_at: new Date().toISOString() }).eq("id",via_number_for_business_id);
          if (bizErr) throw bizErr;
          try { await supabase.from("notifications").insert({ business_id: via_number_for_business_id, recipient_type: "member", title: "Your TVC application has been approved!", body: `Your TVC number is ${normalized}. You can now download your badge from the member dashboard.` }); } catch { /* non-fatal */ }
        }
        if (status) {
          const { error: applErr } = await supabase.from("applications").update({ status, updated_at: new Date().toISOString() }).eq("id",g2);
          if (applErr) throw applErr;
        }
        ok(res, { ok: true });
        return;
      }

      // POST /api/admin/applications/:id/mark-paid
      if (g1 === "applications" && g2 && g3 === "mark-paid" && method === "POST") {
        const { payment_notes } = req.body ?? {};
        if (!configured) { ok(res, { ok:true, id:g2, status:"pending" }); return; }
        const { error } = await supabase.from("applications").update({ status:"pending", updated_at: new Date().toISOString() }).eq("id",g2);
        if (error) throw error;
        if ((payment_notes as string|undefined)?.trim()) {
          try { await supabase.from("admin_notes").insert({ application_id:g2, body:`Payment confirmed. Notes: ${(payment_notes as string).trim()}` }); } catch { /* non-fatal */ }
        }
        try {
          const { data: appl } = await supabase.from("applications").select("businesses(user_id)").eq("id",g2).single();
          const userId = (appl?.businesses as any)?.user_id;
          if (userId) await supabase.from("notifications").insert({ user_id:userId, type:"payment_confirmed", title:"Payment confirmed", body:"Your payment has been confirmed. We will begin your TVC verification shortly.", recipient_type:"member" });
        } catch { /* non-fatal */ }
        ok(res, { ok:true, id:g2, status:"pending" });
        return;
      }

      // POST /api/admin/applications/:id/request-documents
      if (g1 === "applications" && g2 && g3 === "request-documents" && method === "POST") {
        const { message } = req.body ?? {};
        if (!configured) { ok(res, { ok: true }); return; }
        const { data: appl, error: applErr } = await supabase.from("applications").select("id,business_id,applicant_name").eq("id",g2).single();
        if (applErr || !appl) { fail(res, "Application not found", 404); return; }
        const notifMessage = (message as string|undefined)?.trim() ?? "The TVC team requires additional supporting documents to progress your verification. Please log in to your dashboard and upload the requested files.";
        await supabase.from("notifications").insert({ recipient_type:"member", business_id: appl.business_id, title:"Additional documents required", body: notifMessage, is_read:false });
        ok(res, { ok: true });
        return;
      }

      // GET /api/admin/admin-notes?application_id=...
      if (g1 === "admin-notes" && method === "GET") {
        const { application_id } = req.query as Record<string,string>;
        if (!application_id) { fail(res, "application_id required", 400); return; }
        if (!configured) { ok(res, []); return; }
        const { data, error } = await supabase.from("admin_notes").select("id,body,created_at").eq("application_id",application_id).order("created_at");
        if (error) throw error;
        ok(res, data ?? []);
        return;
      }

      // POST /api/admin/admin-notes
      if (g1 === "admin-notes" && method === "POST") {
        const { application_id, body } = req.body ?? {};
        if (!application_id || !(body as string|undefined)?.trim()) { fail(res, "application_id and body required", 400); return; }
        if (!configured) { ok(res, { id:`note-${Date.now()}`, application_id, body, created_at: new Date().toISOString() }, 201); return; }
        const { data, error } = await supabase.from("admin_notes").insert({ application_id, body: (body as string).trim() }).select().single();
        if (error) throw error;
        ok(res, data, 201);
        return;
      }

      // POST /api/admin/verification-checks/upsert
      if (g1 === "verification-checks" && g2 === "upsert" && method === "POST") {
        const { application_id, business_id, check_type, status } = req.body ?? {};
        if (!application_id || !business_id || !check_type || !status) { fail(res, "application_id, business_id, check_type, status required", 400); return; }
        const validStatuses = ["verified","unverified","pending"];
        if (!validStatuses.includes(status)) { fail(res, `status must be one of: ${validStatuses.join(", ")}`, 400); return; }
        if (!configured) { ok(res, { application_id, business_id, check_type, status, checked_at: status!=="pending" ? new Date().toISOString() : null }); return; }
        const checked_at = status !== "pending" ? new Date().toISOString() : null;
        const { data, error } = await supabase.from("verification_checks").upsert(
          { application_id, business_id, check_type, status, checked_at, updated_at: new Date().toISOString() },
          { onConflict: "application_id,check_type" }
        ).select().single();
        if (error) throw error;
        ok(res, data);
        return;
      }

      // GET /api/admin/documents/:id/url
      if (g1 === "documents" && g2 && g3 === "url" && method === "GET") {
        if (!configured) { ok(res, { url: null }); return; }
        const { data: doc } = await supabase.from("documents").select("file_url,file_name").eq("id",g2).single();
        if (!doc) { fail(res, "Document not found", 404); return; }
        const { data: signed } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(doc.file_url, 3600);
        ok(res, { url: signed?.signedUrl ?? null, file_name: doc.file_name });
        return;
      }

      // PATCH /api/admin/documents/:id
      if (g1 === "documents" && g2 && !g3 && method === "PATCH") {
        const { status, admin_notes, expiry_date, reviewed_by } = req.body ?? {};
        if (!configured) { ok(res, { ok: true }); return; }
        const updates: Record<string,any> = {};
        if (status !== undefined) { updates.status = status; updates.reviewed_at = new Date().toISOString(); updates.reviewed_by = reviewed_by ?? "admin"; }
        if (admin_notes !== undefined) updates.admin_notes = admin_notes;
        if (expiry_date !== undefined) updates.expiry_date = expiry_date ?? null;
        const { data, error } = await supabase.from("documents").update(updates).eq("id",g2).select().single();
        if (error) throw error;
        ok(res, data);
        return;
      }

      // GET /api/admin/members
      if (g1 === "members" && !g2 && method === "GET") {
        if (!configured) { ok(res, []); return; }
        const { search, status } = req.query as Record<string,string>;
        let q = supabase.from("businesses")
          .select("id,business_name,trade_type,location,via_number,user_id,applications(id,status,updated_at)")
          .order("created_at",{ascending:false});
        const { data, error } = await q;
        if (error) throw error;
        let results = (data ?? []).filter((b: any) => b.applications?.length > 0);
        if (status && status !== "all") results = results.filter((b: any) => b.applications?.some((a: any) => a.status === status));
        if (search) { const s = search.toLowerCase(); results = results.filter((b: any) => b.business_name?.toLowerCase().includes(s) || b.via_number?.toLowerCase().includes(s) || b.location?.toLowerCase().includes(s)); }
        ok(res, results);
        return;
      }

      // GET /api/admin/members/:id
      if (g1 === "members" && g2 && !g3 && method === "GET") {
        if (!configured) { fail(res, "Not found", 404); return; }
        const { data: biz, error: bizErr } = await supabase.from("businesses")
          .select("id,business_name,trade_type,location,website,contact_phone,description,via_number,user_id,created_at")
          .eq("id",g2).single();
        if (bizErr || !biz) { fail(res, "Not found", 404); return; }
        const [{ data: apps }, { data: docs }, { data: checks }] = await Promise.all([
          supabase.from("applications").select("id,status,applicant_email,created_at").eq("business_id",g2).order("created_at",{ascending:false}).limit(1),
          supabase.from("documents").select("id,document_type,file_name,created_at").eq("business_id",g2).order("created_at",{ascending:false}),
          supabase.from("verification_checks").select("check_type,passed").eq("business_id",g2),
        ]);
        ok(res, { ...biz, application: apps?.[0]??null, documents: docs??[], verification_checks: checks??[] });
        return;
      }

      // PATCH /api/admin/businesses/:id/link-user
      if (g1 === "businesses" && g2 && g3 === "link-user" && method === "PATCH") {
        const { email } = req.body ?? {};
        if (!email) { fail(res, "email required", 400); return; }
        if (!configured) { ok(res, { ok:true, linked:false, message:"Not configured" }); return; }
        const { data: listData, error: usersErr } = await supabase.auth.admin.listUsers();
        if (usersErr) throw usersErr;
        const users: any[] = (listData as any)?.users ?? [];
        const user = users.find((u: any) => u.email === email);
        if (!user) { fail(res, `No user found with email: ${email}`, 404); return; }
        const { error } = await supabase.from("businesses").update({ user_id: user.id }).eq("id",g2);
        if (error) throw error;
        try { await supabase.from("notifications").insert({ business_id:g2, recipient_type:"member", title:"Your account is ready", body:"Log in to view your dashboard." }); } catch { /* non-fatal */ }
        ok(res, { ok:true, linked:true, user_id: user.id });
        return;
      }

      // GET/POST /api/admin/payment-links
      if (g1 === "payment-links" && !g2 && method === "GET") {
        if (!configured) { ok(res, []); return; }
        const { data, error } = await supabase.from("payment_links").select("*").order("sort_order");
        if (error) { ok(res, []); return; }
        ok(res, data ?? []);
        return;
      }
      if (g1 === "payment-links" && !g2 && method === "POST") {
        const { slug, label, url, is_active, sort_order } = req.body ?? {};
        if (!slug || !label) { fail(res, "slug and label required", 400); return; }
        if (!configured) { ok(res, { id:`pl-${Date.now()}`, slug, label, url:url??null, is_active:is_active??true, sort_order:sort_order??0 }, 201); return; }
        const { data, error } = await supabase.from("payment_links").insert({ slug, label, url:url??null, is_active:is_active??true, sort_order:sort_order??0 }).select().single();
        if (error) { fail(res, error.message); return; }
        ok(res, data, 201);
        return;
      }

      // PATCH/PUT /api/admin/payment-links/:id
      if (g1 === "payment-links" && g2 && !g3 && (method === "PATCH" || method === "PUT")) {
        if (!configured) { ok(res, { id:g2, ...req.body }); return; }
        const { data, error } = await supabase.from("payment_links").update({ ...req.body, updated_at: new Date().toISOString() }).eq("id",g2).select().single();
        if (error) { fail(res, error.message); return; }
        ok(res, data);
        return;
      }

      // DELETE /api/admin/payment-links/:id
      if (g1 === "payment-links" && g2 && !g3 && method === "DELETE") {
        if (configured) {
          const { error } = await supabase.from("payment_links").delete().eq("id",g2);
          if (error) { fail(res, error.message); return; }
        }
        ok(res, { deleted: true });
        return;
      }

      // GET /api/admin/leads
      if (g1 === "leads" && !g2 && method === "GET") {
        if (!configured) { ok(res, []); return; }
        const { data, error } = await supabase.from("leads").select("*").order("created_at",{ascending:false});
        if (error) { fail(res, error.message); return; }
        ok(res, data ?? []);
        return;
      }

      // POST /api/admin/leads
      if (g1 === "leads" && !g2 && method === "POST") {
        const { name, business_name, email, phone, location, service_needed, message, stage } = req.body ?? {};
        if (!email) { fail(res, "email required", 400); return; }
        if (!configured) { ok(res, { id:`lead-${Date.now()}`, ...req.body, created_at: new Date().toISOString() }, 201); return; }
        const { data, error } = await supabase.from("leads").insert({ name:name??"", business_name:business_name??null, email, phone:phone??null, location:location??null, service_needed:service_needed??null, message:message??null, stage:stage??"new" }).select().single();
        if (error) { fail(res, error.message); return; }
        ok(res, data, 201);
        return;
      }

      // PATCH /api/admin/leads/:id
      if (g1 === "leads" && g2 && !g3 && method === "PATCH") {
        if (!configured) { ok(res, { id:g2, ...req.body }); return; }
        const { data, error } = await supabase.from("leads").update(req.body).eq("id",g2).select().single();
        if (error) { fail(res, error.message); return; }
        ok(res, data);
        return;
      }

      // DELETE /api/admin/leads/:id
      if (g1 === "leads" && g2 && !g3 && method === "DELETE") {
        if (configured) { await supabase.from("leads").delete().eq("id",g2); }
        ok(res, { deleted: true });
        return;
      }

      // GET /api/admin/business-profile
      if (g1 === "business-profile" && method === "GET") {
        if (!configured) { ok(res, {}); return; }
        const { data, error } = await supabase.from("businesses").select("*").limit(1).single();
        if (error) { ok(res, {}); return; }
        ok(res, data ?? {});
        return;
      }

      // GET /api/admin/activity
      if (g1 === "activity" && method === "GET") {
        if (!configured) { ok(res, { events: [], total: 0 }); return; }
        const type = (req.query.type as string) ?? "all";
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const offset = Number(req.query.offset) || 0;
        let query = supabase.from("events").select("id,event_type,actor,meta,created_at",{count:"exact"}).order("created_at",{ascending:false}).range(offset, offset+limit-1);
        if (type !== "all") query = query.eq("event_type", type);
        const { data, count, error } = await query;
        if (error) { ok(res, { events:[], total:0 }); return; }
        ok(res, { events: data??[], total: count??0 });
        return;
      }

      fail(res, "Admin route not found", 404);
      return;
    }

    // ── Member ─────────────────────────────────────────────────────────────────

    if (g0 === "member") {
      const userId = await getMemberId(req);
      if (!userId) { fail(res, "Authentication required", 401); return; }

      // GET /api/member/me
      if (g1 === "me" && method === "GET") {
        if (!configured) { ok(res, null); return; }
        const { data: biz, error: bizErr } = await supabase.from("businesses")
          .select("id,via_number,business_name,trade_type,location,website,contact_phone,contact_enabled,description")
          .eq("user_id", userId).maybeSingle();
        if (bizErr) throw bizErr;
        if (!biz) { ok(res, null); return; }
        const { data: appl } = await supabase.from("applications").select("id,status,priority,created_at,updated_at")
          .eq("business_id", (biz as any).id).order("created_at",{ascending:false}).limit(1).maybeSingle();
        ok(res, { business: biz, application: appl ?? null });
        return;
      }

      // PATCH /api/member/profile
      if (g1 === "profile" && method === "PATCH") {
        if (!configured) { ok(res, req.body); return; }
        const { business_name, trade_type, location, website, contact_phone, contact_enabled, description } = req.body ?? {};
        const { data, error } = await supabase.from("businesses").update({
          ...(business_name !== undefined && { business_name }),
          ...(trade_type !== undefined && { trade_type }),
          ...(location !== undefined && { location }),
          ...(website !== undefined && { website: website || null }),
          ...(contact_phone !== undefined && { contact_phone: contact_phone || null }),
          ...(contact_enabled !== undefined && { contact_enabled }),
          ...(description !== undefined && { description: description || null }),
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId).select().single();
        if (error) { fail(res, error.message); return; }
        ok(res, data);
        return;
      }

      // GET /api/member/documents
      if (g1 === "documents" && !g2 && method === "GET") {
        if (!configured) { ok(res, []); return; }
        const { data: biz } = await supabase.from("businesses").select("id").eq("user_id",userId).single();
        if (!biz) { ok(res, []); return; }
        const { data, error } = await supabase.from("documents")
          .select("id,document_type,file_name,file_url,file_size_bytes,mime_type,uploaded_at,status,admin_notes,expiry_date")
          .eq("business_id",(biz as any).id).order("uploaded_at",{ascending:false});
        if (error) { fail(res, error.message); return; }
        ok(res, data ?? []);
        return;
      }

      // POST /api/member/documents
      if (g1 === "documents" && !g2 && method === "POST") {
        const { file_data, mime_type, file_name, document_type="general", application_id } = req.body ?? {};
        if (!file_data || !mime_type || !file_name) { fail(res, "file_data, mime_type, and file_name are required", 400); return; }
        if (!configured) { ok(res, { id:`mock-doc-${Date.now()}`, document_type, file_name, mime_type, status:"pending_review", admin_notes:null, expiry_date:null, uploaded_at:new Date().toISOString() }, 201); return; }
        const validTypes = ["general","insurance","accreditation","proof_of_address","other"];
        const resolvedType = validTypes.includes(document_type) ? document_type : "general";
        const { data: biz, error: bizErr } = await supabase.from("businesses").select("id").eq("user_id",userId).single();
        if (bizErr || !biz) { fail(res, "Business not found", 404); return; }
        const ext = file_name.split(".").pop()?.toLowerCase() ?? "pdf";
        const storagePath = `${userId}/${resolvedType}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const buffer = Buffer.from(file_data as string, "base64");
        const { error: uploadErr } = await supabase.storage.from(DOC_BUCKET).upload(storagePath, buffer, { contentType: mime_type, upsert: false });
        if (uploadErr) throw uploadErr;
        const { data: signedData } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(storagePath, 60*60*24*7);
        const file_url = signedData?.signedUrl ?? storagePath;
        const { data: doc, error: docErr } = await supabase.from("documents").insert({
          business_id: (biz as any).id, application_id: application_id??null,
          document_type: resolvedType, file_name, file_url: storagePath,
          file_size_bytes: buffer.byteLength, mime_type, status: "pending_review",
        }).select().single();
        if (docErr) throw docErr;
        ok(res, { ...doc, file_url }, 201);
        return;
      }

      // DELETE /api/member/documents/:id
      if (g1 === "documents" && g2 && !g3 && method === "DELETE") {
        if (!configured) { ok(res, { deleted: true }); return; }
        const { data: biz } = await supabase.from("businesses").select("id").eq("user_id",userId).single();
        if (!biz) { fail(res, "Business not found", 404); return; }
        const { data: doc } = await supabase.from("documents").select("file_url").eq("id",g2).eq("business_id",(biz as any).id).single();
        if (!doc) { fail(res, "Document not found", 404); return; }
        if (doc.file_url && !doc.file_url.startsWith("http")) {
          await supabase.storage.from(DOC_BUCKET).remove([doc.file_url]).catch(() => {});
        }
        const { error } = await supabase.from("documents").delete().eq("id",g2).eq("business_id",(biz as any).id);
        if (error) { fail(res, error.message); return; }
        ok(res, { deleted: true });
        return;
      }

      // GET /api/member/documents/:id/url
      if (g1 === "documents" && g2 && g3 === "url" && method === "GET") {
        if (!configured) { ok(res, { url: null }); return; }
        const { data: biz } = await supabase.from("businesses").select("id").eq("user_id",userId).single();
        if (!biz) { fail(res, "Business not found", 404); return; }
        const { data: doc } = await supabase.from("documents").select("file_url,file_name").eq("id",g2).eq("business_id",(biz as any).id).single();
        if (!doc) { fail(res, "Document not found", 404); return; }
        const { data: signed } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(doc.file_url, 3600);
        ok(res, { url: signed?.signedUrl??null, file_name: doc.file_name });
        return;
      }

      // GET /api/member/notifications
      if (g1 === "notifications" && !g2 && method === "GET") {
        if (!configured) { ok(res, []); return; }
        const { data: biz } = await supabase.from("businesses").select("id").eq("user_id",userId).single();
        if (!biz) { ok(res, []); return; }
        const { data, error } = await supabase.from("notifications")
          .select("id,title,body,is_read,link,created_at")
          .eq("business_id",(biz as any).id).eq("recipient_type","member")
          .order("created_at",{ascending:false}).limit(50);
        if (error) { fail(res, error.message); return; }
        ok(res, data ?? []);
        return;
      }

      // PATCH /api/member/notifications/read-all
      if (g1 === "notifications" && g2 === "read-all" && method === "PATCH") {
        if (configured) {
          const { data: biz } = await supabase.from("businesses").select("id").eq("user_id",userId).single();
          if (biz) await supabase.from("notifications").update({ is_read:true }).eq("business_id",(biz as any).id).eq("recipient_type","member").eq("is_read",false);
        }
        ok(res, { ok: true });
        return;
      }

      // PATCH /api/member/notifications/:id/read
      if (g1 === "notifications" && g2 && g3 === "read" && method === "PATCH") {
        if (configured) {
          const { data: biz } = await supabase.from("businesses").select("id").eq("user_id",userId).single();
          if (biz) await supabase.from("notifications").update({ is_read:true }).eq("id",g2).eq("business_id",(biz as any).id);
        }
        ok(res, { ok: true });
        return;
      }

      // GET /api/member/verification-checks
      if (g1 === "verification-checks" && method === "GET") {
        if (!configured) { ok(res, []); return; }
        const { data: biz } = await supabase.from("businesses").select("id").eq("user_id",userId).single();
        if (!biz) { ok(res, []); return; }
        const { data, error } = await supabase.from("verification_checks").select("check_type,status,checked_at").eq("business_id",(biz as any).id).order("check_type");
        if (error) { fail(res, error.message); return; }
        ok(res, data ?? []);
        return;
      }

      fail(res, "Member route not found", 404);
      return;
    }

    fail(res, "Not found", 404);
  } catch (e: any) {
    console.error("[api] unhandled error:", e?.message ?? e);
    fail(res, e?.message ?? "Internal server error");
  }
}
