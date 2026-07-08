# SignalStack — Clone & Configure Guide

This is the master white-label template. Clone once, configure for any subscription business.  
All branding, copy, modules, entity names, and access control are controlled from a **single file**:

```
artifacts/signal-saas/src/config/app.ts
```

No other file needs to touch for a standard rebrand.

---

## Step 1 — Clone the repository

```bash
git clone https://github.com/your-org/signalstack-template.git my-new-business
cd my-new-business
pnpm install
```

Rename the remote before pushing your first commit:

```bash
git remote set-url origin https://github.com/your-org/my-new-business.git
git push -u origin main
```

---

## Step 2 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a region close to your users, set a strong database password
3. Wait for provisioning (~60 s)
4. Go to **Project Settings → API** and copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon / public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never expose to browser)

### Apply the database schema

Copy the full SQL from `supabase/migrations/001_initial_template_schema.sql` and run it in **Supabase → SQL Editor**. Then optionally seed demo data from `supabase/seed.sql`.

Key tables:

| Table | Purpose |
|---|---|
| `products` | Subscription tiers with `payment_url` for buy button redirect |
| `customers` | Members managed manually via admin panel |
| `access_links` | Discord / Telegram invite links shown on success page |
| `events` | Analytics (views, purchase clicks) |
| `content_blocks` | Announcements and posts (optional module) |
| `messages` | Contact form submissions (optional module) |

---

## Step 3 — Set environment variables

### Vercel (frontend + serverless functions)

| Variable | Where to get it | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon key | ✅ |
| `SUPABASE_URL` | Same value as `VITE_SUPABASE_URL` — used by serverless functions | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key | ✅ |
| `ADMIN_PASSWORD` | Choose any strong password (min 16 chars) | ✅ |

No payment provider API keys are required. Payments are handled via external URLs stored on each product (Stripe payment links, Whop checkout pages, Gumroad, etc.). The buy button simply redirects to `payment_url`.

### Local development (`.env.local` in `artifacts/signal-saas/`)

```bash
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

Server-side vars are not needed locally unless you're testing API routes with Vercel CLI.

---

## Step 4 — Rebrand (`app.ts` quick-start)

Open `artifacts/signal-saas/src/config/app.ts` and update the top section:

```ts
appName:      "YourBrand",
tagline:      "Your one-line value prop",
description:  "Meta description for SEO and og:image",
supportEmail: "help@yourbrand.com",
legalName:    "YourBrand Ltd",
businessType: "your service type",   // used in disclaimer copy
```

### Accent colour (optional)

```ts
primaryColor: "270 70% 55%",   // HSL without hsl() — null keeps default cyan
```

| Colour | HSL value |
|---|---|
| Cyan (default) | `"199 89% 48%"` |
| Purple | `"270 70% 55%"` |
| Green | `"142 76% 36%"` |
| Orange | `"25 95% 53%"` |
| Rose | `"346 77% 49%"` |

### HTML meta tags

Update `artifacts/signal-saas/index.html`:

```html
<title>YourBrand — Your tagline</title>
<meta property="og:title" content="YourBrand" />
<meta property="og:description" content="Your description" />
```

---

## Step 5 — Enable or disable modules

The admin panel is divided into 10 modules. Each can be toggled independently:

```ts
adminModules: {
  overview:  true,   // Dashboard overview + KPI cards
  products:  true,   // Subscription products / pricing
  customers: true,   // Customer / subscriber list
  access:    true,   // Discord / Telegram invite links
  analytics: true,   // Views, clicks, conversion chart
  content:   false,  // Posts and announcements
  messages:  false,  // Broadcast messages
  activity:  true,   // Full platform event log
  team:      false,  // Multi-admin management
  settings:  true,   // This settings panel
},
```

**Effect of setting a module to `false`:**
- Hidden from the admin navigation
- Direct URL access blocked (redirects to `/admin`)
- Related KPI cards and dashboard panels suppressed
- API endpoints remain intact (no data loss)

---

## Step 6 — Rename entities (singular + plural)

Every entity label has a `singular` form (used in buttons, toasts, confirm dialogs) and a `plural` form (used in headings, counts, and navigation):

```ts
admin: {
  products:  { singular: "Product",     plural: "Products" },
  customers: { singular: "Customer",    plural: "Customers" },
  access:    { singular: "Access Link", plural: "Access" },
},
```

### Common rename patterns

| Business type | products | customers | access |
|---|---|---|---|
| Trading signals | `{ singular: "Signal Plan", plural: "Signal Plans" }` | `{ singular: "Trader", plural: "Traders" }` | default |
| SaaS | `{ singular: "Plan", plural: "Plans" }` | `{ singular: "Subscriber", plural: "Subscribers" }` | `{ singular: "Licence", plural: "Licences" }` |
| Coaching | `{ singular: "Programme", plural: "Programmes" }` | `{ singular: "Client", plural: "Clients" }` | `{ singular: "Portal Link", plural: "Portals" }` |
| Community | `{ singular: "Membership", plural: "Memberships" }` | `{ singular: "Member", plural: "Members" }` | `{ singular: "Invite", plural: "Invites" }` |

---

## Step 7 — Configure post-payment page

```ts
successPage: {
  heading: "You're in!",
  subtext:  "Payment confirmed. Join the channels below to get started.",
},
```

Replace `subtext` with copy that matches your delivery method, for example:
- `"Payment confirmed. Your licence key has been emailed to you."`
- `"Welcome aboard! Your account is ready — click below to sign in."`

---

## Step 8 — Configure landing page content

All landing page content is in `app.ts`. Update each section:

### Hero
```ts
hero: {
  badge: "Social proof badge text",
  headlinePlain:    "First part of headline",
  headlineGradient: "gradient part",
  subtext:          "Supporting paragraph",
  ctaPrimary:       "Call to action button",
},
```

### Stats bar
```ts
stats: [
  { value: "95%", label: "Customer satisfaction" },
  { value: "10k+", label: "Active members" },
  // ...
],
```

### How it works (3 steps)
```ts
howItWorks: [
  { step: "01", title: "Step name", desc: "Description." },
  { step: "02", title: "Step name", desc: "Description." },
  { step: "03", title: "Step name", desc: "Description." },
],
```

### Plan features (keys match plan names you create in the admin)
```ts
planFeatures: {
  "starter": { features: ["Feature 1", "Feature 2"], highlight: false },
  "pro":     { features: ["Everything in Starter", "Feature 3"], highlight: true },
},
```

Keys are case-insensitive and matched against the plan `name` field.

### Testimonials
```ts
testimonials: [
  { name: "Jane D.", handle: "@handle", text: "Review text.", stars: 5 },
],
```

### FAQ
```ts
faqs: [
  { q: "Question?", a: "Answer." },
],
```

### Legal
```ts
disclaimerParagraphs: ["Risk disclaimer paragraph 1.", "Paragraph 2."],
termsExtraSections: [{ heading: "Section heading", body: "Section copy." }],
```

---

## Step 9 — Permanently remove an unused module

If a module will never be needed (reduces code size and eliminates dead imports):

1. Set the flag to `false` in `adminModules` — confirms nothing relies on it
2. Delete the page file, e.g. `artifacts/signal-saas/src/pages/admin/content.tsx`
3. Remove its route from `artifacts/signal-saas/src/App.tsx`
4. Remove its key from `adminModules` in `app.ts`
5. Run `pnpm --filter @workspace/signal-saas run build` to confirm clean build

---

## Step 10 — Deploy to Vercel

### Initial setup

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import Git Repository
3. Set **Framework Preset** to `Vite`
4. Set **Root Directory** to `artifacts/signal-saas`
5. Add all environment variables from Step 3
6. Click Deploy

### Subsequent deploys

```bash
git add -A
git commit -m "Rebrand for MyBusiness"
git push origin main
# Vercel auto-deploys on push to main
```

---

## Backend Architecture

### How Supabase is used

All database access goes through **Vercel serverless functions** (`api/` directory)
using the `SUPABASE_SERVICE_ROLE_KEY`. The service_role key bypasses Row Level
Security entirely, so all admin operations are safe without requiring Supabase Auth.

The browser never queries Supabase directly for sensitive data. The anon key
(`VITE_SUPABASE_ANON_KEY`) is present in the frontend bundle only as a future
extension point and for any direct public reads (e.g. active products list).

```
Browser → /api/admin/*  (admin password auth)  → service_role → Supabase DB
Browser → /api/plans    (public)               → service_role → Supabase DB
Browser → /api/track    (public, anon INSERT)  → service_role → Supabase DB
Browser → /api/access   (public)               → service_role → Supabase DB
```

Purchase flow: `purchase_click` event tracked → `window.location.href = product.payment_url` (external checkout page). No server-side checkout or webhook handling.

### Module → table mapping

| Admin module | Supabase table(s) | API route(s) |
|---|---|---|
| Products | `products` | `GET/POST /api/admin/plans`, `PATCH/DELETE /api/admin/plans/:id` |
| Customers | `customers` | `GET /api/admin/subscribers` |
| Access | `access_links` | `GET/POST /api/admin/links`, `DELETE /api/admin/links/:id` |
| Analytics | `events` | `GET /api/admin/overview` |
| Activity | `events` | `GET /api/admin/activity` |
| Content | `content_blocks` | *(API coming in a future sprint)* |
| Messages | `messages` | *(API coming in a future sprint)* |
| Team | `team_members` | *(API coming in a future sprint)* |
| Settings | `app_settings` | *(API coming in a future sprint)* |
| Overview / Dashboard | `products` + `customers` + `events` | `GET /api/admin/overview` |

Public-facing routes:

| Route | Table | Notes |
|---|---|---|
| `GET /api/plans` | `products` | Returns `is_active = true` rows only |
| `POST /api/track` | `events` | Frontend analytics (no auth) |
| `GET /api/access` | `access_links` | Returns all active access links (no payment verification) |

### "Supabase optional" mode

Every API handler checks `isSupabaseConfigured()` before querying the database.
If `SUPABASE_URL` or the service_role key is absent, the handler returns realistic
mock data so the admin UI and landing page work immediately after cloning — no
database setup required to preview the template.

### Setting up the database

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for the full guide.  
Schema: `supabase/migrations/001_initial_template_schema.sql`  
Seed: `supabase/seed.sql`

---

## Post-clone checklist

- [ ] `app.ts` — appName, tagline, supportEmail, legalName updated
- [ ] `index.html` — `<title>` and `og:` meta tags updated
- [ ] Supabase project created and schema applied
- [ ] All Vercel environment variables set
- [ ] Admin password set (strong, 16+ chars)
- [ ] First deploy succeeded — `/admin` loads
- [ ] Admin login works with your ADMIN_PASSWORD
- [ ] At least one product created in `/admin/products` with `payment_url` set
- [ ] At least one access link added in `/admin/access`
- [ ] Landing page copy reviewed and updated
- [ ] Legal pages (Terms, Disclaimer) reviewed for accuracy
- [ ] Test end-to-end: click buy → redirects to payment URL → `/subscribe/success` shows access links
