---
name: VIA project patterns
description: Key conventions for the VIA Secured project — auth, routing, storage, DB, styling.
---

# VIA Secured — Key Conventions

## Auth
- **Admin:** `ADMIN_PASSWORD` env var; token prefix `ss_admin_`; stored in `sessionStorage("admin_token")`. All admin API routes use `requireAdmin` middleware from `api-server/src/middleware/auth.ts`.
- **Member:** Supabase JWT; stored in Supabase Auth. Member API routes use `requireMember` middleware.
- **No Stripe.** Payment links are URL-only strings stored in the DB.

## BASE_URL pattern (frontend)
```ts
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
// Then: fetch(`${BASE}/api/...`)
```

## Storage
- Bucket: `member-documents` (private, created via `ensureDocBucket()` in member.ts)
- Member files: `${userId}/${docType}/${timestamp}-${random}.${ext}`
- Join-flow files: `applications/${applicationId}/${docType}/...`
- Signed URL duration: 7 days

## Supabase configuration
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` used server-side (api-server)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` used client-side (signal-saas)
- `isSupabaseConfigured()` guard in API routes returns mock data when env vars absent

## Styling
- VIA primary green: `HSL 142 71% 45%` — `hsl(142, 71%, 45%)`
- Tailwind class: `gradient-brand` on CTA buttons
- Dark navy background: `#0d1117` / `bg-[hsl(222,47%,11%)]`

## Document types
`general` | `insurance` | `accreditation` | `proof_of_address` | `other`

## Document statuses
`pending_review` | `approved` | `rejected` | `expired`
