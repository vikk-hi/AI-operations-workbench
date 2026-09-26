import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('regenerated V9 source keeps live owner filter and identity', () => {
  const source: string = readFileSync('client/v9-source/live-adapter.js', 'utf8');
  assert.match(source, /liveTaskOwner/);
  assert.match(source, /liveOwnerNames/);
  assert.match(source, /tasks\?\.viewer/);
});

test('task contracts keep the exact Bitable table and all writable fields', () => {
  const service: string = readFileSync('server/modules/workbench/workbench.service.ts', 'utf8');
  const bridge: string = readFileSync('client/src/v9-bridge.ts', 'utf8');
  const taskSync = JSON.parse(readFileSync('sync/tasks.json', 'utf8'));
  const tasksUrl = service.match(/tasksUrl: '([^']+)'/)?.[1];
  assert.ok(tasksUrl);
  assert.equal(new URL(tasksUrl).searchParams.get('table'), new URL(taskSync.source.base_url).searchParams.get('table'));
  assert.match(bridge, /section\?: string \| null/);
  assert.match(bridge, /category\?: string \| null/);
});
