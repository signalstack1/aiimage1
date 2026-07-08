import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, isSupabaseConfigured } from "./_lib/supabase";

// Returns the active access links shown to customers after payment.
// No session verification — payments are handled externally (Stripe payment links,
// Whop, Gumroad, etc.). Access control is enforced by Discord/Telegram invite management.

const MOCK_LINKS = [
  { id: "link-discord", platform: "discord", label: "Members Community", invite_url: "https://discord.gg/replace-me" },
  { id: "link-telegram", platform: "telegram", label: "Updates Channel", invite_url: "https://t.me/replace-me" },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (!isSupabaseConfigured()) {
    return res.json({ access_links: MOCK_LINKS, is_mock: true });
  }

  const { data, error } = await supabase
    .from("access_links")
    .select("id, platform, label, invite_url")
    .order("created_at", { ascending: true });

  if (error) return res.json({ access_links: MOCK_LINKS, is_mock: true });
  return res.json({ access_links: data || [], is_mock: false });
}
