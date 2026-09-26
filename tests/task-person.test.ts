import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeTaskPeople } from '../server/modules/workbench/task-person.ts';

test('keeps real Base user IDs and names', () => {
  assert.deepEqual(
    normalizeTaskPeople([{ id: 'ou_1', name: '春豌' }]),
    [{ id: 'ou_1', name: '春豌' }],
  );
});

test('does not invent people for missing or unresolved values', () => {
  assert.deepEqual(normalizeTaskPeople(null), []);
  assert.deepEqual(normalizeTaskPeople([{ id: 'ou_1' }]), []);
  assert.deepEqual(normalizeTaskPeople('123456789'), []);
});

test('parses synced JSON and removes duplicate IDs', () => {
  assert.deepEqual(
    normalizeTaskPeople('[{"id":"ou_1","name":"春豌"},{"id":"ou_1","name":"春豌"}]'),
    [{ id: 'ou_1', name: '春豌' }],
  );
});
