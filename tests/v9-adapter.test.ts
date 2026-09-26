import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('regenerated V9 source keeps live owner filter and identity', () => {
  const source: string = readFileSync('client/v9-source/live-adapter.js', 'utf8');
  assert.match(source, /liveTaskOwner/);
  assert.match(source, /liveOwnerNames/);
  assert.match(source, /tasks\?\.viewer/);
});
