---
name: Admin auth pattern for SignalStack
description: Simple password-based admin auth — no Supabase, no JWT library. Uses ADMIN_PASSWORD env var and a base64 token.
---

**Rule:** Admin authentication uses a simple scheme — no Supabase auth, no JWT library needed.

Backend:
- `ADMIN_PASSWORD` env var (defaults to "admin" in dev)
- Token format: `ss_admin_` + base64(password + "|" + timestamp)
- Token valid for 30 days
- Middleware `requireAdmin` verifies on every /api/admin/* route

Frontend:
- Token stored in `sessionStorage` (not localStorage — cleared on tab close)
- `AdminRoute` component reads sessionStorage and redirects to /admin/login if absent
- Login page POSTs to /api/admin/login, stores returned token

**Why:** The admin is a single person (the site owner). A full auth system with Supabase is unnecessary overhead. This is simpler and sufficient for a personal tool.

**How to apply:** Any /admin/* routes on the API server should use `requireAdmin` middleware. Never store the token in localStorage.
