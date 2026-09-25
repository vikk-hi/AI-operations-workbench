# Local V9 Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Obtain the complete Miaoda V9 source, preserve it as a credential-safe local Git baseline, and prove that the main workbench flows can run locally without modifying or publishing the online app.

**Architecture:** Treat the Miaoda project as an upstream source and this repository as the independent local product. Import the upstream tree without its Git metadata, isolate platform-only dependencies behind the existing adapters, and verify the untouched baseline before any UI or AI changes.

**Tech Stack:** Existing Miaoda project stack observed in the editor: TypeScript, React, Vite-style client build, Node.js/NestJS server, shared TypeScript models, and JavaScript sync scripts. Exact versions come from the imported lockfile and must not be upgraded in this phase.

**Spec:** `docs/superpowers/specs/2026-09-26-local-workbench-design.md`

## Global Constraints

- Keep the current Miaoda online version unchanged; do not publish, rollback, create tasks, or edit permissions.
- Prefer the project's existing Git remote only when it can be accessed without exposing a credential in commands, logs, files, or chat output.
- If Git access is unavailable, use Miaoda's source export and import the complete archive; do not reconstruct the app from the rendered HTML.
- Do not commit `.env`, cookies, SSO tokens, authorization headers, downloaded business-data snapshots, logs, caches, or generated build output.
- Do not upgrade dependencies or refactor V9 during baseline reproduction.
- Multi-dimensional-table access remains read-only in this phase.

## Review Focus

- A source URL containing embedded credentials must be rejected or redacted before it reaches Git config or logs; Task 1 verifies the resulting remote configuration.
- A source export missing `client`, `server`, `shared`, or the package lock must fail completeness validation; Task 1 pins the required tree.
- An imported `.env` or token-like value must be caught before the baseline commit; Task 2 runs targeted secret and tracked-file checks.
- The local app must show a clear degraded state when Miaoda-only SDK capabilities are absent instead of crashing; Task 3 records and verifies each platform dependency.
- The baseline must reproduce all primary navigation routes and modals without creating a real task or writing to Feishu; Task 4 uses a read-only parity checklist.

---

### Task 1: Acquire and validate the complete upstream source

**Files:**
- Create: `docs/upstream-source.md`
- Create: `scripts/verify-source-tree.sh`
- Test: `scripts/verify-source-tree.sh`

**Interfaces:**
- Consumes: Existing Miaoda project `app_17es2ybencz` and its editor workspace.
- Produces: A complete source tree at the repository root and a reproducible `scripts/verify-source-tree.sh` completeness check.

- [ ] **Step 1: Read the existing upstream metadata without changing it**

In the Miaoda terminal, run read-only commands and record only non-secret results:

```bash
git status --short --branch
git log -1 --format='%H %cI %s'
git remote -v
node --version
npm --version
```

Do not copy a remote URL if it contains a username, password, query token, or signed parameter. Record the host and repository identity only.

- [ ] **Step 2: Select the acquisition path**

Use this deterministic order:

```text
1. Credential-free SSH/HTTPS Git remote usable from the Mac
2. Miaoda source export containing the complete repository
3. Platform-provided downloadable project archive
```

Do not use browser page saving, preview HTML, or generated `v9-runtime.js` alone as the source.

- [ ] **Step 3: Import source without upstream Git metadata**

For a Git source, clone into a temporary directory and copy tracked files only:

```bash
tmp_dir="$(mktemp -d)"
read -r -s -p "Credential-free Git remote: " remote_url
printf '\n'
git clone "$remote_url" "$tmp_dir/upstream"
unset remote_url
git -C "$tmp_dir/upstream" archive HEAD | tar -x -C .
```

For an exported archive, inspect it before extraction and reject absolute paths or `..` traversal entries. Extract into a temporary directory, then copy the project contents into this repository without its `.git` directory.

- [ ] **Step 4: Write the source completeness check**

Create `scripts/verify-source-tree.sh` with this exact behavior:

```bash
#!/usr/bin/env bash
set -euo pipefail

required=(
  package.json
  package-lock.json
  client
  client/src
  server
  shared
)

missing=0
for path in "${required[@]}"; do
  if [[ ! -e "$path" ]]; then
    echo "missing required source path: $path" >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "source tree complete"
```

- [ ] **Step 5: Run completeness validation**

Run:

```bash
bash scripts/verify-source-tree.sh
```

Expected: `source tree complete`. Any missing required path blocks the import.

- [ ] **Step 6: Document provenance**

Create `docs/upstream-source.md` containing the acquisition method, source host, observed upstream commit, acquisition date, Node/npm versions, and whether Git history was available. Do not include tokens or private remote credentials.

- [ ] **Step 7: Commit the imported source**

```bash
git add docs/upstream-source.md scripts/verify-source-tree.sh package.json package-lock.json client server shared sync tests
git commit -m "chore: import Miaoda V9 source baseline"
```

Include only paths that exist in the imported source. Review `git status --short` before committing.

### Task 2: Establish credential and artifact isolation

**Files:**
- Create or Modify: `.gitignore`
- Create: `.env.example`
- Create: `scripts/check-sensitive-files.sh`
- Test: `scripts/check-sensitive-files.sh`

**Interfaces:**
- Consumes: Imported source tree from Task 1.
- Produces: A repository that rejects tracked runtime credentials and generated artifacts.

- [ ] **Step 1: Write the sensitive-file check**

Create `scripts/check-sensitive-files.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

blocked='(^|/)(\.env($|\.)|cookies?\.json$|.*\.log$|node_modules/|dist/|build/|\.DS_Store$)'
tracked="$(git ls-files)"

if printf '%s\n' "$tracked" | grep -E "$blocked"; then
  echo "blocked sensitive or generated file is tracked" >&2
  exit 1
fi

if git grep -nE 'sso_token=|Authorization:[[:space:]]*Bearer|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' -- . ':!package-lock.json'; then
  echo "credential-like content found in tracked files" >&2
  exit 1
fi

echo "sensitive-file check passed"
```

- [ ] **Step 2: Verify the check detects a prohibited tracked file**

Run in a temporary Git index so the real index is not changed:

```bash
tmp_index="$(mktemp)"
rm -f "$tmp_index"
GIT_INDEX_FILE="$tmp_index" git read-tree HEAD
touch .env
GIT_INDEX_FILE="$tmp_index" git add -f .env
if GIT_INDEX_FILE="$tmp_index" bash scripts/check-sensitive-files.sh; then
  echo "expected sensitive-file check to fail" >&2
  exit 1
fi
rm -f .env "$tmp_index"
```

Expected: the check fails with `blocked sensitive or generated file is tracked`.

- [ ] **Step 3: Add ignore rules**

Ensure `.gitignore` contains:

```gitignore
.env
.env.*
!.env.example
node_modules/
dist/
build/
coverage/
logs/
*.log
.DS_Store
*.cookie.json
cookies.json
work/
```

- [ ] **Step 4: Create the environment template**

Create `.env.example` using variable names found in the imported source. Every value must be empty and each variable must have a short comment describing its purpose and whether it is required for read-only local mode.

- [ ] **Step 5: Run repository safety checks**

```bash
bash scripts/check-sensitive-files.sh
git status --short
git diff --check
```

Expected: sensitive-file check passes and whitespace check produces no output.

- [ ] **Step 6: Commit isolation controls**

```bash
git add .gitignore .env.example scripts/check-sensitive-files.sh
git commit -m "chore: isolate credentials and generated artifacts"
```

### Task 3: Reproduce the V9 runtime locally

**Files:**
- Modify only if required: `package.json`
- Modify only if required: `scripts/dev-local.js`
- Create: `docs/local-runtime.md`
- Create: `scripts/verify-local-runtime.sh`
- Test: existing project tests plus `scripts/verify-local-runtime.sh`

**Interfaces:**
- Consumes: Imported package manifest, lockfile, client, server, shared modules, and existing local-development scripts.
- Produces: One documented local start command and an HTTP-level runtime verification.

- [ ] **Step 1: Install exact locked dependencies**

Use the dependency runtime configured for the workspace and run:

```bash
npm ci
```

Expected: installation completes without modifying `package-lock.json`. If the lockfile changes, stop and diagnose the version mismatch before continuing.

- [ ] **Step 2: Discover existing verification commands**

```bash
npm run
```

Record the existing build, test, typecheck, lint, and local-development commands in `docs/local-runtime.md`. Do not invent replacement commands when the project already provides them.

- [ ] **Step 3: Run the existing non-mutating checks**

Run each available check once in this order:

```text
typecheck → unit tests → build
```

Record command, exit status, and any environment-dependent failure. Do not run release, publish, database migration, seed, or sync-write commands.

- [ ] **Step 4: Start the existing local-development command**

Use the project's existing `dev:local` command when present; otherwise use the documented development command that starts both client and server. Keep it in a supervised terminal session.

- [ ] **Step 5: Write an HTTP verification script**

Create `scripts/verify-local-runtime.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-http://127.0.0.1:5173}"
html="$(curl --fail --silent --show-error "$base_url/")"

if [[ "$html" != *'<html'* && "$html" != *'<!doctype html'* && "$html" != *'<!DOCTYPE html'* ]]; then
  echo "local runtime did not return HTML" >&2
  exit 1
fi

echo "local runtime reachable: $base_url"
```

Adjust the default port only when the imported project documents a different fixed local port.

- [ ] **Step 6: Verify the running application**

```bash
bash scripts/verify-local-runtime.sh
```

Expected: `local runtime reachable` with the verified URL.

- [ ] **Step 7: Document platform-only dependencies**

In `docs/local-runtime.md`, list every Miaoda-only API or SDK encountered, the page or action that uses it, local behavior when unavailable, and the intended adapter or mock boundary. The page must render a clear unavailable/read-only state instead of crashing.

- [ ] **Step 8: Commit local runtime support**

```bash
git add package.json scripts/dev-local.js docs/local-runtime.md scripts/verify-local-runtime.sh
git commit -m "chore: support local V9 runtime verification"
```

Include only files actually modified or created.

### Task 4: Verify read-only V9 parity

**Files:**
- Create: `docs/v9-parity-checklist.md`
- Create: `docs/v9-baseline-findings.md`
- Test: Manual read-only browser verification against the local URL

**Interfaces:**
- Consumes: Running local V9 application from Task 3 and the previously inspected online V9 as a visual reference.
- Produces: A signed-off baseline checklist and a prioritized list of local-only follow-up work.

- [ ] **Step 1: Create the parity checklist**

Add unchecked rows for:

```text
Core data: primary metrics, period selector, trend, goal table, metric detail
Diagnosis: diagnosis path, product list, assortment, market comparison
Product interaction: filters, search, detail drawer, action form opens and cancels
Tasks: current/finished filters, search, task table, calendar/load/process navigation
Data and rules: all registered data sources and read-only status
Shared UI: theme selector, identity selector, notifications, demo instructions
Safety: no create, update, publish, mark-read, permission, or Feishu write action
```

- [ ] **Step 2: Test the local application through the browser**

For each checklist row, record `pass`, `degraded`, or `blocked`, plus one sentence of evidence. Opening and cancelling local-only forms is allowed; submitting any form or triggering a sync/write action is prohibited.

- [ ] **Step 3: Check the degraded platform state**

Temporarily run without Miaoda-specific environment values and verify:

```text
The shell and primary navigation render.
Unavailable data sources are labeled unavailable or demo.
No unhandled exception blocks the entire page.
No write action becomes enabled by fallback behavior.
```

- [ ] **Step 4: Write baseline findings**

Create `docs/v9-baseline-findings.md` with four sections:

```text
1. Exact local parity achieved
2. Miaoda-only dependencies
3. Data connections requiring local adapters
4. Recommended first UI/UX changes after baseline approval
```

Separate observed facts from recommendations.

- [ ] **Step 5: Run final baseline checks**

```bash
bash scripts/verify-source-tree.sh
bash scripts/check-sensitive-files.sh
git diff --check
git status --short
```

Expected: both scripts pass, whitespace check is clean, and only the two Task 4 documents are uncommitted.

- [ ] **Step 6: Commit the parity report**

```bash
git add docs/v9-parity-checklist.md docs/v9-baseline-findings.md
git commit -m "docs: verify local V9 baseline parity"
```

The repository is ready for the next design phase only after this commit and a clean `git status --short`.
