---
name: Payment model — external URLs only
description: SignalStack uses external payment URLs (not Stripe/Whop API); no webhooks, no server-side session creation.
---

## Rule
Payments are handled via external checkout URLs stored on each product. No Stripe/Whop API keys needed.

**Products table columns:**
- `payment_provider TEXT` — display label only (e.g. "stripe", "whop", "gumroad")
- `payment_url TEXT` — the external checkout page URL
- `button_label TEXT` — custom buy button text (default: "Subscribe")

**Purchase flow:**
1. User clicks buy button → `trackEvent("purchase_click", plan_id, plan_name)`
2. `window.location.href = product.payment_url`
3. User pays on external provider's page
4. Provider redirects to `/subscribe/success`
5. Success page calls `GET /api/access` → returns all access_links rows
6. No session_id verification (Discord/Telegram manage their own access control)

**Why:** User explicitly chose this model — no Stripe/Whop API integration needed. Simpler for template cloners who use hosted payment pages.

**How to apply:**
- Never add `stripe_price_id`, `whop_plan_id`, `session_id` verification back to these flows
- `/api/checkout` and `/api/webhook` are intentionally disabled (return 410)
- Admin creates customers manually via `/admin/customers`
- DB schema: customers table has no `external_ref` or `subscription_ref` columns
