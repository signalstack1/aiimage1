---
name: SignalStack "Master Template" scaffold modules
description: Why /services, /book, /gallery, /contact, /api/services, /api/gallery, /api/bookings, /api/messages exist but 404/no-op in this project
---

The signal-saas web app started from a generic "Master Template" business
scaffold (see `artifacts/signal-saas/src/config/app.ts` — `adminModules`
and `BUSINESS_PRESETS`). This business (trading signals SaaS) only enables
overview/settings/activity/analytics/products/customers/access; the
services/bookings/leads/orders/reviews/gallery/messages/content/team
modules are toggled off and their admin routes are blocked via
`ModuleRoute` — but the *public-facing* pages for some of these modules
(`/services`, `/book`, `/gallery`, `/contact`) are still reachable and
linked, even though `artifacts/api-server` never implemented the
corresponding endpoints (`/api/services`, `/api/gallery`, `/api/bookings`,
`/api/messages`). They render graceful empty/error states rather than
crashing.

**Why this matters:** don't assume 404s from these specific endpoints are
bugs — they're an intentional scaffold gap for this business type. When
mirroring web ↔ mobile (or any other client) for this project, match the
*same* incomplete behavior for parity rather than "fixing" it by
inventing new backend routes, unless the user asks to actually wire up
one of these modules.

**How to apply:** if asked to implement real services/bookings/gallery/
messages functionality, build the actual api-server routes first (they
don't exist yet), then wire the frontend(s) to them — don't just add
frontend code expecting existing routes.
