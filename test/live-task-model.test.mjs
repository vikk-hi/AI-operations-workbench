import assert from 'node:assert/strict';
import test from 'node:test';

import * as taskModel from '../client/src/live-task-model.mjs';

import {
  buildBitableRecordUrl,
  buildTaskPatch,
  createTaskEditDraft,
  currentSelectChoice,
  filterTasks,
  isTaskComplete,
  reconcileTaskEditDraft,
  taskFilterOptions,
} from '../client/src/live-task-model.mjs';

const tasks = [
  { id: 'rec_1', title: '检查日报', status: '待处理', section: '经营', category: '日报', subgroup: '复盘', notes: '核对 GMV', responsiblePeople: [{ id: 'ou_me', name: '运营甲' }] },
  { id: 'rec_2', title: '活动复盘', status: '进行中', section: '活动', category: '大促', subgroup: null, notes: null, responsiblePeople: [{ id: 'ou_other', name: '运营乙' }] },
  { id: 'rec_3', title: '归档报告', status: '已完成', section: '经营', category: '报告', subgroup: null, notes: null, responsiblePeople: [{ id: 'ou_me', name: '运营甲' }] },
  { id: 'rec_4', title: '未分派事项', status: '待处理', section: null, category: null, subgroup: null, notes: null, responsiblePeople: [] },
  { id: 'rec_5', title: '团队归档', status: '已完成', section: '活动', category: '报告', subgroup: null, notes: null, responsiblePeople: [{ id: 'ou_other', name: '运营乙' }] },
];

test('defaults to the signed-in user unfinished tasks and handles no assignments', () => {
  assert.deepEqual(filterTasks(tasks, { scope: 'mine', viewerId: 'ou_me', completion: 'open' }).map((task) => task.id), ['rec_1']);
  assert.deepEqual(filterTasks(tasks, { scope: 'mine', viewerId: 'ou_missing', completion: 'open' }), []);
  assert.equal(isTaskComplete(tasks[2]), true);
  assert.equal(isTaskComplete(tasks[0]), false);
});

test('supports all-task scope and exact task filters with case-insensitive search', () => {
  assert.deepEqual(filterTasks(tasks, { scope: 'all', viewerId: 'ou_me', completion: 'open' }).map((task) => task.id), ['rec_1', 'rec_2', 'rec_4']);
  assert.deepEqual(filterTasks(tasks, { scope: 'all', completion: 'all', status: '进行中' }).map((task) => task.id), ['rec_2']);
  assert.deepEqual(filterTasks(tasks, { scope: 'all', completion: 'all', ownerId: 'ou_me', section: '经营' }).map((task) => task.id), ['rec_1', 'rec_3']);
  assert.deepEqual(filterTasks(tasks, { scope: 'all', completion: 'all', search: 'gmv' }).map((task) => task.id), ['rec_1']);
  assert.deepEqual(filterTasks(tasks, { scope: 'all', completion: 'all', search: 'REC_2' }).map((task) => task.id), ['rec_2']);
});

test('combines personal or team scope with incomplete or completed work', () => {
  assert.deepEqual(taskModel.taskScopeOptions, [
    { value: 'mine', label: '我的工作' },
    { value: 'all', label: '团队工作' },
  ]);
  assert.deepEqual(taskModel.taskCompletionOptions, [
    { value: 'open', label: '未完成' },
    { value: 'ended', label: '已完成' },
  ]);
  assert.deepEqual(filterTasks(tasks, { scope: 'mine', viewerId: 'ou_me', completion: 'open' }).map((task) => task.id), ['rec_1']);
  assert.deepEqual(filterTasks(tasks, { scope: 'mine', viewerId: 'ou_me', completion: 'ended' }).map((task) => task.id), ['rec_3']);
  assert.deepEqual(filterTasks(tasks, { scope: 'all', viewerId: 'ou_me', completion: 'open' }).map((task) => task.id), ['rec_1', 'rec_2', 'rec_4']);
  assert.deepEqual(filterTasks(tasks, { scope: 'all', viewerId: 'ou_me', completion: 'ended' }).map((task) => task.id), ['rec_3', 'rec_5']);
});

test('builds stable filter choices without merging duplicate names', () => {
  assert.deepEqual(taskFilterOptions(tasks, ['待处理', '进行中', '已完成', '待处理'], [
    { id: 'ou_me', name: '同名人员' }, { id: 'ou_other', name: '同名人员' }, { id: 'ou_me', name: '旧名称' },
  ]), {
    statuses: ['待处理', '进行中', '已完成'],
    owners: [{ id: 'ou_me', name: '同名人员' }, { id: 'ou_other', name: '同名人员' }],
    sections: ['活动', '经营'],
  });
});

test('creates an edit draft and emits only changed task fields', () => {
  const original = tasks[0];
  const draft = createTaskEditDraft(original);
  assert.deepEqual(draft, { status: '待处理', section: '经营', category: '日报', responsibleOpenIds: ['ou_me'] });
  assert.equal(buildTaskPatch(original, draft), null);
  assert.deepEqual(buildTaskPatch(original, { ...draft, status: '进行中' }), { status: '进行中' });
  assert.deepEqual(buildTaskPatch(original, { ...draft, responsibleOpenIds: ['ou_other', 'ou_me', 'ou_other'] }), {
    responsibleOpenIds: ['ou_me', 'ou_other'],
  });
  assert.deepEqual(buildTaskPatch(original, { ...draft, responsibleOpenIds: [] }), { responsibleOpenIds: [] });
  assert.deepEqual(buildTaskPatch(original, { ...draft, section: '活动', category: '大促' }), { section: '活动', category: '大促' });
  assert.deepEqual(buildTaskPatch(original, { ...draft, section: '', category: '' }), { section: null, category: null });
});

test('reconciles a preserved edit draft against refreshed task choices', () => {
  const refreshed = { ...tasks[0], status: '进行中', responsiblePeople: [{ id: 'ou_other', name: '运营乙' }] };
  const statuses = ['待处理', '进行中', '已完成'];
  const owners = [{ id: 'ou_me', name: '运营甲' }, { id: 'ou_other', name: '运营乙' }];

  assert.deepEqual(reconcileTaskEditDraft(refreshed, { status: '待处理', section: '活动', category: '大促', responsibleOpenIds: ['ou_me'] }, statuses, owners, ['经营', '活动'], ['日报', '大促']), {
    status: '待处理', section: '活动', category: '大促', responsibleOpenIds: ['ou_me'],
  });
  assert.deepEqual(reconcileTaskEditDraft(refreshed, { status: '旧状态', section: '旧板块', category: '旧分类', responsibleOpenIds: ['ou_missing'] }, statuses, owners, ['经营', '活动'], ['日报', '大促']), {
    status: '进行中', section: '经营', category: '日报', responsibleOpenIds: ['ou_other'],
  });
  assert.deepEqual(reconcileTaskEditDraft(refreshed, { status: '进行中', section: '', category: '', responsibleOpenIds: ['ou_missing', 'ou_me'] }, statuses, owners, ['经营', '活动'], ['日报', '大促']), {
    status: '进行中', section: '', category: '', responsibleOpenIds: ['ou_me'],
  });
  assert.deepEqual(reconcileTaskEditDraft(refreshed, { status: '进行中', section: '经营', category: '日报', responsibleOpenIds: [] }, statuses, owners, ['经营'], ['日报']), {
    status: '进行中', section: '经营', category: '日报', responsibleOpenIds: [],
  });
});

test('keeps stale record values separate from current Bitable select options', () => {
  assert.deepEqual(currentSelectChoice('旧板块', ['经营', '活动', '经营']), {
    options: ['经营', '活动'],
    value: '旧板块',
    stale: true,
  });
  assert.deepEqual(currentSelectChoice('经营', ['经营', '活动']), {
    options: ['经营', '活动'],
    value: '经营',
    stale: false,
  });
  assert.deepEqual(currentSelectChoice('', ['经营']), {
    options: ['经营'],
    value: '',
    stale: false,
  });
});

test('builds a Feishu Bitable link that opens the requested record', () => {
  assert.equal(
    buildBitableRecordUrl('https://qingmutec.feishu.cn/base/base_token?table=table_id&view=view_id', 'rec 1'),
    'https://qingmutec.feishu.cn/base/base_token?table=table_id&view=view_id&record=rec+1',
  );
});

test('builds a new task draft from live Bitable choices and the signed-in viewer', () => {
  assert.deepEqual(taskModel.createTaskDraft({
    statusOptions: ['进行中', '未开始', '已完成'],
    ownerOptions: [{ id: 'ou_me', name: '运营甲' }, { id: 'ou_other', name: '运营乙' }],
  }, 'ou_me'), {
    title: '',
    responsibleOpenIds: ['ou_me'],
    section: '',
    category: '',
    subgroup: '',
    status: '未开始',
    notes: '',
  });
});

test('normalizes a new task form into the exact create payload', () => {
  assert.deepEqual(taskModel.buildTaskCreatePayload({
    title: '  准备周报  ',
    responsibleOpenIds: ['ou_other', 'ou_me', 'ou_other'],
    section: '',
    category: '日报',
    subgroup: ' 复盘 ',
    status: '未开始',
    notes: ' 核对完整日 ',
  }), {
    title: '准备周报',
    responsibleOpenIds: ['ou_me', 'ou_other'],
    section: null,
    category: '日报',
    subgroup: '复盘',
    status: '未开始',
    notes: '核对完整日',
  });
  assert.throws(() => taskModel.buildTaskCreatePayload({ title: '   ', status: '未开始' }), /任务事项/);
});
