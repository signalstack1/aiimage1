# TVC Secured — Architecture

> **This document is the authoritative architecture reference for this project.**
> Every future AI session, developer, and contributor must read and follow it.

---

## Production Architecture

| Layer | Service | Role |
|---|---|---|
| **Database & Auth** | Supabase | Single source of truth for all persistent data |
| **Frontend & API** | Vercel | Hosts the React+Vite app and all serverless API functions |
| **Source control** | GitHub | Canonical code repository; Vercel deploys from here |
| **Development** | Replit | Coding environment only — NOT a production dependency |

---

## The Golden Rule

> **The live business must continue operating if Replit is unavailable, stopped, or deleted.**

This means:
- No production data stored in Replit
- No production API hosted only on Replit
- No production URL that points to a Replit dev server
- No Replit-specific storage or database products used in production
- The Express API server (`artifacts/api-server`) is **development/testing only** — it is never called in production

---

## Supabase — Production Backend

Supabase owns all persistent production state:

- **PostgreSQL database** — all business data (businesses, applications, documents, verification_checks, notifications, admin_notes, payment_links, leads, events)
- **Supabase Auth** — all user account creation, session management, and JWT issuance for member logins
- **Supabase Storage** — uploaded verification documents (`member-documents` bucket, private)
- **Database functions** — e.g. `next_via_number()` for sequential TVC number generation

Connection pattern:
- **Frontend client** (`src/lib/supabase.ts`): uses `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — browser-safe, public values
- **API functions** (`api/_lib/supabase.ts`): uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — server-side only, never exposed to browser

---

## Vercel — Production Frontend & API

Vercel serves the complete production application:

- **React+Vite SPA** built from `artifacts/signal-saas/` and served from `dist/`
- **Serverless API functions** in `artifacts/signal-saas/api/` — handle all `/api/*` requests
- **SPA routing** — `vercel.json` rewrite `/((?!api/).*)` → `/index.html` ensures deep links work

### API Function Layout

```
artifacts/signal-saas/api/
├── _lib/
│   ├── supabase.ts     — Supabase service-role client (server-side only)
│   └── auth.ts         — Admin token creation and verification
└── [...path].ts        — Catch-all handler for all /api/* routes
```

### Route Groups in the Catch-All

| Prefix | Auth Required | Description |
|---|---|---|
| `/api/via/verify/:viaNumber` | None | Public TVC number lookup |
| `/api/via/apply` | None | Application submission |
| `/api/via/applications/:id/documents` | None | Document upload during join |
| `/api/payment-links` | None | Public payment link retrieval |
| `/api/admin/*` | Admin token | Full admin panel operations |
| `/api/member/*` | Supabase JWT | Member dashboard operations |

### vercel.json (key settings)

```json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": "dist",
  "functions": {
    "api/[...path].ts": { "runtime": "@vercel/node@3" }
  },
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

---

## GitHub — Source Repository

- All code is committed to GitHub
- Vercel is connected to the GitHub repository for automatic deployments
- Replit pulls from / pushes to the same repository

---

## Replit — Development Environment Only

Replit is used for:
- AI-assisted development and coding
- Local testing and debugging
- Running the development preview of the frontend (`vite dev`)
- Running the Express API server for local testing only

Replit is **NOT** used for:
- Production database storage
- Production API hosting
- Production file/image storage
- Serving production traffic
- Any functionality the live business depends on

The Express API server in `artifacts/api-server/` is a development convenience only. All equivalent logic exists in the Vercel serverless function and is what runs in production.

---

## Authentication Architecture

### Member authentication
- Users are created in **Supabase Auth** via `supabase.auth.admin.createUser()` during the join flow
- Login uses `supabase.auth.signInWithPassword()` — Supabase issues a JWT
- The JWT (access token) is passed as `Authorization: Bearer <token>` to all `/api/member/*` calls
- The Vercel function verifies the token via `supabase.auth.getUser(token)` server-side
- Token refresh is handled automatically by the frontend `fetchWithAuth` wrapper

### Admin authentication
- A single shared admin password (`ADMIN_PASSWORD` env var) is used
- Login returns a custom token: base64(`password|timestamp`) prefixed with `ss_admin_`
- Token is stored in `sessionStorage` (not `localStorage`) — cleared on tab close
- Valid for 30 days. No refresh — re-login required when expired.

---

## Security Rules

1. **`SUPABASE_SERVICE_ROLE_KEY`** — server-side Vercel function only. Never in `VITE_*` vars, never in frontend code, never in browser bundles.
2. **`ADMIN_PASSWORD`** — server-side Vercel function only. Same rule as above.
3. **`VITE_SUPABASE_URL`** — public/safe. This is the Supabase project URL (not a secret).
4. **`VITE_SUPABASE_ANON_KEY`** — public/safe. This is the Supabase publishable key designed for client use.
5. Row Level Security (RLS) should be configured in Supabase for all tables that members can access directly. The API functions use the service role key and bypass RLS — this is intentional and secure because the function enforces its own auth checks before every query.

---

## Future Development Rules

Before implementing any new feature, determine where it belongs:

| Need | Where it goes |
|---|---|
| New UI / page | `artifacts/signal-saas/src/` → deploys to Vercel |
| New API endpoint | `artifacts/signal-saas/api/[...path].ts` → deploys to Vercel |
| New database table / column | Supabase SQL editor or migration script |
| Authentication | Supabase Auth (already configured) |
| File/image storage | Supabase Storage |
| Database automation | Supabase database function or trigger |
| Development/testing only | Replit / api-server — must NOT become a production dependency |

---

## Handover / Sale Readiness

This project is fully transferable. A buyer needs:

1. **GitHub** — repository access (fork or transfer)
2. **Vercel** — project connected to the GitHub repo with environment variables set (see `ENVIRONMENT_VARIABLES.md`)
3. **Supabase** — project transfer or export + re-import of database and storage
4. **Domain** — DNS transfer to the new Vercel deployment
5. **Payment links** — transfer of Stripe/payment account or update URLs in the admin payment-links panel

The buyer does **not** need:
- Access to the original Replit account
- Access to the original Replit project
- Any Replit credentials or workspace

---

## Database Schema Summary

Tables: `businesses`, `applications`, `documents`, `verification_checks`, `notifications`, `admin_notes`, `payment_links`, `leads`, `events`

Functions: `next_via_number()` — generates sequential TVC numbers (TVC1001, TVC1002, …)

Storage: `member-documents` bucket (private) — applicant verification documents

See `scripts/supabase-schema.sql` for the full schema definition.
