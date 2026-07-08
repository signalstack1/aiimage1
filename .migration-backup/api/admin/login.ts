import type { VercelRequest, VercelResponse } from "@vercel/node";
import { makeToken, ADMIN_PASSWORD } from "../_lib/admin";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Invalid password" });
  return res.json({ token: makeToken() });
}
