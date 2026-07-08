---
name: SignalStack concept
description: SignalStack is a personal trading signal service — one owner sells their own signals to subscribers, NOT a marketplace for multiple traders.
---

**Rule:** SignalStack is a single-owner product. There is no concept of "trader profiles", "storefronts", or multiple signal providers. The owner sells signals to subscribers who pay and get Discord + Telegram access.

**Why:** The user explicitly corrected an earlier implementation that built a multi-trader marketplace. The correct concept: one person's site, their signals, subscribers pay to join private Discord/Telegram channels.

**How to apply:**
- No trader authentication / Supabase auth needed
- Admin is the owner only — protected by ADMIN_PASSWORD env var
- Database tables: plans, subscribers, payments, access_links (no trader_profiles, no auth.users FK)
- Public API: /api/checkout, /api/access (post-payment link reveal)
- Admin API: /api/admin/* (login, overview, subscribers, plans, links)
