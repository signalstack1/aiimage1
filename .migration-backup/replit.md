# Universal Business Template MASTER

A production-ready, fully rebrandable universal business app template. Clone once, configure via `app.ts`, deploy to Vercel for any business type — SaaS, tradesman, salon, takeaway, e-commerce, portfolio, and more.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Backend | Vercel Serverless Functions (TypeScript) |
| Database | Supabase (PostgreSQL) |
| Payments | Whop (embedded checkout + webhooks) |
| Routing | Wouter |
| Monorepo | pnpm workspaces |

## Project layout

```
artifacts/
  signal-saas/          # Main web artifact
    src/
      config/
        app.ts          # ← SINGLE CONFIG FILE — all branding, copy, modules, labels
      pages/
        home.tsx        # Public landing page
        subscribe-success.tsx
        admin/
          dashboard.tsx # Module-aware overview with KPI cards + charts
          products.tsx  # Subscription products (uses config singular/plural labels)
          customers.tsx # Customer / subscriber list
          access.tsx    # Discord / Telegram invite links
          analytics.tsx
          activity.tsx
          content.tsx
          messages.tsx
          team.tsx
          settings.tsx  # Live view of all config values and module states
      components/
        AdminLayout.tsx # Grouped, module-aware sidebar navigation
        AdminRoute.tsx  # Route guard (auth + module flag check)
    api/
      admin/            # Serverless admin CRUD endpoints
      webhook/          # Whop webhook handler
      access.ts         # Public access-link delivery (post-payment)
      track.ts          # Analytics event tracking
    index.html
    vite.config.ts
  api-server/           # Dev API proxy (development only)
CONFIG.md               # Full clone and deploy guide
```

## Architecture decisions

- **Config-first** — all customisation lives in `src/config/app.ts`. No database config, no env var flags for feature toggles.
- **Module system** — `APP_CONFIG.adminModules` is a boolean map. Setting a key to `false` hides the nav item, blocks the route via `ModuleRoute`, and suppresses related dashboard widgets. API endpoints remain intact.
- **Singular + plural labels** — each admin entity (`products`, `customers`, `access`) has both forms. `plural` is used in headings and nav; `singular` in buttons, toasts, and confirm dialogs.
- **Admin auth** — password-only via `ADMIN_PASSWORD` env var. A base64 token is stored in `sessionStorage` for 30 days. No Supabase auth for admin.
- **Supabase client** — both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be present or the app throws at startup. For local dev without Supabase, use the placeholder values in `.env.local`.
- **Dark mode** — applied via `document.documentElement.classList.add("dark")` in `main.tsx` (Tailwind v4 cannot use `@apply dark:` in CSS).

## Development

```bash
pnpm install
pnpm --filter @workspace/signal-saas run dev
```

Frontend runs on the port assigned by Replit (`$PORT`). The API server proxy runs alongside for serverless function emulation.

## Deployment

See `CONFIG.md` for the full 10-step clone and deploy guide.

Quick deploy: push to `main` on GitHub → Vercel auto-deploys. Set root directory to `artifacts/signal-saas`.

## User preferences

- Config-first: never hardcode business-specific copy, labels, or toggles outside `app.ts`
- Keep the master template generic — no niche-specific defaults that would confuse a new clone
- Do not add new Supabase tables, API endpoints, or payment/webhook changes without explicit approval
- Admin auth remains password-only (no Supabase auth, no Clerk) unless explicitly requested
- TypeScript must stay clean — run `pnpm --filter @workspace/signal-saas run build` before marking any task complete
