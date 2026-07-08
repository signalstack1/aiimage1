/**
 * POST /api/track
 * Public endpoint — records product_view and purchase_click events.
 * No auth required. No PII collected. Silently succeeds to never break UX.
 * Accepts plan_id / plan_name for backward compatibility with existing frontend calls.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, isSupabaseConfigured } from "./_lib/supabase";

const ALLOWED: Record<string, true> = {
  product_view: true,
  purchase_click: true,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { event_type, plan_id, plan_name, product_id, product_name } = req.body || {};

  if (!ALLOWED[event_type]) {
    return res.status(400).json({ error: "Invalid event_type" });
  }

  if (!isSupabaseConfigured()) return res.json({ ok: true });

  try {
    await supabase.from("events").insert({
      event_type,
      product_id: product_id || plan_id || null,
      product_name: product_name || plan_name || null,
      actor: "anon",
      meta: {},
    });
  } catch {
    // swallow — tracking failures must never affect the user
  }

  return res.json({ ok: true });
}
