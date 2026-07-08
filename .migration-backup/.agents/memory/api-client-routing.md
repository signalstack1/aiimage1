---
name: API client routing in Replit pnpm workspace
description: Replit's path-based proxy handles /api/* routing automatically; no custom base URL needed for web apps.
---

**Rule:** In the SignalStack pnpm workspace, the API server artifact registers `/api` as its path. Replit's proxy automatically routes `http://host/api/*` → port 8080 (API server). The frontend does NOT need `setBaseUrl()` when deployed on Replit.

**Why:** The generated API client uses relative URLs like `/api/traders/demo`. When served through the Replit proxy (port 80), these resolve correctly to the API server via path-based routing.

**How to apply:** Only call `setBaseUrl` for Expo/mobile apps or external deployments where the same-origin proxy is not in effect.
