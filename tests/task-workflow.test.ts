import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newTaskWorkflow, transitionTask } from '../server/modules/workbench/task-workflow.ts';

test('submission requires a result; reviewer approval closes creator record', () => {
  let task = newTaskWorkflow('TASK-2026-001', 'creator-1', 'executor-1', 'reviewer-1');
  task = transitionTask(task, { key: 's1', type: 'submit', actorId: 'executor-1', result: '' });
  assert.equal(task.status, 'awaiting-result');
  task = transitionTask(task, { key: 's2', type: 'submit', actorId: 'executor-1', result: '竞品结果已整理', resultLink: 'https://example.com/result' });
  assert.equal(task.status, 'submitted');
  assert.equal(task.creatorRecordDone, false);
  task = transitionTask(task, { key: 'a1', type: 'approve', actorId: 'reviewer-1' });
  assert.equal(task.status, 'approved');
  assert.equal(task.creatorRecordDone, true);
  assert.deepEqual(task.notify, ['creator-1', 'executor-1']);
});

test('replaying a transition does not duplicate approval or notification', () => {
  const initial = newTaskWorkflow('TASK-2026-002', 'creator-1', 'executor-1', 'reviewer-1');
  const once = transitionTask(initial, { key: 's1', type: 'submit', actorId: 'executor-1', result: '报告' });
  assert.deepEqual(transitionTask(once, { key: 's1', type: 'submit', actorId: 'executor-1', result: '报告' }), once);
});

test('only designated reviewer can return/approve; two-person sync conflict pauses', () => {
  const initial = newTaskWorkflow('TASK-2026-003', 'creator-1', 'executor-1', 'reviewer-1');
  const submitted = transitionTask(initial, { key: 's1', type: 'submit', actorId: 'executor-1', result: '报告' });
  assert.throws(() => transitionTask(submitted, { key: 'a1', type: 'approve', actorId: 'someone-else' }), /指定审核人/);
  const conflict = transitionTask(submitted, { key: 'c1', type: 'conflict', actorId: 'creator-1' });
  assert.equal(conflict.status, 'sync-paused');
  assert.throws(() => transitionTask(conflict, { key: 'a2', type: 'approve', actorId: 'reviewer-1' }), /暂停/);
});
