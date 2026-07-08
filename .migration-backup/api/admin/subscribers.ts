import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkAdminAuth } from "../_lib/admin";
import { supabase, isSupabaseConfigured } from "../_lib/supabase";

const MOCK = [
  { id: "sub-1", email: "alex@example.com", plan: "Pro", plan_id: "plan-pro", status: "active", subscribed_at: "2024-11-15T10:00:00Z" },
  { id: "sub-2", email: "maria@example.com", plan: "Starter", plan_id: "plan-starter", status: "active", subscribed_at: "2024-12-01T08:30:00Z" },
  { id: "sub-3", email: "james@example.com", plan: "Lifetime", plan_id: "plan-lifetime", status: "active", subscribed_at: "2024-10-05T14:00:00Z" },
  { id: "sub-4", email: "priya@example.com", plan: "Pro", plan_id: "plan-pro", status: "active", subscribed_at: "2025-01-10T09:15:00Z" },
  { id: "sub-5", email: "tom@example.com", plan: "Starter", plan_id: "plan-starter", status: "cancelled", subscribed_at: "2024-09-20T11:00:00Z" },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!checkAdminAuth(req.headers.authorization)) return res.status(401).json({ error: "Unauthorized" });
  if (!isSupabaseConfigured()) return res.json(MOCK);

  const { data, error } = await supabase
    .from("customers")
    .select("id, email, plan_name, plan_id, status, subscribed_at, expires_at")
    .order("subscribed_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json((data || []).map((s: any) => ({ ...s, plan: s.plan_name })));
}
