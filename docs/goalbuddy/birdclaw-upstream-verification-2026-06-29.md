# Birdclaw Upstream Verification Receipt - 2026-06-29

Run time: 2026-06-29 11:02 CDT

## Scope

Fresh local verification for the upstream-prep/hardening tranche. This receipt
does not push upstream, open a PR, deploy anything, or claim upstream readiness.

## Environment

- Required Node from `.node-version`: `25.8.1`
- Default shell Node observed first: `v24.14.1`, which correctly failed the
  repo's Node guard.
- Working Node used for direct checks:
  `/Users/clay/.local/share/mise/installs/node/25.8.1/bin/node`

The `corepack pnpm` path in this Codex runtime still resolved package scripts
through a Node 24 wrapper, so direct repo-local executables were used where
possible.

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `node bin/birdclaw.mjs --help` under Node 25 | Pass | Printed the CLI command list, including `init`, `auth`, `archive`, `import`, `search`, `mentions`, `profiles`, `dms`, `sync`, `jobs`, `blocks`, `mutes`, `compose`, `inbox`, `db`, `backup`, and `serve`. |
| `oxfmt --check src scripts playwright vite.config.ts vitest.config.ts playwright.config.ts` under Node 25 | Pass | All 145 matched files used correct formatting. |
| `node ./scripts/run-vitest.mjs run` under Node 25 | Blocked / incomplete | The default run stayed quiet for several minutes. A bounded retry with `--maxWorkers=1 --no-file-parallelism --reporter=default --reporter=hanging-process` eventually printed partial progress only after interrupt: `src/lib/backup.test.ts` passed 8 tests in 8384 ms, but the full suite was not allowed to complete in this run. |
| `oxlint --import-plugin --node-plugin --vitest-plugin --deny-warnings ...` under Node 25 | Blocked / incomplete | Default and `--threads=1` runs remained silent for multiple minutes and were interrupted. |

## Decision

Birdclaw is not ready for an upstream publication claim from this receipt alone.
The previous stale "ahead-only" framing remains replaced by the current truth:
local `main` is clean but diverged from `origin/main` (`ahead 22, behind 341`
before this receipt), and the full test/lint proof is currently blocked by
local tool execution behavior.

## Smallest Next Verification

Before upstream PR/push:

1. Run the same commands in a normal terminal with Node `25.8.1` active through
   the user's regular runtime manager.
2. Prefer `corepack pnpm test` and `corepack pnpm run check` only after
   confirming `node -v` inside package scripts reports `v25.x`.
3. If Vitest or oxlint still hangs, debug those tool invocations directly
   before touching upstream history.

## Lumi

- Local: receipt added locally in Birdclaw.
- Committed: pending at receipt creation.
- Pushed: pending at receipt creation.
- Deployed/live: not applicable / not verified.
