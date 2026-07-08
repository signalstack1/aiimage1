---
name: Supabase placeholder URL
description: Supabase createClient throws if URL is empty string; use placeholder values when env vars are absent.
---

Both `@supabase/supabase-js` v2 on the frontend (Vite) and backend (Node) throw `supabaseUrl is required.` if an empty string is passed to `createClient`.

**Rule:** Always fall back to a placeholder URL/key string (not empty string) so the app starts without env vars:

Frontend:
```ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";
```

Backend:
```ts
const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";
```

**Why:** The library validates the URL before constructing the client, crashing the entire app on import if the URL is empty.

**How to apply:** Any time `@supabase/supabase-js` is initialized in a file that may run before env vars are configured.
