#!/bin/bash
set -e
git branch backup-full-history main
git checkout --orphan clean-main
git add -A
git commit -m "Initial commit"
git branch -M clean-main main
git push origin main
