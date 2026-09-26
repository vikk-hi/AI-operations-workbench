import assert from 'node:assert/strict';
import test from 'node:test';

import { createTaskRepository } from '../server-local/repositories/task-repository.mjs';

const definitions = [
  ['任务事项', 1], ['负责人', 11], ['板块', 3], ['事项分类', 3], ['子分组', 1], ['状态', 3], ['备注', 1], ['春豌', 21],
].map(([field_name, type], index) => ({ field_id: `fld_${index}`, field_name, type }));

test('maps tasks, multiple owners, links, and honest people status', async () => {
  const records = [
    { record_id: 'rec_1', fields: { 任务事项: '检查日报', 负责人: [{ id: 'ou_1', name: '春豌' }, { id: 'ou_2', name: '榅桲' }], 板块: '经营', 事项分类: '日报', 子分组: '复盘', 状态: '进行中', 春豌: ['linked_1'] } },
    { record_id: 'rec_2', fields: { 任务事项: '未分派任务', 负责人: [], 状态: '待处理' } },
  ];
  const repository = createTaskRepository({ source: { key: 'tasks', appToken: 'base', tableId: 'table' }, client: { async listFields() { return definitions; }, async listAllRecords() { return records; } } });
  const result = await repository.getTasks({ id: 'ou_viewer', name: 'Viewer', role: 'member' });
  assert.equal(result.tasks[0].id, 'rec_1');
  assert.deepEqual(result.tasks[0].responsiblePeople.map((item) => item.name), ['春豌', '榅桲']);
  assert.equal(result.tasks[0].peopleStatus, 'resolved');
  assert.equal(result.tasks[1].peopleStatus, 'unassigned');
  assert.equal(result.viewer.name, 'Viewer');
  assert.equal(result.source.readOnly, true);
});

test('fails on a renamed required task title field', async () => {
  const repository = createTaskRepository({ source: { key: 'tasks', appToken: 'base', tableId: 'table' }, client: { async listFields() { return definitions.filter((item) => item.field_name !== '任务事项'); }, async listAllRecords() { return []; } } });
  await assert.rejects(repository.getTasks(null), /任务事项/);
});
