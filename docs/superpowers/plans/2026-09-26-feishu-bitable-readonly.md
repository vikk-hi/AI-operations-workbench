# Feishu Bitable Read-Only Connector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the local workbench's unavailable Miaoda database path with a real, read-only Feishu Bitable connector for core metrics, tasks, targets, templates, and timeline data.

**Architecture:** Extend the existing localhost auth service into a credential-safe local API. A focused token provider and paginated Bitable client feed per-domain repositories that preserve the current `/api/workbench/*` response contracts, so the V9 frontend changes only its local transport. The first release exposes no record mutation methods.

**Tech Stack:** Node.js 22 ESM, built-in `fetch`/`http`, Feishu Open API, existing TypeScript response contracts and metric rules, Node test runner, Vite/React client.

**Spec:** `docs/superpowers/specs/2026-09-26-feishu-bitable-connector-design.md`

## Global Constraints

- First release is read-only: no create, update, archive, or delete API may be callable.
- App secrets and access tokens remain server-side and never enter responses, logs, fixtures, or Git.
- Only allowlisted Base/table IDs may be requested; browser-supplied arbitrary IDs are rejected.
- Preserve the existing `/api/workbench/*` response contracts and V9 information architecture.
- Keep Miaoda online behavior unchanged; local transport selection applies only to `localhost` and `127.0.0.1`.
- Display source identity, last successful read time, cache status, and honest per-module errors.
- Original business tables remain unchanged throughout implementation and live smoke verification.
- App permission or Base collaborator changes require action-time user confirmation before saving.

## Review Focus

- Expired token during a paginated read must refresh once and resume without leaking either token (Task 2 tests).
- More than 500 records must read every page exactly once and stop on the final page token (Task 2 tests).
- Renamed, absent, or type-changed Bitable fields must fail that module with a field-specific diagnostic instead of returning invented values (Tasks 3–5 tests).
- One failing Base must not hide successful data from unrelated modules (Task 6 tests).
- Local login cookies and cross-origin requests must continue working while `/api/workbench/*` is served from port 3001 (Task 6 tests).

---

## File Structure

- `server-local/bitable/config.mjs` — validates credentials and allowlisted source/table configuration.
- `server-local/bitable/token-provider.mjs` — obtains and caches app access tokens.
- `server-local/bitable/client.mjs` — read-only metadata/field/record API with pagination and normalized errors.
- `server-local/bitable/field-map.mjs` — typed extraction helpers for Bitable fields.
- `server-local/repositories/core-repository.mjs` — core/current/history records to overview response.
- `server-local/repositories/task-repository.mjs` — task/main/template records to task dashboard response.
- `server-local/repositories/target-repository.mjs` — company/brand target records to target response.
- `server-local/repositories/timeline-repository.mjs` — activity rows to timeline response.
- `server-local/workbench-api.mjs` — composes repositories, cache metadata, and module-level results.
- `server-local/auth-server.mjs` — mounts local auth and workbench GET routes on the existing localhost server.
- `scripts/probe-bitable.mjs` — read-only metadata/sample probe; redacts sensitive values.
- `client/src/v9-bridge.ts` — selects localhost API transport while preserving Miaoda transport online.
- `shared/api.interface.ts` — adds optional source/read-status metadata without breaking current fields.
- `test/bitable-*.test.mjs` — unit and contract tests with synthetic API payloads.
- `test/local-workbench-api.test.mjs` — local HTTP routing, isolation, and CORS tests.
- `docs/local-runtime.md` — setup, permissions, smoke verification, and no-write boundary.

### Task 1: Read-Only Configuration and Source Allowlist

**Files:**
- Create: `server-local/bitable/config.mjs`
- Create: `test/bitable-config.test.mjs`
- Modify: `.env.example`
- Modify: `package.json`

**Interfaces:**
- Consumes: `FEISHU_APP_ID`, `FEISHU_APP_SECRET`, and checked-in source IDs.
- Produces: `loadBitableConfig(env): { appId, appSecret, sources, publicStatus }` and `resolveSource(config, sourceKey): SourceConfig`.

- [ ] **Step 1: Write the failing configuration tests**

Add tests named `loads only allowlisted sources`, `rejects missing credentials without exposing secret`, and `rejects unknown source key`. Assert the known Base/table IDs from the spec and assert serialized public status contains neither the secret nor a token-shaped property.

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test test/bitable-config.test.mjs`  
Expected: FAIL because `server-local/bitable/config.mjs` does not exist.

- [ ] **Step 3: Implement the configuration boundary**

Implement `loadBitableConfig(env)` and `resolveSource(config, sourceKey)`. Register known tables exactly; represent unconfirmed history/template/brand/main table IDs as disabled entries that cannot be queried.

- [ ] **Step 4: Document variables and add probe/test scripts**

Add non-secret variables to `.env.example`; add `test:bitable` and `probe:bitable` package scripts. Do not place actual IDs that are secret credentials into environment examples.

- [ ] **Step 5: Verify and commit**

Run: `node --test test/bitable-config.test.mjs && git diff --check`  
Expected: PASS and no whitespace errors.

Commit: `feat: add read-only Bitable source configuration`

### Task 2: Token Provider and Paginated Read Client

**Files:**
- Create: `server-local/bitable/token-provider.mjs`
- Create: `server-local/bitable/client.mjs`
- Create: `test/bitable-client.test.mjs`

**Interfaces:**
- Consumes: `loadBitableConfig`, injected `fetchImpl`, and allowlisted `SourceConfig`.
- Produces: `createTokenProvider(config, fetchImpl).getToken()`; `createBitableClient({ tokenProvider, fetchImpl }).listTables(appToken)`, `.listFields(appToken, tableId)`, and `.listAllRecords(appToken, tableId, options)`.

- [ ] **Step 1: Write failing token and client tests**

Test token caching before expiry, one refresh after an authorization failure, redacted error messages, 500+ record pagination, final page termination, rate-limit normalization, and refusal to expose mutation methods.

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test test/bitable-client.test.mjs`  
Expected: FAIL because the provider/client modules do not exist.

- [ ] **Step 3: Implement `createTokenProvider(config, fetchImpl)`**

Cache the app access token in memory and refresh before expiry. Errors expose only Feishu code/message and never request headers, secret, or full token.

- [ ] **Step 4: Implement the read-only Bitable client**

Use GET endpoints only. Follow `has_more` and `page_token`; retry one authentication failure after invalidating the cached token; normalize permission, missing-table, rate-limit, network, and malformed-payload failures.

- [ ] **Step 5: Verify and commit**

Run: `node --test test/bitable-client.test.mjs && npm test`  
Expected: all client and existing local auth tests PASS.

Commit: `feat: add paginated read-only Bitable client`

### Task 3: Metadata Probe and Field Mapping Contract

**Files:**
- Create: `scripts/probe-bitable.mjs`
- Create: `server-local/bitable/field-map.mjs`
- Create: `test/bitable-field-map.test.mjs`
- Create after approved live read: `docs/bitable-field-map.md`

**Interfaces:**
- Consumes: `BitableClient` metadata and at most three sample records per table.
- Produces: redacted metadata report; `createFieldReader(fields)` with `text`, `number`, `date`, `boolean`, `personIds`, `linkedRecordIds`, and `requireField` methods.

- [ ] **Step 1: Write failing field-reader tests**

Cover normal values, empty values, linked records, people fields, absent required fields, renamed fields, and incompatible field types. Assert errors include source alias and field name but no record contents.

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test test/bitable-field-map.test.mjs`  
Expected: FAIL because `field-map.mjs` is absent.

- [ ] **Step 3: Implement the field reader**

Map values only when both configured name and expected Bitable field type agree. Optional fields return `null`; required mismatches throw `FieldMappingError`.

- [ ] **Step 4: Implement the read-only probe**

The probe lists tables, fields, field types, and a maximum of three record IDs per table. It prints neither field values nor credentials. Unknown table IDs stay disabled until this report confirms them.

- [ ] **Step 5: Obtain action-time confirmation and configure Feishu read access**

Immediately before saving, ask the user to approve adding the required Bitable read-only scope and adding the app as collaborator to the named Bases. Do not request write/delete scopes.

- [ ] **Step 6: Run the approved live probe and record mappings**

Run: `npm run probe:bitable`  
Expected: each authorized Base returns table and field metadata; record values remain redacted. Save the reviewed mapping and any unavailable source reason in `docs/bitable-field-map.md`.

- [ ] **Step 7: Verify and commit**

Run: `node --test test/bitable-field-map.test.mjs && git diff --check`  
Expected: PASS.

Commit: `feat: add Bitable metadata probe and field mapping`

### Task 4: Core Metrics Repository

**Files:**
- Create: `server-local/repositories/core-repository.mjs`
- Create: `test/bitable-core-repository.test.mjs`
- Reference: `server/modules/workbench/workbench-metrics.ts`
- Reference: `shared/api.interface.ts`

**Interfaces:**
- Consumes: `BitableClient`, confirmed core/history mappings, and metric rules matching `buildDashboard`.
- Produces: `createCoreRepository(deps).getOverview(): Promise<CoreOverviewResponse & ReadStatus>`.

- [ ] **Step 1: Write failing contract tests**

Use synthetic Bitable records to assert day/7d/MTD/YTD values, daily trend ordering, missing-day behavior, source URL, last-read metadata, renamed-field failure, and empty-table warning behavior.

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test test/bitable-core-repository.test.mjs`  
Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement the repository**

Implement `getOverview()` with explicit field mapping and the same formulas/period semantics as `workbench-metrics.ts`. Do not silently fill absent dates or metrics with zero.

- [ ] **Step 4: Verify and commit**

Run: `node --test test/bitable-core-repository.test.mjs && node --experimental-strip-types --test tests/workbench-metrics.test.ts`  
Expected: PASS with equivalent metric behavior.

Commit: `feat: read core metrics from Feishu Bitable`

### Task 5: Task, Target, and Timeline Repositories

**Files:**
- Create: `server-local/repositories/task-repository.mjs`
- Create: `server-local/repositories/target-repository.mjs`
- Create: `server-local/repositories/timeline-repository.mjs`
- Create: `test/bitable-task-repository.test.mjs`
- Create: `test/bitable-target-timeline.test.mjs`
- Reference: `server/modules/workbench/task-person.ts`
- Reference: `server/modules/workbench/company-target.ts`
- Reference: `server/modules/workbench/timeline.ts`

**Interfaces:**
- Consumes: Bitable records, confirmed mappings, and authenticated local viewer identity.
- Produces: `getTasks(viewer): Promise<TasksDashboardResponse & ReadStatus>`, `getTargets(): Promise<TargetProgressResponse & ReadStatus>`, and `getTimeline(): Promise<TimelineResponse & ReadStatus>`.

- [ ] **Step 1: Write failing task tests**

Assert task/main linking, multiple owners, unresolved people, template filtering, source record IDs, pagination completeness, missing linked record handling, and field-specific mapping failure.

- [ ] **Step 2: Run task tests and verify RED**

Run: `node --test test/bitable-task-repository.test.mjs`  
Expected: FAIL because the task repository is absent.

- [ ] **Step 3: Implement task repository**

Preserve source record IDs and honest `resolved/unresolved/unassigned` status. Resolve people names only from available Feishu payloads; never invent names.

- [ ] **Step 4: Write failing target/timeline tests**

Assert company MTD/YTD totals, brand completeness, D11 date bounds, timeline normalization, absent-table module errors, and incompatible numeric/date fields.

- [ ] **Step 5: Run target/timeline tests and verify RED**

Run: `node --test test/bitable-target-timeline.test.mjs`  
Expected: FAIL because repositories are absent.

- [ ] **Step 6: Implement target and timeline repositories**

Match existing target and timeline semantics. If a required mapped table is not authorized or confirmed, return a typed module error rather than demo data.

- [ ] **Step 7: Verify and commit**

Run: `node --test test/bitable-task-repository.test.mjs test/bitable-target-timeline.test.mjs && node --experimental-strip-types --test tests/task-person.test.ts tests/company-target.test.ts tests/timeline.test.ts`  
Expected: PASS.

Commit: `feat: read workbench tasks targets and timeline`

### Task 6: Local Workbench HTTP API and Frontend Transport

**Files:**
- Create: `server-local/workbench-api.mjs`
- Modify: `server-local/auth-server.mjs`
- Modify: `client/src/v9-bridge.ts`
- Modify: `shared/api.interface.ts`
- Create: `test/local-workbench-api.test.mjs`
- Modify: `test/local-feishu-auth.test.mjs`

**Interfaces:**
- Consumes: repository methods from Tasks 4–5 and existing session identity.
- Produces: localhost GET routes matching `/api/workbench/overview|tasks|targets|timeline|sources|categories|products`; `loadWorkbench()` selects port 3001 locally and `axiosForBackend` online.

- [ ] **Step 1: Write failing local API tests**

Assert route contracts, authenticated viewer propagation, unauthenticated read policy, CORS credentials, cache metadata, one-source failure isolation, unknown route behavior, and absence of POST/PATCH/DELETE workbench mutation routes.

- [ ] **Step 2: Run the API tests and verify RED**

Run: `node --test test/local-workbench-api.test.mjs`  
Expected: FAIL because the API composer and routes do not exist.

- [ ] **Step 3: Implement API composition and GET routes**

Add `createWorkbenchApi(repositories, options)` and mount GET-only workbench routes on the existing local server. Apply a short per-module cache and include source/read timestamps.

- [ ] **Step 4: Write the failing frontend transport assertion**

Extend `test/local-feishu-auth.test.mjs` to assert localhost uses `http://<host>:3001/api/workbench/*`, online still uses `axiosForBackend`, and mutation verbs are absent.

- [ ] **Step 5: Run frontend assertion and verify RED**

Run: `node --test test/local-feishu-auth.test.mjs`  
Expected: FAIL on the missing local API transport.

- [ ] **Step 6: Implement local transport selection**

In `v9-bridge.ts`, use credentialed `fetch` against the local service only on localhost; keep the current Miaoda requests unchanged online. Dispatch successful modules and explicit module errors without replacing real data with demo values.

- [ ] **Step 7: Verify and commit**

Run: `node --test test/local-workbench-api.test.mjs test/local-feishu-auth.test.mjs && npm run type:check:client && npm run build:client`  
Expected: tests and type check PASS; production client build succeeds with only existing size/config warnings.

Commit: `feat: serve Bitable data to the local workbench`

### Task 7: Live Read-Only Verification and Handoff

**Files:**
- Modify: `docs/local-runtime.md`
- Modify: `README.md`
- Create: `scripts/verify-bitable-readonly.mjs`
- Create: `test/readonly-boundary.test.mjs`

**Interfaces:**
- Consumes: running local auth/API service and configured read-only app access.
- Produces: redacted verification summary and reproducible operator instructions.

- [ ] **Step 1: Write failing no-write boundary test**

Scan connector exports, local routes, and client calls. Assert no workbench create/update/delete method or POST/PATCH/DELETE route exists and `.env.local` remains ignored.

- [ ] **Step 2: Run the boundary test and verify RED if any write path exists**

Run: `node --test test/readonly-boundary.test.mjs`  
Expected: PASS only when the first release is read-only.

- [ ] **Step 3: Implement the redacted verification script**

`verify-bitable-readonly.mjs` checks auth configuration, authorized source metadata, nonzero or honestly empty record counts, required API response shapes, and timestamps. It prints source aliases/counts only.

- [ ] **Step 4: Update operator documentation**

Document required read-only scope, collaborator setup, startup command, URLs, expected module statuses, troubleshooting by Feishu error code, token rotation, and explicit statement that no write capability is enabled.

- [ ] **Step 5: Run full verification**

Run: `npm test && node --experimental-strip-types --test tests/*.test.ts && npm run type:check && npm run build:client && npm run verify:bitable`  
Expected: all tests/type checks pass; build succeeds; live summary reports each source as connected, honestly empty, or unavailable with a specific reason.

- [ ] **Step 6: Visual smoke test**

Open the local workbench after Feishu login. Verify core data and tasks render from real Bases, source/read time is visible, and a failing optional source does not blank successful modules. Do not perform any write action.

- [ ] **Step 7: Commit**

Commit: `docs: verify read-only Bitable workbench connection`

## Deferred Follow-Up

Create/update/archive/delete implementation is intentionally excluded from this plan. After read-only acceptance, derive separate plans from the same spec for: mutation permission matrix and preview flow; idempotent create/update conflict handling; soft-delete/archive; and explicitly allowlisted physical deletion with second confirmation.
