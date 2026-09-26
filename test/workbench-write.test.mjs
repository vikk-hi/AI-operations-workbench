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

test('rejects unknown modules and reports a signed-out write without refresh', async () => {
  let refreshes = 0;
  const writer = createWorkbenchWriter({
    baseUrl: 'http://127.0.0.1:3001',
    fetchImpl: async () => ({ ok: false, status: 401, async json() { return { error: '请先登录' }; } }),
    refresh: async () => { refreshes += 1; },
  });

  await assert.rejects(writer('overview', 'POST', '', {}), /不允许写入/);
  await assert.rejects(writer('tasks', 'POST', '', { title: 'A' }), /请先登录/);
  assert.equal(refreshes, 0);
});
