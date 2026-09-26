import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorkbenchApi } from '../server-local/workbench-api.mjs';

test('serves GET-only module contracts and propagates the authenticated viewer', async () => {
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
  assert.equal((await api.handle('POST', '/api/workbench/tasks', viewer)).status, 405);
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
