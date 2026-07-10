# TVC Secured — Environment Variables

> **Never put actual secret values in this file. Names only.**
> Configure all variables in the Vercel project dashboard and in Replit Secrets for local development.

---

## Production Variables (Vercel)

These must be set in the **Vercel project → Settings → Environment Variables** dashboard.

### Supabase — Server-Side (API Functions)

| Variable | Public / Secret | Required | Description |
|---|---|---|---|
| `SUPABASE_URL` | Secret | ✅ Yes | Your Supabase project URL. Used by Vercel API functions (server-side) to connect to Supabase with the service role. |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ **Secret** | ✅ Yes | Supabase service role key. **Never expose to the browser or `VITE_*` variables.** Used only in Vercel serverless functions. |

### Supabase — Client-Side (Frontend)

| Variable | Public / Secret | Required | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Public | ✅ Yes | Your Supabase project URL. Safe to expose to the browser. Used by the React frontend for Supabase Auth. |
| `VITE_SUPABASE_ANON_KEY` | Public | ✅ Yes | Supabase anon/publishable key. Safe to expose to the browser. This is the public key, not the service role key. |

> **Note:** `SUPABASE_URL` and `VITE_SUPABASE_URL` are the same value but configured separately — one for server-side functions, one for the browser bundle.

### Admin

| Variable | Public / Secret | Required | Description |
|---|---|---|---|
| `ADMIN_PASSWORD` | ⚠️ **Secret** | ✅ Yes | The admin panel password. Used only server-side in the Vercel API function to verify admin login. Never exposed to the browser. |

---

## Development-Only Variables (Replit Secrets)

These are only needed for running the project locally in Replit. They mirror the production values but are never committed to the repository.

| Variable | Used By | Description |
|---|---|---|
| `SUPABASE_URL` | api-server (dev) | Same Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | api-server (dev) | Same service role key for local API testing |
| `SUPABASE_ANON_KEY` | api-server (dev) | Supabase anon key for dev testing |
| `VITE_SUPABASE_URL` | signal-saas (dev) | Same Supabase URL for local frontend dev |
| `VITE_SUPABASE_ANON_KEY` | signal-saas (dev) | Same anon key for local frontend dev |
| `ADMIN_PASSWORD` | api-server (dev) | Same admin password for local admin testing |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Replit only | Replit object storage — used for dev file testing only, not in production |
| `PRIVATE_OBJECT_DIR` | Replit only | Replit object storage — dev only |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Replit only | Replit object storage — dev only |

> **Note:** The `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, and `PUBLIC_OBJECT_SEARCH_PATHS` Replit secrets are Replit infrastructure variables. They are not used in production — the production application uses Supabase Storage for all file handling.

---

## Variable That Must NOT Exist in Production

| Variable | Why |
|---|---|
| `VITE_API_URL` | Must NOT be set on Vercel. When unset, it defaults to `""` (empty string), which makes all frontend API calls go to relative `/api/…` paths — hitting the Vercel functions on the same domain. If set to a Replit URL, it would create a Replit production dependency. |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Must NEVER exist. The service role key must never be exposed to the browser. |

---

## Vercel Setup Checklist

When setting up the Vercel project for the first time or after a transfer:

- [ ] Set `SUPABASE_URL` → your Supabase project URL
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` → from Supabase → Project Settings → API → service_role key
- [ ] Set `VITE_SUPABASE_URL` → same Supabase project URL
- [ ] Set `VITE_SUPABASE_ANON_KEY` → from Supabase → Project Settings → API → anon/public key
- [ ] Set `ADMIN_PASSWORD` → your chosen admin password (strong, not guessable)
- [ ] Confirm `VITE_API_URL` is NOT set (leave blank / absent)
- [ ] Confirm Vercel root directory is set to `artifacts/signal-saas`
- [ ] Confirm build command: `pnpm run build`
- [ ] Confirm output directory: `dist`

---

## Supabase Setup Checklist

When connecting a new Supabase project:

- [ ] Run `scripts/supabase-schema.sql` in the Supabase SQL editor to create all tables and functions
- [ ] Create storage bucket `member-documents` (set to **private**)
- [ ] Enable RLS on all tables (the API functions bypass RLS using service role; direct client access is blocked)
- [ ] Confirm Auth → Email is enabled and "Confirm email" matches your desired flow
- [ ] Copy `Project URL` and `anon` key for `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- [ ] Copy `service_role` key for `SUPABASE_SERVICE_ROLE_KEY` — **keep this secret**
