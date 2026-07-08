import { logger } from "./logger";

const PATCHES = [
  `ALTER TABLE products DROP CONSTRAINT IF EXISTS products_interval_check`,
  `ALTER TABLE products ADD CONSTRAINT products_interval_check
     CHECK (interval IN ('one-time', 'weekly', 'monthly', 'quarterly', 'yearly', 'lifetime'))`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT`,
];

async function runViaManagementApi(projectRef: string, pat: string): Promise<void> {
  for (const query of PATCHES) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pat}`,
      },
      body: JSON.stringify({ query }),
    });
    const name = query.slice(0, 60).replace(/\s+/g, " ");
    if (res.ok) {
      logger.info({ patch: name }, "Migration patch applied");
    } else {
      const body = await res.text().catch(() => "");
      logger.warn({ patch: name, status: res.status, body }, "Migration patch skipped");
    }
  }
}

export async function runMigrations(): Promise<void> {
  const pat = process.env.SUPABASE_PAT;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!pat || !supabaseUrl) return;

  const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    logger.warn("SUPABASE_URL format not recognised — skipping migrations");
    return;
  }

  const projectRef = match[1];
  logger.info({ projectRef }, "Running startup migrations via Supabase Management API");
  await runViaManagementApi(projectRef, pat).catch((err) =>
    logger.warn({ err: err.message }, "Startup migrations failed"),
  );
}
