# Supabase Setup Guide

Complete step-by-step instructions for connecting a fresh Supabase project to
this template. Run these steps once per clone.

---

## Prerequisites

- A [Supabase](https://supabase.com) account (free tier is sufficient to start)
- Your clone of this repository deployed or running locally

---

## Step 1 — Create a new Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose an **organisation** (create one if needed)
3. Enter a **project name** (e.g. `mybrand-prod`)
4. Set a strong **database password** — save it somewhere safe
5. Choose the **region** closest to your users
6. Click **Create new project** and wait ~60 seconds for provisioning

---

## Step 2 — Copy your API credentials

1. Go to **Project Settings → API**
2. Copy the following values — you will need them in Step 5:

| Credential | Where to find it | Environment variable |
|---|---|---|
| Project URL | API → Project URL | `SUPABASE_URL` / `VITE_SUPABASE_URL` |
| `anon` public key | API → Project API keys → anon | `VITE_SUPABASE_ANON_KEY` |
| `service_role` secret key | API → Project API keys → service_role | `SUPABASE_SERVICE_ROLE_KEY` |

> **Never** expose `service_role` to the browser or commit it to source control.
> It bypasses all Row Level Security and has full database access.

---

## Step 3 — Apply the migration

1. In your Supabase project, go to **SQL Editor** → **New query**
2. Open `supabase/migrations/001_initial_template_schema.sql` from this repo
3. Copy the entire file contents and paste into the SQL Editor
4. Click **Run** (or press `Ctrl+Enter`)

You should see: `Success. No rows returned`

### Verify the tables exist

Run this in the SQL Editor:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see all 9 tables:

```
access_links
app_settings
content_blocks
customers
events
messages
payments
products
team_members
```

---

## Step 4 — (Optional) Load seed data

The seed file adds generic demo products, customers, access links, and events
so the admin dashboard looks populated immediately after setup.

**Skip this step for production.** Run it only for development/staging clones.

1. Open `supabase/seed.sql` from this repo
2. Copy the entire file contents into Supabase → SQL Editor → New query
3. Click **Run**

---

## Step 5 — Configure environment variables

### Vercel deployment

In your Vercel project → **Settings → Environment Variables**, add:

| Variable | Value | Required |
|---|---|---|
| `SUPABASE_URL` | Your Supabase Project URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service_role secret key | ✅ |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Your anon public key | ✅ |
| `ADMIN_PASSWORD` | Strong password ≥ 16 chars | ✅ |

### Local development

Create `artifacts/signal-saas/.env.local` (not committed):

```bash
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

For testing server-side API routes locally with Vercel CLI, also create
a `.env` file in the project root:

```bash
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
ADMIN_PASSWORD=your-local-dev-password
```

---

## Step 6 — Set up your admin account

Admin authentication in this template uses a single `ADMIN_PASSWORD` environment
variable — **not** Supabase Auth. No Supabase user account is created.

1. Set `ADMIN_PASSWORD` to a strong password (≥ 16 chars, mix of characters)
2. Deploy / restart the application
3. Go to `https://your-domain.com/admin` and sign in with that password

That's it — no email verification, no auth flow to configure.

---

## Step 7 — Verify Row Level Security

Run the following in Supabase → SQL Editor to confirm RLS is enabled on every
table:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All 9 tables should show `rowsecurity = true`.

To test the anon read policy for products:

```sql
-- Temporarily switch to anon role to test policies
SET LOCAL ROLE anon;

-- Should return only is_active = TRUE rows
SELECT id, name, is_active FROM products;

-- Should return 0 rows (no anon read on customers)
SELECT * FROM customers;

RESET ROLE;
```

---

## Step 8 — (Optional) Enable Supabase Auth for customers

The current app uses **server-side session verification** (via payment provider
session IDs) to deliver access links — no customer login is required.

If you want customers to log in to view their access links and account details,
enable Supabase Auth:

1. Go to **Authentication → Providers** and enable **Email** (magic link or password)
2. Update redirect URLs: **Authentication → URL Configuration**
   - Site URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/account/**`
3. The RLS policies in the migration already include `authenticated` role
   policies — they are dormant until Auth is enabled

---

## Resetting the database (for a new clone)

To start fresh on an existing Supabase project:

```sql
-- Drop all tables (run in SQL Editor)
DROP TABLE IF EXISTS
  app_settings, team_members, messages, content_blocks,
  events, access_links, payments, customers, products
CASCADE;

-- Then re-run 001_initial_template_schema.sql
-- Then optionally re-run seed.sql
```

Or simply create a new Supabase project and start from Step 1.

---

## Tables reference

| Table | Purpose | API module |
|---|---|---|
| `products` | Subscription tiers | `/api/admin/plans`, `/api/plans` |
| `customers` | Paying members | `/api/admin/subscribers` |
| `payments` | Payment records | Written by webhooks |
| `access_links` | Invite URLs for members | `/api/admin/links`, `/api/access` |
| `events` | Analytics + activity log | `/api/track`, `/api/admin/overview`, `/api/admin/activity` |
| `content_blocks` | Posts / announcements | *(admin content module — API coming soon)* |
| `messages` | Customer enquiries | *(admin messages module — API coming soon)* |
| `team_members` | Admin / staff records | *(admin team module — API coming soon)* |
| `app_settings` | DB-backed config | *(admin settings module — API coming soon)* |

See `CONFIG.md → Backend Architecture` for the full module-to-table mapping.
