import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkAdminAuth } from "../_lib/admin";
import { supabase, isSupabaseConfigured } from "../_lib/supabase";

const BUCKET = "product-images";

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.name === BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!checkAdminAuth(req.headers.authorization)) return res.status(401).json({ error: "Unauthorized" });

  const { data, type, name } = req.body || {};
  if (!data || !type) return res.status(400).json({ error: "data and type required" });

  if (!isSupabaseConfigured()) {
    return res.json({ url: "https://placehold.co/600x400/1a1a1a/ffffff?text=Image" });
  }

  try {
    await ensureBucket();

    const ext = (name as string || "").split(".").pop()?.toLowerCase() || type.split("/")[1] || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(data as string, "base64");

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType: type, upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return res.json({ url: urlData.publicUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Upload failed" });
  }
}
