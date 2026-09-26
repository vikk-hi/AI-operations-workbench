import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorkbenchWriter } from '../client/src/workbench-write.mjs';

test('writes an allowlisted module record and refreshes workbench data', async () => {
  const calls = [];
  let refreshes = 0;
  const writer = createWorkbenchWriter({
    baseUrl: 'http://127.0.0.1:3001',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 200, async json() { return { recordId: 'rec_1' }; } };
    },
    refresh: async () => { refreshes += 1; },
  });

  assert.deepEqual(await writer('tasks', 'PATCH', 'rec_1', { status: '进行中' }), { recordId: 'rec_1' });
  assert.equal(calls[0].url, 'http://127.0.0.1:3001/api/workbench/tasks/rec_1');
  assert.equal(calls[0].init.credentials, 'include');
  assert.deepEqual(JSON.parse(calls[0].init.body), { status: '进行中' });
  assert.equal(refreshes, 1);
});

test('rejects every browser write except task PATCH with a record id', async () => {
  let fetches = 0;
  const writer = createWorkbenchWriter({
    baseUrl: 'http://127.0.0.1:3001',
    fetchImpl: async () => { fetches += 1; return { ok: true, status: 200, async json() { return {}; } }; },
    refresh: async () => {},
  });

  await assert.rejects(writer('tasks', 'POST', '', { title: 'A' }), /不允许写入/);
  await assert.rejects(writer('tasks', 'DELETE', 'rec_1'), /不允许写入/);
  await assert.rejects(writer('tasks', 'PATCH', '', { status: '进行中' }), /记录 ID/);
  await assert.rejects(writer('timeline', 'PATCH', 'time_1', { completed: true }), /不允许写入/);
  await assert.rejects(writer('overview', 'PATCH', 'rec_1', {}), /不允许写入/);
  assert.equal(fetches, 0);
});

test('reports a signed-out task update without refresh', async () => {
  let refreshes = 0;
  const writer = createWorkbenchWriter({
    baseUrl: 'http://127.0.0.1:3001',
    fetchImpl: async () => ({ ok: false, status: 401, async json() { return { error: '请先登录' }; } }),
    refresh: async () => { refreshes += 1; },
  });

  await assert.rejects(writer('tasks', 'PATCH', 'rec_1', { status: '进行中' }), /请先登录/);
  assert.equal(refreshes, 0);
});

test('reports a verified write whose strict page refresh fails', async () => {
  const writer = createWorkbenchWriter({
    baseUrl: 'http://127.0.0.1:3001',
    fetchImpl: async () => ({ ok: true, status: 200, async json() { return { syncStatus: 'verified' }; } }),
    refresh: async () => { throw new Error('module refresh failed'); },
  });

  await assert.rejects(writer('tasks', 'PATCH', 'rec_1', { status: '进行中' }), /数据已写入并验证.*页面刷新失败/);
});

test('refreshes stale task choices before reporting a specific update error', async () => {
  let refreshes = 0;
  const writer = createWorkbenchWriter({
    baseUrl: 'http://127.0.0.1:3001',
    fetchImpl: async () => ({
      ok: false, status: 409,
      async json() { return { error: { kind: 'invalid_task_update', code: 'STALE_STATUS' } }; },
    }),
    refresh: async () => { refreshes += 1; },
  });

  await assert.rejects(writer('tasks', 'PATCH', 'rec_1', { status: '旧状态' }), /状态选项已更新/);
  assert.equal(refreshes, 1);
});
