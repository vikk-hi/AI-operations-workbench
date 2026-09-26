import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorkbenchApi } from '../server-local/workbench-api.mjs';

test('serves read contracts and propagates the authenticated viewer', async () => {
  let seenViewer = null;
  const api = createWorkbenchApi({
    core: { async getOverview() { return { ranges: {}, daily: [], sourceUrl: 'core' }; } },
    tasks: { async getTasks(viewer) { seenViewer = viewer; return { tasks: [], templates: [], viewer }; } },
    targets: { async getTargets() { return { asOf: null }; } },
    timeline: { async getTimeline() { return { rows: [] }; } },
  }, { cacheTtlMs: 1000 });
  const viewer = { id: 'ou_1', name: '春豌', role: 'member' };
  assert.equal((await api.handle('GET', '/api/workbench/overview', viewer)).status, 200);
  assert.equal((await api.handle('GET', '/api/workbench/tasks', viewer)).status, 200);
  assert.deepEqual(seenViewer, viewer);
  assert.equal((await api.handle('POST', '/api/workbench/overview', viewer)).status, 405);
  assert.equal((await api.handle('GET', '/api/workbench/unknown', viewer)).status, 404);
});

test('isolates one module failure and caches only successful module reads', async () => {
  let coreCalls = 0;
  const api = createWorkbenchApi({
    core: { async getOverview() { coreCalls += 1; return { ok: true }; } },
    tasks: { async getTasks() { throw Object.assign(new Error('denied'), { kind: 'forbidden', code: 91403 }); } },
    targets: { async getTargets() { return {}; } }, timeline: { async getTimeline() { return {}; } },
  }, { cacheTtlMs: 5000, now: () => 1000 });
  assert.equal((await api.handle('GET', '/api/workbench/overview')).status, 200);
  assert.equal((await api.handle('GET', '/api/workbench/overview')).body.readStatus.cached, true);
  assert.equal(coreCalls, 1);
  const failed = await api.handle('GET', '/api/workbench/tasks');
  assert.equal(failed.status, 503);
  assert.deepEqual(failed.body.error, { kind: 'forbidden', code: 91403 });
});

test('requires login for task PATCH, returns verified data, and invalidates every task cache view', async () => {
  let reads = 0;
  const verified = { recordId: 'rec_1', syncStatus: 'verified', task: { id: 'rec_1', status: '进行中' } };
  const api = createWorkbenchApi({
    core: { async getOverview() { return {}; } },
    tasks: {
      async getTasks(viewer) { reads += 1; return { tasks: [{ id: String(reads) }], viewer }; },
      async updateTask() { return verified; },
    },
    targets: { async getTargets() { return {}; } },
    timeline: { async getTimeline() { return {}; } },
  }, { cacheTtlMs: 5000, now: () => 1000 });
  const viewer = { id: 'ou_1', name: '操作人', role: 'member' };

  assert.equal((await api.handle('PATCH', '/api/workbench/tasks/rec_1', null, { status: '进行中' })).status, 401);
  assert.equal((await api.handle('GET', '/api/workbench/tasks')).body.tasks[0].id, '1');
  assert.equal((await api.handle('GET', '/api/workbench/tasks', viewer)).body.tasks[0].id, '2');
  assert.deepEqual(await api.handle('PATCH', '/api/workbench/tasks/rec_1', viewer, { status: '进行中' }), { status: 200, body: verified });
  assert.equal((await api.handle('GET', '/api/workbench/tasks')).body.tasks[0].id, '3');
  assert.equal((await api.handle('GET', '/api/workbench/tasks', viewer)).body.tasks[0].id, '4');
  assert.equal((await api.handle('DELETE', '/api/workbench/tasks/rec_1', viewer)).status, 405);
});

test('requires login for task POST, returns the verified created task, and invalidates task caches', async () => {
  let reads = 0;
  let received = null;
  const verified = { recordId: 'rec_new', syncStatus: 'verified', task: { id: 'rec_new', title: '准备周报' } };
  const api = createWorkbenchApi({
    core: { async getOverview() { return {}; } },
    tasks: {
      async getTasks() { reads += 1; return { tasks: [{ id: String(reads) }] }; },
      async createTask(body, viewer) { received = { body, viewer }; return verified; },
    },
    targets: { async getTargets() { return {}; } },
    timeline: { async getTimeline() { return {}; } },
  }, { cacheTtlMs: 5000, now: () => 1000 });
  const viewer = { id: 'ou_1', name: '操作人', role: 'member' };
  const body = { title: '准备周报', responsibleOpenIds: ['ou_1'], status: '待处理' };

  assert.equal((await api.handle('POST', '/api/workbench/tasks', null, body)).status, 401);
  assert.equal((await api.handle('GET', '/api/workbench/tasks', viewer)).body.tasks[0].id, '1');
  assert.deepEqual(await api.handle('POST', '/api/workbench/tasks', viewer, body), { status: 201, body: verified });
  assert.deepEqual(received, { body, viewer });
  assert.equal((await api.handle('GET', '/api/workbench/tasks', viewer)).body.tasks[0].id, '2');
});

test('disables timeline writes and maps safe task update diagnostics', async () => {
  const mismatch = Object.assign(new Error('secret source details'), { kind: 'verification_mismatch', code: 'READBACK_MISMATCH' });
  const api = createWorkbenchApi({
    core: { async getOverview() { return {}; } },
    tasks: { async getTasks() { return {}; }, async updateTask() { throw mismatch; } },
    targets: { async getTargets() { return {}; } },
    timeline: { async getTimeline() { return {}; } },
  });
  const viewer = { id: 'ou_1', name: '操作人', role: 'member' };

  assert.equal((await api.handle('POST', '/api/workbench/timeline', viewer, { item: '节点' })).status, 405);
  assert.equal((await api.handle('PATCH', '/api/workbench/timeline/time_1', viewer, { completed: true })).status, 405);
  assert.equal((await api.handle('DELETE', '/api/workbench/timeline/time_1', viewer)).status, 405);
  assert.equal((await api.handle('POST', '/api/workbench/overview', viewer, {})).status, 405);
  assert.deepEqual(await api.handle('PATCH', '/api/workbench/tasks/rec_1', viewer, { status: '进行中' }), {
    status: 409,
    body: { error: { kind: 'verification_mismatch', code: 'READBACK_MISMATCH' } },
  });
});

test('invalidates task caches even when a write reaches readback mismatch', async () => {
  let reads = 0;
  const mismatch = Object.assign(new Error('mismatch'), { kind: 'verification_mismatch', code: 'READBACK_MISMATCH' });
  const api = createWorkbenchApi({
    core: { async getOverview() { return {}; } },
    tasks: {
      async getTasks() { reads += 1; return { tasks: [{ id: String(reads) }] }; },
      async updateTask() { throw mismatch; },
    },
    targets: { async getTargets() { return {}; } },
    timeline: { async getTimeline() { return {}; } },
  }, { cacheTtlMs: 5000, now: () => 1000 });
  const viewer = { id: 'ou_1', name: '操作人', role: 'member' };

  assert.equal((await api.handle('GET', '/api/workbench/tasks')).body.tasks[0].id, '1');
  assert.equal((await api.handle('GET', '/api/workbench/tasks')).body.readStatus.cached, true);
  assert.equal((await api.handle('PATCH', '/api/workbench/tasks/rec_1', viewer, { status: '进行中' })).status, 409);
  assert.equal((await api.handle('GET', '/api/workbench/tasks')).body.tasks[0].id, '2');
});

test('returns a safe committed record id when task creation succeeded before readback failed', async () => {
  const mismatch = Object.assign(new Error('mismatch'), { kind: 'verification_mismatch', code: 'READBACK_MISMATCH', committed: true, recordId: 'rec_committed' });
  const api = createWorkbenchApi({
    core: { async getOverview() { return {}; } },
    tasks: { async getTasks() { return {}; }, async createTask() { throw mismatch; } },
    targets: { async getTargets() { return {}; } },
    timeline: { async getTimeline() { return {}; } },
  });

  assert.deepEqual(await api.handle('POST', '/api/workbench/tasks', { id: 'ou_1' }, { title: '已落表任务' }), {
    status: 409,
    body: { error: { kind: 'verification_mismatch', code: 'READBACK_MISMATCH', committed: true, recordId: 'rec_committed' } },
  });
});

test('maps stale task choices and missing records to stable public diagnostics', async () => {
  const viewer = { id: 'ou_1', name: '操作人', role: 'member' };
  const createApi = (failure) => createWorkbenchApi({
    core: { async getOverview() { return {}; } },
    tasks: { async getTasks() { return {}; }, async updateTask() { throw failure; } },
    targets: { async getTargets() { return {}; } },
    timeline: { async getTimeline() { return {}; } },
  });

  const staleStatus = Object.assign(new Error('状态选项已失效'), { kind: 'invalid_task_update', code: 'STALE_STATUS' });
  const staleOwner = Object.assign(new Error('负责人选项已失效'), { kind: 'invalid_task_update', code: 'STALE_OWNER' });
  const staleSection = Object.assign(new Error('板块选项已失效'), { kind: 'invalid_task_update', code: 'STALE_SECTION' });
  const staleCategory = Object.assign(new Error('事项分类选项已失效'), { kind: 'invalid_task_update', code: 'STALE_CATEGORY' });
  const missing = Object.assign(new Error('记录不存在'), { kind: 'invalid_task_update', code: 'RECORD_NOT_FOUND' });
  assert.deepEqual(await createApi(staleStatus).handle('PATCH', '/api/workbench/tasks/rec_1', viewer, { status: '旧状态' }), {
    status: 409, body: { error: { kind: 'invalid_task_update', code: 'STALE_STATUS' } },
  });
  assert.equal((await createApi(staleOwner).handle('PATCH', '/api/workbench/tasks/rec_1', viewer, { responsibleOpenIds: ['ou_old'] })).status, 409);
  assert.equal((await createApi(staleSection).handle('PATCH', '/api/workbench/tasks/rec_1', viewer, { section: '旧板块' })).status, 409);
  assert.equal((await createApi(staleCategory).handle('PATCH', '/api/workbench/tasks/rec_1', viewer, { category: '旧分类' })).status, 409);
  assert.equal((await createApi(missing).handle('PATCH', '/api/workbench/tasks/rec_1', viewer, { status: '进行中' })).status, 404);
});
