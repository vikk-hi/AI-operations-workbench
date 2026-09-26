import assert from 'node:assert/strict';
import test from 'node:test';

import { createTaskRepository } from '../server-local/repositories/task-repository.mjs';

const definitions = [
  ['任务事项', 1], ['负责人', 11], ['板块', 3], ['事项分类', 3], ['子分组', 1], ['状态', 3], ['备注', 1], ['春豌', 21],
].map(([field_name, type], index) => ({
  field_id: `fld_${index}`,
  field_name,
  type,
  ...(field_name === '状态' ? { property: { options: [{ name: '待处理' }, { name: '进行中' }, { name: '已完成' }] } } : {}),
}));

test('maps tasks, multiple owners, links, and honest people status', async () => {
  const records = [
    { record_id: 'rec_1', fields: { 任务事项: '检查日报', 负责人: [{ id: 'ou_1', name: '春豌' }, { id: 'ou_2', name: '同名人员' }], 板块: '经营', 事项分类: '日报', 子分组: '复盘', 状态: '进行中', 备注: '核对完整日', 春豌: ['linked_1'] } },
    { record_id: 'rec_2', fields: { 任务事项: '未分派任务', 负责人: [{ id: 'ou_3', name: '同名人员' }, { id: 'ou_1', name: '春豌' }], 状态: '待处理' } },
  ];
  const repository = createTaskRepository({ source: { key: 'tasks', appToken: 'base', tableId: 'table' }, client: { async listFields() { return definitions; }, async listAllRecords() { return records; } } });
  const result = await repository.getTasks({ id: 'ou_viewer', name: 'Viewer', role: 'member' });
  assert.equal(result.tasks[0].id, 'rec_1');
  assert.deepEqual(result.tasks[0].responsiblePeople.map((item) => item.name), ['春豌', '同名人员']);
  assert.equal(result.tasks[0].peopleStatus, 'resolved');
  assert.equal(result.tasks[1].peopleStatus, 'resolved');
  assert.equal(result.tasks[0].category, '日报');
  assert.equal(result.tasks[0].subgroup, '复盘');
  assert.equal(result.tasks[0].notes, '核对完整日');
  assert.equal(result.tasks[1].category, null);
  assert.equal(result.tasks[1].subgroup, null);
  assert.equal(result.tasks[1].notes, null);
  assert.deepEqual(result.statusOptions, ['待处理', '进行中', '已完成']);
  assert.deepEqual(result.ownerOptions, [
    { id: 'ou_1', name: '春豌' },
    { id: 'ou_2', name: '同名人员' },
    { id: 'ou_3', name: '同名人员' },
  ]);
  assert.equal(result.viewer.name, 'Viewer');
  assert.equal(result.source.readOnly, false);
  assert.equal(result.source.writable, true);
});

test('fails on a renamed required task title field', async () => {
  const repository = createTaskRepository({ source: { key: 'tasks', appToken: 'base', tableId: 'table' }, client: { async listFields() { return definitions.filter((item) => item.field_name !== '任务事项'); }, async listAllRecords() { return []; } } });
  await assert.rejects(repository.getTasks(null), /任务事项/);
});

test('creates and updates tasks using only the writable field allowlist', async () => {
  const writes = [];
  const client = {
    async createRecord(_app, _table, fields) { writes.push(fields); return { record_id: 'rec_new', fields }; },
    async updateRecord(_app, _table, recordId, fields) { writes.push(fields); return { record_id: recordId, fields }; },
  };
  const repository = createTaskRepository({ client, source: { key: 'tasks', appToken: 'base', tableId: 'table' } });

  const created = await repository.createTask({ title: '  新任务  ', section: '经营', status: '未开始', responsibleOpenIds: ['ou_1'], ignored: 'no' }, { id: 'ou_actor', name: '操作人' });
  const updated = await repository.updateTask('rec_new', { status: '进行中', title: '新任务 2', ignored: 'no' }, { id: 'ou_actor', name: '操作人' });

  assert.deepEqual(created, { recordId: 'rec_new' });
  assert.deepEqual(updated, { recordId: 'rec_new' });
  assert.deepEqual(writes, [
    { 任务事项: '新任务', 板块: '经营', 状态: '未开始', 负责人: [{ id: 'ou_1' }] },
    { 状态: '进行中', 任务事项: '新任务 2' },
  ]);
});

test('rejects empty task writes and deletes only an explicit record id', async () => {
  let deleted = '';
  const repository = createTaskRepository({
    client: { async deleteRecord(_app, _table, recordId) { deleted = recordId; return { deleted: true }; } },
    source: { key: 'tasks', appToken: 'base', tableId: 'table' },
  });
  await assert.rejects(repository.createTask({ title: '  ' }, { id: 'ou_1' }), /任务标题不能为空/);
  await assert.rejects(repository.updateTask('', { status: '进行中' }, { id: 'ou_1' }), /记录 ID/);
  assert.deepEqual(await repository.deleteTask('rec_1', { id: 'ou_1' }), { recordId: 'rec_1', deleted: true });
  assert.equal(deleted, 'rec_1');
});
