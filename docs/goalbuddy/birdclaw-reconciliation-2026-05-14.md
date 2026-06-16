# Birdclaw Reconciliation Packet - 2026-05-14

Repo: `/Users/clay/Documents/Codex/2026-04-30/https-github-com-steipete-birdclaw`

## Owner Decision Update - 2026-06-16

Clay approved upstream publication.

- Clay reversed the fork-only choice and approved upstream publication.
- Current route: prepare and push Clay's Birdclaw work to upstream `origin/main`.
- Fork route: `fork/main` remains a synced staging copy.
- Push rule: direct push to `origin/main` is owner-approved for this tranche after verification passes.
- Status at decision time: working tree clean; `fork/main...HEAD` = `0 0`; `origin/main...HEAD` = `0 22`.
- Verification refresh: `format:check`, `lint`, `coverage`, `build`, and `e2e` passed on 2026-06-16 after adding analytics coverage and updating stale Playwright assertions.
- Push blocker: `git fetch origin main` advanced upstream to `be321a1`; local `main` is now behind `origin/main` by 341 commits, so upstream publication requires an explicit integration/rebase instead of a direct push.

## Current State

- Branch: `main`
- Upstream tracking branch: `origin/main`
- Fork remote: `fork` (`williamclay8/birdclaw`)
- Local commits ahead of `fork/main`: 6
- Local commits ahead of `origin/main`: 21
- Dirty files after formatting:
  - `bin/birdclaw.mjs`
  - `scripts/run-vitest.mjs`
  - `src/lib/db.ts`
  - `src/routes/api/analytics.tsx`
  - `src/routes/api/content-workflow.tsx`
  - `docs/goalbuddy/`

## Ahead Commit Group

These six commits are local relative to Clay's fork and should be treated as a coherent content-workflow/dashboard tranche:

1. `8f5acfb` - Improve content dashboard source cues
2. `68679cf` - Harden content overlay proof boundaries
3. `ba301f6` - gitignore output artifacts
4. `72b3435` - Show copy-ready content counts
5. `0e70c45` - Show content recommendation reason
6. `188b55e` - Surface content loop summaries

## Dirty Work Group

The dirty implementation files are a separate local tranche:

- `bin/birdclaw.mjs`, `scripts/run-vitest.mjs`, and `src/lib/db.ts` add fail-fast handling for Node/native `better-sqlite3` mismatch.
- `src/routes/api/analytics.tsx` and `src/routes/api/content-workflow.tsx` reduce hard-failure risk for API routes when DB/native dependencies are unavailable.
- `docs/goalbuddy/` records local GoalBuddy/Lumi decision packets.

## Recommended Decision

1. Keep the six ahead commits as Clay fork work unless upstream PR intent is reviewed separately.
2. Commit the dirty Node/DB/API hardening files as one local commit after verification.
3. Commit `docs/goalbuddy/` as a local Lumi/GoalBuddy receipt commit or squash it with the hardening receipt, depending on whether Clay wants operational notes in the repo.
4. Do not push to `origin/main` directly.
5. Push to `fork/main` only after Clay approves the fork publication decision.

## Verification Run

- `node -v` -> `v25.9.0`
- `cat .node-version` -> `25.8.1`
- `node bin/birdclaw.mjs --help` -> exit 0
- `corepack pnpm test -- --runInBand` -> passed, 62 files / 293 tests
- `corepack pnpm run format:check` -> passed after formatting
- `corepack pnpm run lint` -> passed
- `corepack pnpm check` -> blocked in this shell because the nested `pnpm` command is not on `PATH`; use the explicit `corepack pnpm run format:check` and `corepack pnpm run lint` commands as the equivalent check until the script environment is fixed.

## Push / PR Blockers

- Clay approval is required before pushing the 6-ahead fork delta.
- The dirty hardening tranche needs one reviewed local commit before push.
- No deploy/live surface was identified for this repo in this run.

## Lumi

- Local: yes, dirty working tree.
- Committed: partly; 6 commits are ahead of Clay's fork and 21 ahead of upstream.
- Pushed: no for the local ahead/dirty work.
- Deployed/live: unknown / not applicable for this local CLI-dashboard repo.
