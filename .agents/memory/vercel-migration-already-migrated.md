---
name: Vercel/v0 migration when backup is already pnpm_workspace-shaped
description: The migrate-to-multi-artifact task template assumes a Next.js app that needs conversion to Vite+React, but the actual `.migration-backup/` snapshot may already be a complete, working Replit pnpm_workspace multi-artifact project (e.g. previously migrated, or exported from another Replit project).
---

Before starting the standard Next.js→Vite conversion steps, inspect `.migration-backup/` structure directly (`ls .migration-backup`, `ls .migration-backup/artifacts`). If it already contains `artifacts/<name>/package.json` with Vite/React deps, an `artifacts/api-server` with Express routes, and `lib/api-spec/openapi.yaml`, treat this as a **restore/merge** task, not a framework conversion:

- Copy each artifact's source (`src/`, `public/`, config files, `package.json` deps) from the backup into the corresponding fresh-scaffold artifact directory.
- Restore shared packages (`lib/api-spec/openapi.yaml`, then rerun codegen) and any `lib/db` schema.
- Remove any `.replit-artifact` marker files left inside `.migration-backup/artifacts/*` — the platform can auto-register these as ghost/duplicate workflows if left in place.
- Spot-check for dead code carried in the backup (e.g. object-storage helpers never mounted in the backup's own route index) and drop it rather than reintroducing unused complexity — match the backup's *actual* runtime behavior, not everything present in its file tree.
- `tsc --noEmit` errors that are byte-identical between the restored file and the backup's copy are pre-existing, not regressions — diff against `.migration-backup` before "fixing" anything, since the task's out-of-scope rules protect pre-existing issues.

**Why:** Blindly following the Next.js-conversion steps on an already-migrated backup wastes significant effort and risks introducing regressions by rewriting working code from scratch.

**How to apply:** Any task instructing "migrate/port a Vercel or v0 import into the Replit stack" — check the backup's actual shape first before assuming framework conversion is required.
