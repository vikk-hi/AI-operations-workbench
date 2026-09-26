# Task Bitable Update Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary task CRUD prompts with a focused workbench that reads existing Feishu Bitable tasks and updates only status and responsible people, then verifies every write by reading it back.

**Architecture:** Keep Feishu Bitable as the only task source. Extend the task repository to publish source-defined status and owner choices, validate a narrow PATCH payload, update one record, and verify the returned source state. Keep view filtering and edit-draft behavior in a small pure client module, while the existing V9 live adapter renders the modal and delegates network writes through the existing bridge.

**Tech Stack:** Node.js 22 ESM, native `node:test`, Feishu Bitable Open API, TypeScript response contracts, Vite, existing V9 HTML/CSS runtime.

**Spec:** `docs/superpowers/specs/2026-09-26-task-bitable-update-loop-design.md`

## Global Constraints

- The only task source is Base `O4XhbiUw2aa5yRsgR8fckrNpnXe`, table `tbl1Hi7UvvXTzTiQ` (`工作日报任务`).
- Anonymous users may read tasks but may not submit writes.
- Only `状态` and `负责人` may be changed; task creation and deletion are disabled.
- All timeline mutations are disabled in this phase.
- Status choices come from the current Bitable single-select field definition; they are not hard-coded.
- Responsible-person choices come only from people already resolved in current task records and are keyed by Feishu person ID.
- A write is successful only when a fresh source read matches the submitted status and responsible-person IDs.
- No Miaoda production update, address-book permission, local database, offline write queue, or AI task creation is added.
- The final real-record smoke test must use a user-approved record and restore its original values.

## Review Focus

- A stale status option removed from Bitable between page load and save must be rejected without changing the record; covered in Task 2 repository tests.
- Duplicate display names with different Feishu IDs must remain distinct owner choices; covered in Task 1 repository tests.
- A payload containing an allowed field plus an extra field must be rejected, not partially accepted; covered in Task 2 repository tests.
- A Feishu update response followed by mismatched readback must return a conflict-like diagnostic and never “已同步”; covered in Tasks 2 and 3 tests.
- A logged-in user with no assigned open tasks must see an empty “我的未完成” view and a usable “全部任务” switch; covered in Task 4 model tests.

---

### Task 1: Publish source-defined task choices and complete read-only task details

**Files:**
- Modify: `shared/api.interface.ts`
- Modify: `server-local/repositories/task-repository.mjs`
- Test: `test/bitable-task-repository.test.mjs`

**Interfaces:**
- Produces: `TasksDashboardResponse.statusOptions: string[]`
- Produces: `TasksDashboardResponse.ownerOptions: Array<{ id: string; name: string }>`
- Produces: `TaskSummary.category`, `TaskSummary.subgroup`, and `TaskSummary.notes`, each `string | null`
- Preserves: `TasksDashboardResponse.viewer.id` as the current Feishu `open_id`

- [ ] **Step 1: Extend the repository read test with field options, duplicate names, and optional details**

Add field metadata for `状态` with `property.options` and records containing two people with the same display name but different IDs. Assert that status choices preserve the field-definition order, owner choices deduplicate by ID, both same-name IDs remain present, and category/subgroup/notes map without invented values.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test test/bitable-task-repository.test.mjs`

Expected: FAIL because `statusOptions`, `ownerOptions`, and the additional task detail properties are absent.

- [ ] **Step 3: Extend the shared response interfaces**

Add the exact properties listed in this task's Interfaces block. Correct the source contract from the obsolete literal `readOnly: true` to `readOnly: boolean; writable: boolean` and add the existing `readStatus` shape used by the local repository.

- [ ] **Step 4: Implement option extraction in `createTaskRepository().getTasks(viewer)`**

Read `状态` options from field metadata, map optional detail fields through the existing field reader, and derive owner choices from resolved record people keyed by ID. Do not query the Feishu address book.

- [ ] **Step 5: Run the focused repository and client type checks**

Run: `node --test test/bitable-task-repository.test.mjs && npm run type:check:client`

Expected: all focused tests pass and TypeScript exits 0.

- [ ] **Step 6: Commit the read-contract change**

```bash
git add shared/api.interface.ts server-local/repositories/task-repository.mjs test/bitable-task-repository.test.mjs
git commit -m "feat: expose task field choices"
```

### Task 2: Restrict task writes and verify source readback

**Files:**
- Modify: `server-local/bitable/client.mjs`
- Modify: `server-local/repositories/task-repository.mjs`
- Test: `test/bitable-client.test.mjs`
- Test: `test/bitable-task-repository.test.mjs`

**Interfaces:**
- Produces: `client.getRecord(appToken: string, tableId: string, recordId: string): Promise<BitableRecord>`
- Produces: `tasks.updateTask(id: string, input: { status?: string; responsibleOpenIds?: string[] }, viewer): Promise<{ recordId: string; syncStatus: 'verified'; task: TaskSummary }>`
- Produces diagnostic: `{ kind: 'verification_mismatch', code: 'READBACK_MISMATCH' }` when fresh source values do not match the submitted values
- Removes: `tasks.createTask` and `tasks.deleteTask`

- [ ] **Step 1: Add a failing Bitable client test for reading one record**

Assert `getRecord('base', 'table', 'rec_1')` sends GET to `/apps/base/tables/table/records/rec_1` and returns `payload.data.record`; assert missing record data raises `BitableError('malformed_payload', 'MISSING_RECORD', ...)`.

- [ ] **Step 2: Run the client test and verify it fails**

Run: `node --test test/bitable-client.test.mjs`

Expected: FAIL because `getRecord` is not defined.

- [ ] **Step 3: Implement `getRecord` and export it from `createBitableClient`**

Reuse `recordPath`; do not add another authentication or fetch layer.

- [ ] **Step 4: Replace CRUD repository tests with PATCH-only validation and readback tests**

Add assertions for: valid status update; valid multi-person update; empty update rejection; unknown property rejection even beside a valid field; stale status rejection; unknown owner ID rejection; same ID deduplication; empty owner array support; missing record; and readback mismatch diagnostic.

- [ ] **Step 5: Run the repository tests and verify they fail for the old permissive CRUD behavior**

Run: `node --test test/bitable-task-repository.test.mjs`

Expected: FAIL because create/delete still exist, extra fields are ignored, choices are not validated, and no readback occurs.

- [ ] **Step 6: Implement PATCH-only normalization and verification**

In `task-repository.mjs`, accept exactly `status` and/or `responsibleOpenIds`. Before update, fetch current field definitions and task records to build valid choices; after update, call `getRecord`, map the record through the same task mapper, and compare status plus sorted owner-ID sets only for fields submitted by the caller.

- [ ] **Step 7: Run Bitable client and repository tests**

Run: `node --test test/bitable-client.test.mjs test/bitable-task-repository.test.mjs`

Expected: all tests pass.

- [ ] **Step 8: Commit the verified repository write**

```bash
git add server-local/bitable/client.mjs server-local/repositories/task-repository.mjs test/bitable-client.test.mjs test/bitable-task-repository.test.mjs
git commit -m "feat: verify task updates from Bitable"
```

### Task 3: Close unsupported mutation routes and preserve honest errors

**Files:**
- Modify: `server-local/workbench-api.mjs`
- Modify: `client/src/workbench-write.mjs`
- Test: `test/local-workbench-api.test.mjs`
- Test: `test/workbench-write.test.mjs`

**Interfaces:**
- Preserves: `PATCH /api/workbench/tasks/:recordId`
- Removes: `POST /api/workbench/tasks`, `DELETE /api/workbench/tasks/:recordId`, and every non-GET `/api/workbench/timeline` route
- Produces: HTTP 409 for `verification_mismatch`; 401 for missing login; 403 for Feishu permission denial; 400 for invalid task input; 405 for disabled mutations
- Narrows: `createWorkbenchWriter` to task PATCH only

- [ ] **Step 1: Rewrite API tests for the narrow mutation surface**

Assert anonymous PATCH returns 401; authenticated task PATCH returns the repository's verified body; POST/DELETE task requests return 405; all timeline mutations return 405; a successful PATCH invalidates both anonymous and viewer-keyed task cache entries; and readback mismatch maps to 409 with only safe diagnostic fields.

- [ ] **Step 2: Run the API test and verify it fails**

Run: `node --test test/local-workbench-api.test.mjs`

Expected: FAIL because task POST/DELETE and timeline writes are still routed and mismatch is not mapped to 409.

- [ ] **Step 3: Reduce `writeRoutes` and map the verification diagnostic**

Route only authenticated task PATCH. Keep error responses redacted to `kind` and `code`, and clear every task cache key only after the repository returns a verified result.

- [ ] **Step 4: Narrow the browser writer test and implementation**

Assert only `writer('tasks', 'PATCH', nonEmptyRecordId, allowedBody)` is accepted. Reject POST, DELETE, timeline, missing IDs, and unknown modules before fetch; keep credentialed fetch and refresh-after-success behavior.

- [ ] **Step 5: Run both route-boundary tests**

Run: `node --test test/local-workbench-api.test.mjs test/workbench-write.test.mjs`

Expected: all tests pass.

- [ ] **Step 6: Commit the closed write boundary**

```bash
git add server-local/workbench-api.mjs client/src/workbench-write.mjs test/local-workbench-api.test.mjs test/workbench-write.test.mjs
git commit -m "fix: limit workbench writes to task updates"
```

### Task 4: Build the focused task view and explicit edit modal

**Files:**
- Create: `client/src/live-task-model.mjs`
- Modify: `client/v9-source/live-adapter.js`
- Modify: `client/v9-source/v9.css`
- Generated: `client/src/v9-runtime.js`
- Test: `test/live-task-model.test.mjs`
- Test: `test/local-feishu-auth.test.mjs`

**Interfaces:**
- Produces: `filterTasks(tasks, { scope, viewerId, completion, status, ownerId, section, search })`
- Produces: `taskFilterOptions(tasks, statusOptions, ownerOptions)`
- Produces: `createTaskEditDraft(task)` and `buildTaskPatch(originalTask, draft)`
- Consumes: `TasksDashboardResponse.statusOptions`, `ownerOptions`, `viewer`, and `TaskSummary` from Task 1
- Consumes: `window.__hmWrite('tasks', 'PATCH', recordId, body)` from Task 3

- [ ] **Step 1: Add failing pure-model tests**

Cover default “mine + open” filtering, no assigned tasks, all-task switch, exact status/owner/section filters, case-insensitive search, duplicate owner IDs, unchanged draft producing no patch, status-only patch, owner-only patch with stable ID ordering, and empty owner selection.

- [ ] **Step 2: Run the model test and verify it fails**

Run: `node --test test/live-task-model.test.mjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure task model**

Keep completion detection in one exported helper so the view and statistics use the same rule. The module must not access DOM, global runtime state, or network APIs.

- [ ] **Step 4: Replace temporary CRUD prompts and controls in the live adapter**

Remove `liveCreateTask`, `liveDelete`, timeline mutation functions, the create button override, task delete links, and every `window.prompt` used by live task writes. Default scope to the authenticated viewer's unfinished tasks; expose “我的未完成” and “全部任务”, plus status, owner, section, and search filters.

- [ ] **Step 5: Implement the task detail/edit modal**

Use the existing `openModal`/`closeModal` shell. Show title, board, category, subgroup, and notes read-only. Render status from `statusOptions` and responsible people as multi-select checkboxes from `ownerOptions`. Disable save for anonymous users, unchanged drafts, or while a save is in flight. Submit one PATCH and close only after the verified response and refresh succeed; otherwise preserve the draft and show the safe error.

- [ ] **Step 6: Restore timeline and global copy to read-only wording**

Remove activity add/toggle/delete controls and change source/footer text so it says only task status/responsible-person updates are enabled. Do not claim task creation, deletion, or timeline writeback.

- [ ] **Step 7: Add adapter boundary assertions**

In `local-feishu-auth.test.mjs`, assert generated source contains the edit action and task PATCH call, and does not contain `live-task-create`, `task-delete`, `live-timeline-create`, timeline mutation actions, or live `window.prompt` task inputs.

- [ ] **Step 8: Generate the runtime and run focused UI checks**

Run: `node scripts/build-v9-client.mjs && node --test test/live-task-model.test.mjs test/local-feishu-auth.test.mjs && npm run type:check:client && npm run build:client`

Expected: all tests and type checking pass; Vite build exits 0 with only previously known chunk/dynamic-import warnings.

- [ ] **Step 9: Commit the focused task interface**

```bash
git add client/src/live-task-model.mjs client/v9-source/live-adapter.js client/v9-source/v9.css client/src/v9-runtime.js test/live-task-model.test.mjs test/local-feishu-auth.test.mjs
git commit -m "feat: add verified task update interface"
```

### Task 5: Update operating documentation and verify the complete local chain

**Files:**
- Modify: `README.md`
- Modify: `docs/local-runtime.md`
- Modify: `docs/bitable-field-map.md`

**Interfaces:**
- Documents: task reads are public locally, task PATCH requires Feishu login, only status/responsible people are writable, and all other workbench modules are read-only
- Documents: exact local URLs and the user-controlled real-write verification procedure

- [ ] **Step 1: Update the runtime and field-map documentation**

Remove obsolete “strictly read-only” and broad CRUD claims. Document the exact Base/table IDs, writable fields, dynamic option sources, readback verification, disabled mutations, and safe error behavior without including credentials or tokens.

- [ ] **Step 2: Run the complete automated verification**

Run: `npm test && npm run type:check:client && npm run build:client && node --experimental-strip-types --test tests/*.test.ts && git diff --check`

Expected: all Node test suites pass, TypeScript exits 0, the client build succeeds, imported TypeScript tests pass, and `git diff --check` is empty.

- [ ] **Step 3: Restart the local service and perform read-only browser verification**

Open `http://127.0.0.1:8080/client/index.html`, sign in if needed, and verify real tasks load; “我的未完成” is the default; all filters work; no create/delete/timeline mutation controls exist; and the edit modal only exposes status and responsible people.

- [ ] **Step 4: Pause for a user-approved real-record smoke test**

Present the target record ID, title, current status, and current responsible people. Do not write until the user approves that exact record and temporary change.

- [ ] **Step 5: Execute and restore the approved real-record test**

Change one approved writable value, verify the workbench reads the same value back, restore the original value, and verify restoration by a second fresh read. Record only non-secret evidence in the handoff.

- [ ] **Step 6: Commit documentation and final verification notes**

```bash
git add README.md docs/local-runtime.md docs/bitable-field-map.md
git commit -m "docs: document verified task update flow"
```

- [ ] **Step 7: Review branch scope before integration**

Run: `git status --short && git log --oneline --decorate main..HEAD && git diff --stat main...HEAD`

Expected: only planned task-update-loop files are changed, no credentials or runtime logs are tracked, and the working tree is clean.
