---
name: TVC Secured architecture
description: Production stack — Supabase + Vercel only; Replit is builder only. All API logic lives in Vercel Serverless Functions.
---

## Production stack

- **Supabase** — PostgreSQL DB + Auth (Supabase JWTs for members)
- **Vercel** — hosts the React+Vite frontend AND all API routes via Serverless Functions
- **Replit** — builder/IDE only; the Express API server (artifacts/api-server) is NOT used in production

## API function layout

`artifacts/signal-saas/api/` (relative to Vercel root dir `artifacts/signal-saas`):
- `_lib/supabase.ts` — Supabase service-role client (uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`)
- `_lib/auth.ts` — admin token helpers (base64 `password|timestamp` with `ss_admin_` prefix)
- `[...path].ts` — catch-all handler for ALL `/api/*` routes (public, admin, member)

## vercel.json

- `buildCommand`: `pnpm run build`
- `outputDirectory`: `dist`
- `functions`: `{ "api/[...path].ts": { "runtime": "@vercel/node@3" } }`
- `rewrites`: `[{ "source": "/((?!api/).*)", "destination": "/index.html" }]` — SPA fallback, excludes /api/*

## Required Vercel env vars

| Var | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL (for API functions) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (for API functions — server-side only) |
| `ADMIN_PASSWORD` | Admin panel password |
| `VITE_SUPABASE_URL` | Same URL, exposed to frontend for Supabase Auth |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key for frontend auth |

## Auth patterns

- **Members**: Supabase Auth JWT; frontend uses `supabase.auth.signInWithPassword()`. API verifies via `supabase.auth.getUser(token)`.
- **Admin**: Custom token = base64(`ADMIN_PASSWORD|timestamp`) prefixed with `ss_admin_`. Valid 30 days. Stored in `sessionStorage`.

## Frontend API calls

- All files use `const BASE_URL = import.meta.env.VITE_API_URL || ""` — on Vercel this is `""` so calls are relative `/api/...`
- Member calls use `fetchWithAuth()` from `useAuth.tsx` — auto-injects Supabase Bearer token, auto-refreshes on 401
- Admin calls use inline `adminFetch()` — injects `admin_token` from sessionStorage

## Body size

`api/[...path].ts` exports `config = { api: { bodyParser: { sizeLimit: "20mb" } } }` to handle base64 file uploads up to 10MB.

**Why:** 10MB binary → ~13.3MB base64; default Vercel body limit would reject uploads.

**How to apply:** Always keep this config export in the catch-all function if file uploads are needed.
