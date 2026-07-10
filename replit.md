# TVC Secured

A UK tradesperson verification SaaS. Tradespeople apply, pay a monthly fee, and get independently verified with a unique TVC number, public profile, and digital badge. Homeowners can search any TVC number to verify a tradesperson's credentials.

---

## Architecture — READ THIS FIRST

> **Replit is the development environment only. It is not a production dependency.**

| Layer | Service |
|---|---|
| Database, Auth, Storage | **Supabase** |
| Frontend + Serverless API | **Vercel** |
| Source control | **GitHub** |
| Development / building | **Replit** (this environment) |

The live business runs entirely on Supabase + Vercel. If this Replit project is stopped or deleted, production continues unaffected.

See `ARCHITECTURE.md` for the full architecture specification.
See `ENVIRONMENT_VARIABLES.md` for all required env vars (names only — no secret values).

---

## Run & Operate

```bash
# Frontend dev server (React + Vite)
pnpm --filter @workspace/signal-saas run dev

# API server — LOCAL TESTING ONLY, not used in production
pnpm --filter @workspace/api-server run dev

# Full typecheck
pnpm run typecheck

# Build
pnpm --filter @workspace/signal-saas run build
```

---

## Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS, Wouter (routing), TanStack Query
- **Backend (production)**: Vercel Serverless Functions (`api/[...path].ts`)
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth (JWT for members; custom token for admin)
- **Storage**: Supabase Storage (`member-documents` bucket)
- **Monorepo**: pnpm workspaces, TypeScript 5.9, Node.js 24

---

## Where Things Live

```
artifacts/signal-saas/          ← Main frontend project (deploys to Vercel)
  src/
    pages/                      ← All pages (home, join, verify, dashboard/*, admin/*)
    components/                 ← Shared UI components
    hooks/useAuth.tsx           ← Auth context (Supabase + member data)
    lib/supabase.ts             ← Frontend Supabase client (anon key, browser-safe)
    config/app.ts               ← All brand copy, feature toggles
  api/
    _lib/supabase.ts            ← Server-side Supabase client (service role key)
    _lib/auth.ts                ← Admin token helpers
    [...path].ts                ← Catch-all Vercel serverless function (all /api/* routes)
  vercel.json                   ← Vercel deployment config

artifacts/api-server/           ← Express server — LOCAL DEVELOPMENT ONLY
scripts/supabase-schema.sql     ← Full Supabase DB schema (run once in Supabase SQL editor)
ARCHITECTURE.md                 ← Permanent architecture reference
ENVIRONMENT_VARIABLES.md        ← All env vars documented (names only, no values)
```

---

## Architecture Decisions

- **Vercel catch-all function** (`api/[...path].ts`) handles all API routes instead of individual function files — simpler to maintain, all logic in one place with shared Supabase client.
- **`VITE_API_URL` must NOT be set on Vercel** — when unset it defaults to `""` and all `/api/…` calls are relative, hitting the Vercel functions on the same domain.
- **Service role key is server-side only** — `SUPABASE_SERVICE_ROLE_KEY` is only used in `api/_lib/supabase.ts`, never in `VITE_*` variables, never in the browser bundle.
- **Admin auth is separate from member auth** — admin uses a custom `ss_admin_` token (base64 password+timestamp); member uses Supabase JWTs. The two systems are fully independent.
- **The Express api-server is for local dev only** — its routes mirror the Vercel function exactly, so local testing works. Production never calls it.

---

## Product

**For tradespeople:**
- Apply at `/join` — fill in details, create account, pay £20/month
- Upload verification documents (insurance, accreditations, proof of address)
- Receive a TVC number (e.g. TVC1042) once approved
- Access member dashboard: view checks, download badge, manage profile

**For homeowners:**
- Search any TVC number at `/verify` — instant public profile
- See which of the 6 checks are verified, unverified, or pending

**For admin:**
- Admin panel at `/admin/login` (password-protected)
- Review applications, run verification checks, assign TVC numbers
- Approve/reject documents, add notes, send notifications
- Manage leads, payment links, member profiles

---

## User Preferences

- Replit is the builder only — never introduce a Replit production dependency
- All persistent data goes in Supabase
- All secrets (service role key, admin password) stay server-side only
- `VITE_API_URL` must never be set in production Vercel config

---

## Gotchas

- The `@replit` comments in some UI component files (e.g. `badge.tsx`, `button.tsx`) are just code style annotations from the template — they have no runtime effect.
- `pending_payment` is a valid application status (created during join but before admin confirms payment). The member dashboard shows a payment banner for this state.
- File uploads are base64-encoded in the request body — the Vercel function config raises the body limit to 20MB to handle up to 10MB files.
- Supabase's `next_via_number()` function generates sequential TVC numbers. If that RPC call fails, the API falls back to computing `MAX(existing) + 1`.
- The `member-documents` storage bucket must be **private** — documents are accessed via signed URLs (1-hour expiry) generated server-side.

---

## Pointers

- Full DB schema: `scripts/supabase-schema.sql`
- Architecture rules: `ARCHITECTURE.md`
- Env var reference: `ENVIRONMENT_VARIABLES.md`
- All brand copy/config: `artifacts/signal-saas/src/config/app.ts`
- All API routes: `artifacts/signal-saas/api/[...path].ts`
