# HM Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the existing Miaoda app into V9 alignment and implement the two approved end-to-end acceptance paths without touching original Bases.

**Architecture:** Retain the existing React/V9 shell and NestJS API. Add small domain services for target calculation, task state, source configuration, and BI normalization; use the platform-supported runtime SDK for external writes, and persist workflow state/IDs in Miaoda DB. Keep every unavailable external capability explicit in the UI.

**Tech Stack:** React 19, NestJS 10, TypeScript, Drizzle/Miaoda PostgreSQL, Feishu Base/Drive/IM through verified platform SDK, BI MCP for read-only development verification.

**Spec:** `docs/superpowers/specs/2026-09-26-hm-workbench-chain-design.md`

## Global Constraints

- The current app is `app_17es2ybencz`; local branch is `sprint/default`. Do not create a replacement app.
- Original Bases and BI are read-only. Write only to verified copies and only through supported runtime APIs.
- Keep company target and provisional brand daily target separate; never label demo/0-row BI results as live.
- Use real logged-in Feishu identity. A name string is not an authorization identity.
- No duplicate D11 publication or cross-table task records on retry; no success state before remote confirmation.
- User explicitly chose native execution without intermediate approval; skip independently blocked steps and report them at final handoff.

## Review Focus

- Empty or incomplete October target workbook must fail confirmation without altering any copied Base row (Task 4).
- Repeated confirm/create request must return the same operation and source record IDs (Tasks 4 and 5).
- A Base executor status of completed without result text or link must remain `待补交` (Task 5).
- BI TOP 200 returning zero rows must show unavailable, not a valid empty store (Task 3).
- A second-level category name under different first-level parents must remain distinct (Task 3).

---

### Task 1: Audit platform contracts and preserve baseline

**Files:** Modify none. Read `.spark/meta.json`, `.agents/skills/coding-guide/SKILL.md`, `user-identity/SKILL.md`, `server-contacts-contract/SKILL.md`, `plugin-guide/SKILL.md`, and the relevant references before code. Read `server/modules/workbench/*`, `shared/api.interface.ts`, and `client/src/v9-runtime.js`.

**Interfaces:** Produces a verified app ID, runtime SDK signatures, Base copy IDs, role IDs, source field map, and a baseline test/build result in the work log.

- [ ] **Step 1:** Run `git status --short`, `git log -3 --oneline`, `npm run type:check`, `npm run build`, and `node --test tests/*.test.ts`; record outputs without changing sources.
- [ ] **Step 2:** Read platform guidance and inspect package exports. Resolve platform roles with `lark-cli apps +role-list --app-id app_17es2ybencz --as user`; do not assume role IDs.
- [ ] **Step 3:** Inspect target and task Base schemas and Drive folder permissions read-only; record exact field IDs and copied resource IDs. If a copy does not exist, create only the approved copy under the designated test folder, then read back its ID.
- [ ] **Step 4:** Record unavailable capabilities (Xuanji direct call, BI TOP 200, Base change callback) as blocked independently, not as a reason to stop all implementation.

### Task 2: True identity and owner-aware task list

**Files:** Modify `shared/api.interface.ts`, `server/modules/workbench/workbench.service.ts`, `client/src/v9-runtime.js`; create `server/modules/workbench/task-person.ts`, `tests/task-person.test.ts`.

**Interfaces:** `normalizeTaskPeople(raw: unknown): Array<{id:string; name:string}>`; extend `TaskSummary` with `responsiblePeople` and `reviewerPeople` arrays. Existing `responsiblePerson` remains temporarily for compatibility.

- [ ] **Step 1: Failing test.** Test `normalizeTaskPeople([{id:'ou_1',name:'春豌'}])` returns a real ID and display name; empty/unresolved values return an empty list, never `人员已关联`.
- [ ] **Step 2:** Run `node --test tests/task-person.test.ts` and verify failure.
- [ ] **Step 3:** Implement normalization against the verified synced Base JSON shape. Keep IDs stable, escape displayed names, and show `待分派` when empty.
- [ ] **Step 4:** In V9 live task list render actual names and a selected-owner filter. Filter by ID, not name; `全部负责人` restores all rows. Developer identity is not a fake executor.
- [ ] **Step 4a:** Compare all three live modules against V9 screenshot and source for palette, layout, and copy; retain all five themes and default “咨询深蓝”. Add a browser assertion that switching themes preserves the current task and filter state.
- [ ] **Step 5:** Run test, typecheck, build, and commit only these files.

### Task 3: BI category and provisional product read path

**Files:** Create `server/modules/workbench/category-normalize.ts`, `tests/category-normalize.test.ts`; modify `shared/api.interface.ts`, `server/modules/workbench/workbench.controller.ts`, `server/modules/workbench/workbench.service.ts`, `client/src/v9-runtime.js`.

**Interfaces:** `normalizeCategoryRows(rows)` emits `{category, categoryII, period, source, metrics}` keyed by both category levels; `/api/workbench/categories` returns these plus `asOf` and `status`; `/api/workbench/products` returns a provider-scoped list with `coverage` and status.

- [ ] **Step 1: Failing test.** Input `[{category:'男装',categoryII:'衬衫'},{category:'女装',categoryII:'衬衫'}]`; assert two distinct keys. Test zero BI rows returns `status:'unavailable'`, not `status:'live'`.
- [ ] **Step 2:** Run test and verify failure.
- [ ] **Step 3:** Implement read adapter using the verified server-side BI contract if available. Never call the local Codex MCP from hosted application code; if no runtime contract exists, return an explicit unavailable status and keep the proven read-only BI snapshot separate from live data.
- [ ] **Step 4:** Wire industry-position selection, first/second category selectors, lower competition panel, and product first-category selector to shared selection state. Label industry rankings demo. Label TOP 200 by scope and do not show it as full-product data.
- [ ] **Step 4a:** Add source-selector configuration for an authorized developer: validate a candidate copy's Base/table IDs, field types, and read/write ability before activation; preserve record-source IDs on already-created tasks. Reject original Base IDs for write targets.
- [ ] **Step 5:** Run test/typecheck/build and inspect browser behavior, then commit.

### Task 4: October target workbook, approval, and copied-Base writeback

**Files:** Create `server/modules/workbench/target-plan.ts`, `server/modules/workbench/target-workflow.service.ts`, `tests/target-plan.test.ts`, `tests/target-workflow.test.ts`; modify `shared/api.interface.ts`, workbench controller/module, and V9 task detail UI.

**Interfaces:** `buildOctoberPlan(weights, monthlyGmvCents, monthlyNetCents)` returns 31 dated rows with GMV/NET/UV/CR/AOV. `confirmTargetDraft(requestId, reviewerId, draftId)` writes the exact 31 rows to the copied biz plan table and returns record IDs/operation state.

- [ ] **Step 1: Failing test.** Assert daily GMV cents sum to company October GMV cents, NET cents sum to NET target, `aov=gmv/(uv*cr)`, date set is 2026-10-01..31, duplicate/missing date is rejected, and replayed request ID does not write twice.
- [ ] **Step 2:** Run tests and verify failure.
- [ ] **Step 3:** Implement pure allocation and validation first. Excel draft remains an archive in the designated D11 Drive folder, not a local-browser-only artifact. If no supported Xuanji API is confirmed, accept a manual upload and label source accordingly.
- [ ] **Step 4:** Add authorized reviewer action in task detail: `待我确认` → `确认回填`/`退回`. Backend checks real identity, workbook hash, copied Base IDs, and exact date mapping. Persist operation and remote record IDs; expose partial failure as `待同步`.
- [ ] **Step 5:** Connect company GMV/NET MTD/YTD module and brand target read from the copied `biz plan目标`; keep original read-only. Add D11 2026-10-15..19 association by activity dates, with independent self-review node.
- [ ] **Step 6:** Run tests/typecheck/build, verify source/target sums by readback and no original mutation, then commit.

### Task 5: Cross-person task ledger and review state machine

**Files:** Create `server/modules/workbench/task-workflow.ts`, `server/modules/workbench/task-workflow.service.ts`, `tests/task-workflow.test.ts`; modify shared contracts, workbench controller/module, and V9 task/detail/progress UI.

**Interfaces:** `createTask(request)` writes one main record plus linked creator/executor personal records; `submitTask`, `returnTask`, and `approveTask` return a canonical state and all Base record IDs.

- [ ] **Step 1: Failing test.** Create 榅桲→春豌 task once and replay key; assert one main record and one record in each personal table. Submit without note/link → `待补交`; with result → `已提交、待指定审核人确认`; approve → creator review record completed in same action.
- [ ] **Step 2:** Run test and verify failure.
- [ ] **Step 3:** Implement writes via verified supported SDK to the task Base copy only, using existing main-table fields and personal-table closure fields. Resolve actual employee IDs before writes. Log partial success and retry using stored record IDs.
- [ ] **Step 4:** Make workbench list/detail and flow progress use the same canonical state. Base-side executor completion maps to submission, not final approval; simultaneous same-field edits pause synchronization for two-person resolution.
- [ ] **Step 5:** Implement downstream action creation upon reviewer approval with selected creator/owner; effect metrics may stay incomplete until actual review, but the plan must not claim measured effect.
- [ ] **Step 6:** Run tests/typecheck/build and Base copy readback, then commit.

### Task 6: Private notifications and file archiving

**Files:** Create `server/modules/workbench/task-notifications.service.ts`, `server/modules/workbench/task-files.service.ts`, `tests/task-notifications.test.ts`; modify workbench module/service and V9 task detail.

**Interfaces:** `notifyTransition(taskId, transitionId, recipients)` sends once after successful write, records delivery state, and permits retry without repeating prior sends. Files are stored under `临时任务/<task-number>/` or the D11 activity folder; Base records store links.

- [ ] **Step 1: Failing test.** On publish, send executor (and separate creator when applicable); on submit, send designated reviewer; on return, executor; on approval, creator and executor. Duplicate transition does not resend successful messages. Failed send leaves task committed with notification `待重试`.
- [ ] **Step 2:** Run test and verify failure.
- [ ] **Step 3:** Implement through verified Feishu IM/Drive runtime SDKs, not CLI subprocesses. Require actual recipient IDs and confirm shared-folder access; never log tokens or private file contents.
- [ ] **Step 4:** Show file links and notification state in task detail and progress; verify with test identities only, then commit.

### Task 7: Browser acceptance and deployment

**Files:** Modify only defects found in Tasks 2-6; add a concise verification report under `docs/verification/`.

**Interfaces:** A pass/fail/blocked matrix tied to the six spec acceptance items; each pass includes URL, record ID, observed status, and timestamp.

- [ ] **Step 1:** Run `npm run type:check`, `npm run build`, and all `node --test tests/*.test.ts`; fix failures without widening scope.
- [ ] **Step 2:** Walk two real-identity flows in browser: D11 draft/review/writeback and competitor task/submission/review/downstream task. Check V9 palette and category/owner filters; never treat a static screenshot as end-to-end evidence.
- [ ] **Step 3:** If any external dependency is unavailable, mark that row blocked and continue independent checks. Do not fabricate result files, BI rows, Skill execution, or sent IM.
- [ ] **Step 4:** Commit verified code, push `sprint/default` without force, create release, poll `release-get` to `finished`, and read back the online app. If publish fails, preserve local work and report the exact blocker.
- [ ] **Step 5:** Deliver a final matrix of passed/failed/skipped items, links to approved resources, and exact user actions still required.
