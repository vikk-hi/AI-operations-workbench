import assert from 'node:assert/strict';
import test from 'node:test';

import { FieldMappingError, createFieldReader } from '../server-local/bitable/field-map.mjs';

const definitions = [
  { field_id: 'fld_text', field_name: '任务名称', type: 1 },
  { field_id: 'fld_num', field_name: 'GMV', type: 2 },
  { field_id: 'fld_date', field_name: '日期', type: 5 },
  { field_id: 'fld_bool', field_name: '完成', type: 7 },
  { field_id: 'fld_people', field_name: '负责人', type: 11 },
  { field_id: 'fld_links', field_name: '关联任务', type: 21 },
];

test('reads normal and empty field values', () => {
  const reader = createFieldReader(definitions, { sourceAlias: '执行任务' });
  const fields = { 任务名称: '排期核验', GMV: 123.45, 日期: 1790294400000, 完成: true };

  assert.equal(reader.text(fields, '任务名称'), '排期核验');
  assert.equal(reader.number(fields, 'GMV'), 123.45);
  assert.equal(reader.date(fields, '日期'), '2026-09-25');
  assert.equal(reader.boolean(fields, '完成'), true);
  assert.equal(reader.text({}, '任务名称'), null);
});

test('reads people and linked record ids without inventing values', () => {
  const reader = createFieldReader(definitions, { sourceAlias: '执行任务' });
  const fields = {
    负责人: [{ id: 'ou_1', name: '榅桲' }, { open_id: 'ou_2', name: '南桑' }],
    关联任务: [{ record_id: 'rec_1' }, 'rec_2', { id: 'rec_1' }],
  };

  assert.deepEqual(reader.personIds(fields, '负责人'), ['ou_1', 'ou_2']);
  assert.deepEqual(reader.linkedRecordIds(fields, '关联任务'), ['rec_1', 'rec_2']);
  assert.deepEqual(reader.personIds({}, '负责人'), []);
});

test('required absent or renamed fields fail with a redacted diagnostic', () => {
  const reader = createFieldReader(definitions, { sourceAlias: '核心经营数据' });

  assert.throws(() => reader.requireField('支付金额', [2]), (error) => {
    assert.equal(error instanceof FieldMappingError, true);
    assert.match(error.message, /核心经营数据/);
    assert.match(error.message, /支付金额/);
    assert.equal(error.message.includes('record-secret'), false);
    return true;
  });
});

test('incompatible field type fails before reading record contents', () => {
  const reader = createFieldReader(definitions, { sourceAlias: '核心经营数据' });

  assert.throws(() => reader.number({ 任务名称: 'record-secret' }, '任务名称'), (error) => {
    assert.match(error.message, /任务名称/);
    assert.match(error.message, /type 1/);
    assert.equal(error.message.includes('record-secret'), false);
    return true;
  });
});
