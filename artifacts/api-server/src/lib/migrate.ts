import { logger } from "./logger";

const PATCHES = [
  `ALTER TABLE products DROP CONSTRAINT IF EXISTS products_interval_check`,
  `ALTER TABLE products ADD CONSTRAINT products_interval_check
     CHECK (interval IN ('one-time', 'weekly', 'monthly', 'quarterly', 'yearly', 'lifetime'))`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT`,

  // Documents table — add review/status columns
  `ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_review'`,
  `ALTER TABLE documents ADD COLUMN IF NOT EXISTS admin_notes TEXT`,
  `ALTER TABLE documents ADD COLUMN IF NOT EXISTS expiry_date DATE`,
  `ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`,
  `ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_by TEXT`,

  // Expand document_type CHECK constraint to include proof_of_address and other
  `DO $$ BEGIN
    ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
    ALTER TABLE documents ADD CONSTRAINT documents_document_type_check
      CHECK (document_type IN ('general', 'insurance', 'accreditation', 'proof_of_address', 'other'));
  EXCEPTION WHEN OTHERS THEN NULL; END $$`,

  // Add status CHECK constraint
  `DO $$ BEGIN
    ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
    ALTER TABLE documents ADD CONSTRAINT documents_status_check
      CHECK (status IN ('pending_review', 'approved', 'rejected', 'expired'));
  EXCEPTION WHEN OTHERS THEN NULL; END $$`,
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
