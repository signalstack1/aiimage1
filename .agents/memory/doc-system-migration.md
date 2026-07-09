---
name: Document system migration
description: How the documents table migration works, and how to handle the missing-column period.
---

# Document system migration

## The rule
Any time new columns are added to the Supabase `documents` table, the API routes that SELECT or INSERT those columns **must** include a graceful fallback, because the migration may not have run on the live DB yet.

**Why:** `SUPABASE_PAT` is required for the automatic migrate.ts system to run DDL against Supabase. If that secret isn't set (common on a fresh Replit environment), migrations are silently skipped and the live Supabase schema lags behind the code.

**How to apply:** In API routes, catch PostgREST error code `42703` (undefined column) and retry the query without the new columns, returning sensible defaults (`null` / `"pending_review"`) for the missing fields.

## New columns added (documents table)
- `status TEXT NOT NULL DEFAULT 'pending_review'` — CHECK: pending_review | approved | rejected | expired
- `admin_notes TEXT`
- `expiry_date DATE`
- `reviewed_at TIMESTAMPTZ`
- `reviewed_by TEXT`

## How to apply the migration manually
1. Open the Supabase dashboard → SQL Editor
2. Run the migration block from `VIA_SUPABASE_SETUP.sql` (the ALTER TABLE statements at the bottom)
3. OR: add `SUPABASE_PAT` as a Replit secret; migrate.ts will run the patches on next API server startup

## Files
- `VIA_SUPABASE_SETUP.sql` — full schema + migration block
- `artifacts/api-server/src/lib/migrate.ts` — PATCHES array; runs if SUPABASE_PAT is set
- `artifacts/api-server/src/routes/member.ts` — GET/POST with 42703 fallback
