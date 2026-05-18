# Hourly Top 5 Improvement Goals — 2026-05-13

Repo: `/Users/clay/Documents/Codex/2026-04-30/https-github-com-steipete-birdclaw`

## Top 5 (current tranche)

1) Fail fast on Node/ABI mismatch (better-sqlite3)
- Status: implemented locally (not yet committed)
- Files:
  - `/Users/clay/Documents/Codex/2026-04-30/https-github-com-steipete-birdclaw/bin/birdclaw.mjs`
  - `/Users/clay/Documents/Codex/2026-04-30/https-github-com-steipete-birdclaw/scripts/run-vitest.mjs`
  - `/Users/clay/Documents/Codex/2026-04-30/https-github-com-steipete-birdclaw/src/lib/db.ts`
- Verify:
  - `node -v` + `cat .node-version`
  - `node bin/birdclaw.mjs --help` (expects friendly mismatch message when Node major differs)
  - `corepack pnpm test` (fails fast with mismatch message when Node major differs)

2) Avoid `/api/*` hard-500 when DB/native deps missing
- Status: implemented locally (not yet committed)
- Files:
  - `/Users/clay/Documents/Codex/2026-04-30/https-github-com-steipete-birdclaw/src/routes/api/analytics.tsx`
  - `/Users/clay/Documents/Codex/2026-04-30/https-github-com-steipete-birdclaw/src/routes/api/content-workflow.tsx`
- Verify:
  - `node --check src/routes/api/analytics.tsx`
  - `node --check src/routes/api/content-workflow.tsx`

3) Keep `/content` command center scannable
- Status: implemented locally (not yet committed)
- Files:
  - `/Users/clay/Documents/Codex/2026-04-30/https-github-com-steipete-birdclaw/src/routes/content.tsx`
  - `/Users/clay/Documents/Codex/2026-04-30/https-github-com-steipete-birdclaw/src/routes/content.test.tsx`

4) Receipts: capture minimal verification output
- Status: done (terminal receipts + automation memory)

5) Lumi hygiene: keep repo clean
- Status: needs follow-up
- Next owner action: switch to Node `25.8.1`, run `corepack pnpm install`, then `corepack pnpm test` / `corepack pnpm check`. If green, stage explicit paths and commit.

## Lumi hygiene snapshot

- Local changes: yes (working tree dirty)
- Committed: branch is ahead of `origin/main` by 20 commits; *new changes not committed yet*
- Pushed: no (per safety rules)
- Deployed/live: none detected in repo (no deploy workflow found)
