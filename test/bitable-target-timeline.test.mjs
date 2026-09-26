import assert from 'node:assert/strict';
import test from 'node:test';

import { createTargetRepository } from '../server-local/repositories/target-repository.mjs';
import { createTimelineRepository } from '../server-local/repositories/timeline-repository.mjs';

test('summarizes company MTD/YTD targets without inventing unavailable brand data', async () => {
  const fields = [
    ['店铺名+平台', 3], ['月份', 1], ['26年目标\n（含购物金）', 2], ['2026年\n实收目标\n（不含购物金GMV X 不含购物金退款率）', 2],
  ].map(([field_name, type]) => ({ field_name, type }));
  const records = Array.from({ length: 10 }, (_, index) => ({ record_id: `rec_${index + 1}`, fields: { '店铺名+平台': 'HM官方旗舰店_天猫', 月份: `${index + 1}月`, '26年目标\n（含购物金）': index + 1, '2026年\n实收目标\n（不含购物金GMV X 不含购物金退款率）': (index + 1) * 2 } }));
  const repository = createTargetRepository({ source: { key: 'companyTargets', appToken: 'base', tableId: 'table' }, client: { async listFields() { return fields; }, async listAllRecords() { return records; } }, asOf: () => '2026-09-26' });
  const result = await repository.getTargets();
  assert.equal(result.company.mtd.gmvTarget, 9);
  assert.equal(result.company.ytd.gmvTarget, 45);
  assert.equal(result.company.october.gmvTarget, 10);
  assert.equal(result.brand.status, 'empty');
});

test('normalizes D11 timeline dates, owners, completion and one selected target', async () => {
  const fields = [
    ['活动名称', 1], ['活动开始日期', 5], ['活动结束日期', 5], ['事项', 1], ['事项开始日期', 5], ['事项结束日期', 5], ['负责人', 19], ['是否完成', 7], ['测试人员', 11],
  ].map(([field_name, type]) => ({ field_name, type }));
  const records = [
    { record_id: 'r2', fields: { 活动名称: '双11抢先购', 活动开始日期: Date.UTC(2026, 9, 15), 活动结束日期: Date.UTC(2026, 9, 19), 事项: '大促活动目标制定（618/D11/IP活动）', 事项开始日期: Date.UTC(2026, 8, 2), 负责人: ['春豌'], 是否完成: false, 测试人员: [{ id: 'ou_1', name: '榅桲' }] } },
    { record_id: 'r1', fields: { 活动名称: '双11抢先购', 活动开始日期: Date.UTC(2026, 9, 15), 活动结束日期: Date.UTC(2026, 9, 19), 事项: '大促活动目标制定（618/D11/IP活动）', 事项开始日期: Date.UTC(2026, 8, 1), 负责人: ['春豌'], 是否完成: true, 测试人员: [] } },
  ];
  const repository = createTimelineRepository({ source: { key: 'timeline', appToken: 'base', tableId: 'table' }, client: { async listFields() { return fields; }, async listAllRecords() { return records; } } });
  const result = await repository.getTimeline();
  assert.equal(result.readOnly, true);
  assert.equal(result.writable, false);
  assert.equal(result.readStatus.mode, 'live-readonly');
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows.filter((item) => item.selectedForTest).length, 1);
  assert.equal(result.rows[0].recordId, 'r1');
  assert.equal(result.rows[0].completed, true);
  assert.equal(result.rows[0].activityStart, '2026-10-15');
});

test('creates, updates and deletes timeline records through an explicit field allowlist', async () => {
  const writes = [];
  let deleted = '';
  const repository = createTimelineRepository({
    source: { key: 'timeline', appToken: 'base', tableId: 'table' },
    client: {
      async createRecord(_app, _table, fields) { writes.push(fields); return { record_id: 'time_new' }; },
      async updateRecord(_app, _table, recordId, fields) { writes.push(fields); return { record_id: recordId }; },
      async deleteRecord(_app, _table, recordId) { deleted = recordId; return { deleted: true }; },
    },
  });

  assert.deepEqual(await repository.createTimelineItem({ activity: '双11抢先购', activityStart: '2026-10-15', activityEnd: '2026-10-19', item: '素材确认', itemStart: '2026-10-01', itemEnd: '2026-10-02', responsibleOpenIds: ['ou_1'] }, { id: 'ou_actor' }), { recordId: 'time_new' });
  assert.deepEqual(await repository.updateTimelineItem('time_new', { completed: true, itemEnd: '2026-10-03', ignored: true }, { id: 'ou_actor' }), { recordId: 'time_new' });
  assert.deepEqual(await repository.deleteTimelineItem('time_new', { id: 'ou_actor' }), { recordId: 'time_new', deleted: true });
  assert.deepEqual(writes, [
    { 活动名称: '双11抢先购', 事项: '素材确认', 活动开始日期: Date.UTC(2026, 9, 15), 活动结束日期: Date.UTC(2026, 9, 19), 事项开始日期: Date.UTC(2026, 9, 1), 事项结束日期: Date.UTC(2026, 9, 2), 测试人员: [{ id: 'ou_1' }] },
    { 是否完成: true, 事项结束日期: Date.UTC(2026, 9, 3) },
  ]);
  assert.equal(deleted, 'time_new');
  await assert.rejects(repository.createTimelineItem({ activity: '双11抢先购', item: '无效日期', itemStart: '2026-02-31' }), /有效日期/);
});
