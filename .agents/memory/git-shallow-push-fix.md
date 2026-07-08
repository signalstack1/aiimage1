---
name: Shallow-clone GitHub push failure
description: How to diagnose and fix a Replit repl's git repo failing to push to a fresh/empty GitHub remote with "did not receive expected object" / index-pack errors.
---

## Symptom
`git push origin main` (via Shell, not the agent's blocked shell) fails against a brand-new, genuinely empty GitHub repo with:
```
remote: fatal: did not receive expected object <sha>
error: remote unpack failed: index-pack failed
! [remote rejected] main -> main (failed)
```
This persists across `--no-thin`, `git repack -a -d -f`, and re-attempts — it is not a transient network issue.

## Root cause
Replit repls are created as **shallow git clones**. The oldest ("shallow boundary") commit's raw object still has a real `parent <sha>` field recorded in its content, but that parent object was never fetched and doesn't exist anywhere in the repo. `.git/shallow` hides this from normal local git operations, but pushing to a new remote requires proper shallow-push protocol negotiation — when that doesn't happen cleanly, GitHub's `index-pack` chokes on the dangling parent reference.

Confirm via: `git rev-parse --is-shallow-repository` → `true`, and `git cat-file -p <boundary-commit>` shows a `parent` line whose object is unfetchable (`git cat-file -e <parent-sha>` fails).

## Fix
Attempting to unshallow (`git fetch --unshallow`) or repack does NOT fix it — the missing parent object is gone for good. Instead, replace history with a fresh orphan root commit (no parent reference at all), keeping old history on a backup branch:
```
git branch backup-full-history main
git checkout --orphan clean-main
git add -A
git commit -m "Initial commit"
git branch -M clean-main main
git push origin main
```
**Why:** an orphan commit has zero parents by construction, so there's no dangling reference for the remote to choke on.

## Environment note
The main agent's shell is hard-blocked from any git push/fetch, and even from local-only writes like `git repack` ("Destructive git operations are not allowed in the main agent"). All of these steps must be run by the *user* in their own Shell tab, not by the agent. If pasting multi-line commands into the Shell doesn't work, write a `.sh` script file and have the user run `bash script.sh` instead.
