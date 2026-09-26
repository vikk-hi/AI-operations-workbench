import assert from 'node:assert/strict';
import test from 'node:test';

import { createCoreRepository } from '../server-local/repositories/core-repository.mjs';

const fields = [
  ['Date', 1], ['全店整体数据-GMV', 2], ['全店整体数据-Book sales Net', 2],
  ['全店整体数据-UV', 2], ['全店整体数据-No. of Buyer', 2], ['全店整体数据-Sold pcs', 2],
  ['全店整体数据-Target', 2], ['全店整体数据-Conversion Rate', 2],
  ['全店整体数据-AOV', 2], ['全店整体数据-Avg price', 2],
].map(([field_name, type], index) => ({ field_id: `fld_${index}`, field_name, type }));

const records = [
  { record_id: 'rec_2', fields: { Date: '2026/9/25', '全店整体数据-GMV': 120, '全店整体数据-Book sales Net': 100, '全店整体数据-UV': 30, '全店整体数据-No. of Buyer': 6, '全店整体数据-Sold pcs': 8, '全店整体数据-Target': 150, '全店整体数据-Conversion Rate': 0.2, '全店整体数据-AOV': 20, '全店整体数据-Avg price': 15 } },
  { record_id: 'rec_1', fields: { Date: '2026/9/24', '全店整体数据-GMV': 100, '全店整体数据-Book sales Net': 80, '全店整体数据-UV': 20, '全店整体数据-No. of Buyer': 4, '全店整体数据-Sold pcs': 5, '全店整体数据-Target': 110, '全店整体数据-Conversion Rate': 0.2, '全店整体数据-AOV': 25, '全店整体数据-Avg price': 20 } },
  { record_id: 'rec_future', fields: { Date: '2026/9/26', '全店整体数据-GMV': null, '全店整体数据-Target': 160 } },
];

const source = { key: 'core', label: '核心经营数据', appToken: 'base', tableId: 'table' };

test('builds overview ranges and ordered daily trend from mapped Bitable fields', async () => {
  const repository = createCoreRepository({
    source,
    client: {
      async listFields() { return fields; },
      async listAllRecords() { return records; },
    },
    now: () => new Date('2026-09-26T10:00:00.000Z'),
  });

  const result = await repository.getOverview();
  assert.equal(result.ranges.day.period.end, '2026-09-25');
  assert.equal(result.ranges.day.metrics.find((item) => item.key === 'gmv').value, 120);
  assert.equal(result.ranges['7d'].metrics.find((item) => item.key === 'gmv').value, 220);
  assert.deepEqual(result.daily.map((item) => item.date), ['2026-09-24', '2026-09-25']);
  assert.equal(result.sourceUrl, 'https://qingmutec.feishu.cn/base/base?table=table');
  assert.equal(result.readStatus.lastReadAt, '2026-09-26T10:00:00.000Z');
});

test('returns an honest warning for an empty table', async () => {
  const repository = createCoreRepository({ source, client: { async listFields() { return fields; }, async listAllRecords() { return []; } } });
  const result = await repository.getOverview();
  assert.match(result.ranges.day.warnings.join(' '), /暂无有效日期/);
  assert.deepEqual(result.daily, []);
});

test('fails with a field-specific diagnostic when a required field is renamed', async () => {
  const renamed = fields.filter((item) => item.field_name !== '全店整体数据-GMV');
  const repository = createCoreRepository({ source, client: { async listFields() { return renamed; }, async listAllRecords() { return records; } } });
  await assert.rejects(repository.getOverview(), /全店整体数据-GMV/);
});
