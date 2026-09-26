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
  ...(field_name === '板块' ? { property: { options: [{ name: '经营' }, { name: '活动' }] } } : {}),
  ...(field_name === '事项分类' ? { property: { options: [{ name: '日报' }, { name: '大促' }] } } : {}),
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
  assert.deepEqual(result.sectionOptions, ['经营', '活动']);
  assert.deepEqual(result.categoryOptions, ['日报', '大促']);
  assert.deepEqual(result.ownerOptions, [
    { id: 'ou_1', name: '春豌' },
    { id: 'ou_2', name: '同名人员' },
    { id: 'ou_3', name: '同名人员' },
    { id: 'ou_viewer', name: 'Viewer' },
  ]);
  assert.equal(result.viewer.name, 'Viewer');
  assert.equal(result.source.readOnly, false);
  assert.equal(result.source.writable, true);
});

test('fails on a renamed required task title field', async () => {
  const repository = createTaskRepository({ source: { key: 'tasks', appToken: 'base', tableId: 'table' }, client: { async listFields() { return definitions.filter((item) => item.field_name !== '任务事项'); }, async listAllRecords() { return []; } } });
  await assert.rejects(repository.getTasks(null), /任务事项/);
});

const peopleById = new Map([['ou_1', '春豌'], ['ou_2', '榅桲'], ['ou_3', '同名人员']]);

function writeFixture(options = {}) {
  const records = options.records ?? [{
    record_id: 'rec_1',
    fields: { 任务事项: '检查日报', 负责人: [{ id: 'ou_1', name: '春豌' }], 板块: '经营', 状态: '待处理' },
  }, {
    record_id: 'rec_owner_choices',
    fields: { 任务事项: '候选负责人来源', 负责人: [{ id: 'ou_2', name: '榅桲' }, { id: 'ou_3', name: '同名人员' }], 板块: '经营', 状态: '待处理' },
  }];
  const writes = [];
  const client = {
    async listFields() { return definitions; },
    async listAllRecords() { return records; },
    async updateRecord(_app, _table, recordId, fields) {
      writes.push(fields);
      const record = records.find((item) => item.record_id === recordId);
      if (record) {
        const normalized = fields.负责人
          ? { ...fields, 负责人: fields.负责人.map(({ id }) => ({ id, name: peopleById.get(id) })) }
          : fields;
        record.fields = { ...record.fields, ...normalized };
      }
      return { record_id: recordId, fields };
    },
    async getRecord(_app, _table, recordId) {
      if (options.readback) return options.readback(recordId, records);
      return records.find((item) => item.record_id === recordId);
    },
  };
  return {
    writes,
    repository: createTaskRepository({ client, source: { key: 'tasks', appToken: 'base', tableId: 'table' } }),
  };
}

test('updates only valid task status and verifies the fresh record', async () => {
  const { repository, writes } = writeFixture();

  const result = await repository.updateTask('rec_1', { status: '进行中' }, { id: 'ou_actor' });

  assert.deepEqual(writes, [{ 状态: '进行中' }]);
  assert.equal(result.recordId, 'rec_1');
  assert.equal(result.syncStatus, 'verified');
  assert.equal(result.task.status, '进行中');
  assert.equal(repository.deleteTask, undefined);
});

test('updates responsible people by valid IDs, deduplicates them, and supports unassigned', async () => {
  const first = writeFixture();
  const assigned = await first.repository.updateTask('rec_1', { responsibleOpenIds: ['ou_2', 'ou_2', 'ou_3'] }, { id: 'ou_actor' });
  assert.deepEqual(first.writes, [{ 负责人: [{ id: 'ou_2' }, { id: 'ou_3' }] }]);
  assert.deepEqual(assigned.task.responsiblePeople, [{ id: 'ou_2', name: '榅桲' }, { id: 'ou_3', name: '同名人员' }]);

  const second = writeFixture();
  const unassigned = await second.repository.updateTask('rec_1', { responsibleOpenIds: [] }, { id: 'ou_actor' });
  assert.deepEqual(second.writes, [{ 负责人: [] }]);
  assert.equal(unassigned.task.peopleStatus, 'unassigned');
});

test('updates section and category from current Bitable choices and supports clearing them', async () => {
  const first = writeFixture();
  const changed = await first.repository.updateTask('rec_1', { section: '活动', category: '大促' }, { id: 'ou_actor' });
  assert.deepEqual(first.writes, [{ 板块: '活动', 事项分类: '大促' }]);
  assert.equal(changed.task.section, '活动');
  assert.equal(changed.task.category, '大促');

  const second = writeFixture({ records: [{
    record_id: 'rec_1',
    fields: { 任务事项: '检查日报', 负责人: [{ id: 'ou_1', name: '春豌' }], 板块: '经营', 事项分类: '日报', 状态: '待处理' },
  }] });
  const cleared = await second.repository.updateTask('rec_1', { section: null, category: null }, { id: 'ou_actor' });
  assert.deepEqual(second.writes, [{ 板块: null, 事项分类: null }]);
  assert.equal(cleared.task.section, null);
  assert.equal(cleared.task.category, null);
});

test('rejects empty, extra, stale, unknown-owner, and missing-record task updates', async () => {
  const { repository, writes } = writeFixture();

  await assert.rejects(repository.updateTask('rec_1', {}, { id: 'ou_actor' }), /没有可更新/);
  await assert.rejects(repository.updateTask('rec_1', { status: '进行中', title: '越权修改' }, { id: 'ou_actor' }), /不允许更新字段/);
  await assert.rejects(repository.updateTask('rec_1', { status: '已归档' }, { id: 'ou_actor' }), (error) => error.code === 'STALE_STATUS' && /状态选项/.test(error.message));
  await assert.rejects(repository.updateTask('rec_1', { responsibleOpenIds: ['ou_missing'] }, { id: 'ou_actor' }), (error) => error.code === 'STALE_OWNER' && /负责人/.test(error.message));
  await assert.rejects(repository.updateTask('rec_1', { section: '旧板块' }, { id: 'ou_actor' }), (error) => error.code === 'STALE_SECTION' && /板块/.test(error.message));
  await assert.rejects(repository.updateTask('rec_1', { category: '旧分类' }, { id: 'ou_actor' }), (error) => error.code === 'STALE_CATEGORY' && /事项分类/.test(error.message));
  await assert.rejects(repository.updateTask('rec_missing', { status: '进行中' }, { id: 'ou_actor' }), (error) => error.code === 'RECORD_NOT_FOUND' && /记录不存在/.test(error.message));
  await assert.rejects(repository.updateTask('', { status: '进行中' }, { id: 'ou_actor' }), /记录 ID/);
  assert.deepEqual(writes, []);
});

test('reports a diagnostic when Bitable readback does not match the submitted update', async () => {
  const { repository } = writeFixture({
    readback: () => ({ record_id: 'rec_1', fields: { 任务事项: '检查日报', 负责人: [{ id: 'ou_1', name: '春豌' }], 板块: '经营', 状态: '待处理' } }),
  });

  await assert.rejects(repository.updateTask('rec_1', { status: '进行中' }, { id: 'ou_actor' }), (error) => {
    assert.equal(error.kind, 'verification_mismatch');
    assert.equal(error.code, 'READBACK_MISMATCH');
    return true;
  });
});

test('creates an allowlisted task record and verifies every submitted field from Bitable', async () => {
  const records = [{
    record_id: 'rec_owner_choices',
    fields: { 任务事项: '候选负责人来源', 负责人: [{ id: 'ou_1', name: '春豌' }, { id: 'ou_2', name: '榅桲' }], 状态: '待处理' },
  }];
  const creates = [];
  const client = {
    async listFields() { return definitions; },
    async listAllRecords() { return records; },
    async createRecord(_app, _table, fields) {
      creates.push(fields);
      const record = {
        record_id: 'rec_new',
        fields: {
          ...fields,
          负责人: fields.负责人.map(({ id }) => ({ id, name: peopleById.get(id) })),
        },
      };
      records.push(record);
      return record;
    },
    async getRecord(_app, _table, recordId) { return records.find((record) => record.record_id === recordId); },
  };
  const repository = createTaskRepository({ client, source: { key: 'tasks', appToken: 'base', tableId: 'table' } });

  const result = await repository.createTask({
    title: '准备周报',
    responsibleOpenIds: ['ou_1', 'ou_2', 'ou_1'],
    section: '经营',
    category: '日报',
    subgroup: '复盘',
    status: '待处理',
    notes: '核对完整日数据',
  }, { id: 'ou_actor' });

  assert.deepEqual(creates, [{
    任务事项: '准备周报',
    负责人: [{ id: 'ou_1' }, { id: 'ou_2' }],
    板块: '经营',
    事项分类: '日报',
    子分组: '复盘',
    状态: '待处理',
    备注: '核对完整日数据',
  }]);
  assert.equal(result.recordId, 'rec_new');
  assert.equal(result.syncStatus, 'verified');
  assert.equal(result.task.title, '准备周报');
  assert.deepEqual(result.task.responsiblePeople.map(({ id }) => id), ['ou_1', 'ou_2']);
  assert.equal(result.task.subgroup, '复盘');
  assert.equal(result.task.notes, '核对完整日数据');
});

test('allows the signed-in viewer as the default owner even before they appear in task records', async () => {
  const records = [{ record_id: 'rec_existing', fields: { 任务事项: '旧任务', 负责人: [], 状态: '待处理' } }];
  const client = {
    async listFields() { return definitions; },
    async listAllRecords() { return records; },
    async createRecord(_app, _table, fields) {
      records.push({ record_id: 'rec_new', fields: { ...fields, 负责人: [{ id: 'ou_new', name: '新成员' }] } });
      return { record_id: 'rec_new' };
    },
    async getRecord() { return records.at(-1); },
  };
  const repository = createTaskRepository({ client, source: { key: 'tasks', appToken: 'base', tableId: 'table' } });

  const result = await repository.createTask({ title: '新人任务', responsibleOpenIds: ['ou_new'], status: '待处理' }, { id: 'ou_new', name: '新成员' });

  assert.deepEqual(result.task.responsiblePeople, [{ id: 'ou_new', name: '新成员' }]);
});

test('validates every create field before sending a Bitable write', async () => {
  let creates = 0;
  const repository = createTaskRepository({
    source: { key: 'tasks', appToken: 'base', tableId: 'table' },
    client: {
      async listFields() { return definitions.filter((definition) => definition.field_name !== '备注'); },
      async listAllRecords() { return []; },
      async createRecord() { creates += 1; return { record_id: 'rec_new' }; },
    },
  });

  await assert.rejects(repository.createTask({ title: '新任务', status: '待处理' }, { id: 'ou_new', name: '新成员' }), /备注/);
  assert.equal(creates, 0);
});

test('reports the committed record id when create readback cannot be verified', async () => {
  const repository = createTaskRepository({
    source: { key: 'tasks', appToken: 'base', tableId: 'table' },
    client: {
      async listFields() { return definitions; },
      async listAllRecords() { return []; },
      async createRecord() { return { record_id: 'rec_committed' }; },
      async getRecord() { throw new Error('temporary read failure'); },
    },
  });

  await assert.rejects(repository.createTask({ title: '已落表任务', status: '待处理' }, { id: 'ou_new', name: '新成员' }), (error) => {
    assert.equal(error.code, 'READBACK_MISMATCH');
    assert.equal(error.committed, true);
    assert.equal(error.recordId, 'rec_committed');
    return true;
  });
});

test('rejects invalid, stale, and unknown fields before creating a task record', async () => {
  let creates = 0;
  const records = [{
    record_id: 'rec_owner_choices',
    fields: { 任务事项: '候选负责人来源', 负责人: [{ id: 'ou_1', name: '春豌' }], 状态: '待处理' },
  }];
  const repository = createTaskRepository({
    source: { key: 'tasks', appToken: 'base', tableId: 'table' },
    client: {
      async listFields() { return definitions; },
      async listAllRecords() { return records; },
      async createRecord() { creates += 1; return { record_id: 'rec_new' }; },
      async getRecord() { return { record_id: 'rec_new', fields: {} }; },
    },
  });
  const valid = { title: '准备周报', responsibleOpenIds: ['ou_1'], section: '经营', category: '日报', status: '待处理' };

  await assert.rejects(repository.createTask({ ...valid, title: '   ' }), (error) => error.code === 'INVALID_TITLE');
  await assert.rejects(repository.createTask({ ...valid, extra: '越权字段' }), /不允许新增字段/);
  await assert.rejects(repository.createTask({ ...valid, status: '已归档' }), (error) => error.code === 'STALE_STATUS');
  await assert.rejects(repository.createTask({ ...valid, responsibleOpenIds: ['ou_missing'] }), (error) => error.code === 'STALE_OWNER');
  await assert.rejects(repository.createTask({ ...valid, section: '旧板块' }), (error) => error.code === 'STALE_SECTION');
  await assert.rejects(repository.createTask({ ...valid, category: '旧分类' }), (error) => error.code === 'STALE_CATEGORY');
  assert.equal(creates, 0);
});
