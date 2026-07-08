---
name: Supabase schema and API table names
description: Canonical table names, route paths, and response-shape compatibility rules for the SignalStack backend.
---

## Canonical Supabase table names (migration 001)
- `products` (was `plans`)
- `customers` (was `subscribers`)
- `events` (was `page_events`)
- `access_links` (unchanged)
- `payments` (unchanged)
- `content_blocks`, `messages`, `team_members`, `app_settings` (new, no API yet)

## Column renames in customers table
- `stripe_session_id` → `external_ref` (generic checkout session ref)
- `stripe_subscription_id` → `subscription_ref` (for cancellation webhooks)

## Column renames in events table
- `plan_id` → `product_id`
- `plan_name` → `product_name`

## API route paths — do NOT rename these files
The frontend calls these routes; file names must stay as-is:
- `/api/admin/plans` → queries `products` table internally
- `/api/admin/subscribers` → queries `customers` table internally
- `/api/admin/activity` → queries `events` table internally

## JSON response shape — keep for frontend compatibility
`api/admin/overview.ts` and `api/admin/activity.ts` return `plan_name` as the
field name even though the DB column is now `product_name`. Remapped in code:
```ts
plan_name: e.product_name,   // keep field name for frontend compatibility
```

**Why:** The frontend admin pages (dashboard.tsx, analytics.tsx, activity.tsx)
all read `item.plan_name` from the API response. Renaming the JSON key would
silently break those displays without a TypeScript error.

**How to apply:** If you ever add a new event query endpoint, return `plan_name`
(not `product_name`) in the response until frontend pages are updated.
