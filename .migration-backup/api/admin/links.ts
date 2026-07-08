import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkAdminAuth } from "../_lib/admin";
import { supabase, isSupabaseConfigured } from "../_lib/supabase";

const MOCK_LINKS = [
  { id: "link-discord",  platform: "discord",  label: "Members Community", invite_url: "https://discord.gg/example" },
  { id: "link-telegram", platform: "telegram", label: "Updates Channel",   invite_url: "https://t.me/example" },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkAdminAuth(req.headers.authorization)) return res.status(401).json({ error: "Unauthorized" });

  // id can be passed as a query param for PATCH/DELETE (merged from [id].ts)
  const id = req.query.id as string | undefined;

  if (req.method === "GET") {
    if (!isSupabaseConfigured()) return res.json(MOCK_LINKS);
    const { data, error } = await supabase.from("access_links").select("*").order("created_at");
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  if (req.method === "POST") {
    const { platform, label, invite_url } = req.body || {};
    if (!platform || !label || !invite_url) return res.status(400).json({ error: "platform, label, invite_url required" });
    if (!isSupabaseConfigured()) return res.status(201).json({ id: `link-${Date.now()}`, platform, label, invite_url });
    const { data, error } = await supabase.from("access_links").insert({ platform, label, invite_url }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  if (req.method === "DELETE" && id) {
    if (!isSupabaseConfigured()) return res.json({ deleted: true });
    const { error } = await supabase.from("access_links").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ deleted: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
