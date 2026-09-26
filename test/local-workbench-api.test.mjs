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

test('requires a signed-in viewer and routes task writes with cache invalidation', async () => {
  let reads = 0;
  const api = createWorkbenchApi({
    core: { async getOverview() { return {}; } },
    tasks: {
      async getTasks() { reads += 1; return { tasks: [{ id: String(reads) }] }; },
      async createTask(body) { return { recordId: `created:${body.title}` }; },
      async updateTask(id) { return { recordId: id }; },
      async deleteTask(id) { return { recordId: id, deleted: true }; },
    },
    targets: { async getTargets() { return {}; } },
    timeline: { async getTimeline() { return {}; } },
  }, { cacheTtlMs: 5000, now: () => 1000 });
  const viewer = { id: 'ou_1', name: '操作人', role: 'member' };

  assert.equal((await api.handle('POST', '/api/workbench/tasks', null, { title: 'A' })).status, 401);
  assert.equal((await api.handle('GET', '/api/workbench/tasks', viewer)).body.tasks[0].id, '1');
  assert.deepEqual(await api.handle('POST', '/api/workbench/tasks', viewer, { title: 'A' }), { status: 201, body: { recordId: 'created:A' } });
  assert.equal((await api.handle('GET', '/api/workbench/tasks', viewer)).body.tasks[0].id, '2');
  assert.deepEqual(await api.handle('PATCH', '/api/workbench/tasks/rec_1', viewer, { status: '进行中' }), { status: 200, body: { recordId: 'rec_1' } });
  assert.deepEqual(await api.handle('DELETE', '/api/workbench/tasks/rec_1', viewer), { status: 200, body: { recordId: 'rec_1', deleted: true } });
});

test('routes timeline writes and never exposes a core-data mutation route', async () => {
  const api = createWorkbenchApi({
    core: { async getOverview() { return {}; } },
    tasks: { async getTasks() { return {}; } },
    targets: { async getTargets() { return {}; } },
    timeline: {
      async getTimeline() { return {}; },
      async createTimelineItem() { return { recordId: 'time_1' }; },
      async updateTimelineItem(id) { return { recordId: id }; },
      async deleteTimelineItem(id) { return { recordId: id, deleted: true }; },
    },
  });
  const viewer = { id: 'ou_1', name: '操作人', role: 'member' };

  assert.equal((await api.handle('POST', '/api/workbench/timeline', viewer, { item: '节点' })).status, 201);
  assert.equal((await api.handle('PATCH', '/api/workbench/timeline/time_1', viewer, { completed: true })).status, 200);
  assert.equal((await api.handle('DELETE', '/api/workbench/timeline/time_1', viewer)).status, 200);
  assert.equal((await api.handle('POST', '/api/workbench/overview', viewer, {})).status, 405);
});
