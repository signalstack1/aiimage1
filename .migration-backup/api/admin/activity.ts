import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkAdminAuth } from "../_lib/admin";
import { supabase, isSupabaseConfigured } from "../_lib/supabase";

function eventLabel(type: string, productName: string | null): string {
  const p = productName || "a product";
  switch (type) {
    case "product_view":    return `Viewed ${p}`;
    case "purchase_click":  return `Clicked checkout for ${p}`;
    case "product_publish": return `Published ${p}`;
    case "member_join":     return `New member joined ${p}`;
    default:                return type;
  }
}

const MOCK_EVENTS = Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  event_type: ["product_view", "purchase_click", "member_join", "product_publish", "product_view", "product_view"][i % 6],
  label: "",
  plan_name: ["Pro", "Starter", "Lifetime"][i % 3],
  created_at: new Date(Date.now() - i * 15 * 60000).toISOString(),
})).map((e) => ({ ...e, label: eventLabel(e.event_type, e.plan_name) }));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!checkAdminAuth(req.headers.authorization)) return res.status(401).json({ error: "Unauthorized" });

  const type = (req.query.type as string) || "all";
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  if (!isSupabaseConfigured()) {
    const filtered = type === "all" ? MOCK_EVENTS : MOCK_EVENTS.filter((e) => e.event_type === type);
    return res.json({
      events: filtered.slice(offset, offset + limit),
      total: filtered.length,
    });
  }

  try {
    let query = supabase
      .from("events")
      .select("id, event_type, product_name, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (type !== "all") query = query.eq("event_type", type);

    const { data, count, error } = await query;
    if (error) {
      const filtered = type === "all" ? MOCK_EVENTS : MOCK_EVENTS.filter((e) => e.event_type === type);
      return res.json({ events: filtered.slice(offset, offset + limit), total: filtered.length });
    }

    const events = (data || []).map((e) => ({
      id: e.id,
      event_type: e.event_type,
      label: eventLabel(e.event_type, e.product_name),
      plan_name: e.product_name,   // keep field name for frontend compatibility
      created_at: e.created_at,
    }));

    return res.json({ events, total: count ?? 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
