import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildCategoryResponse,
  normalizeCategoryRows,
} from '../server/modules/workbench/category-normalize.ts';

test('same second-level label under two parents stays distinct', () => {
  const rows = normalizeCategoryRows([
    { category: '男装', categoryII: '衬衫', gmv: 10 },
    { category: '女装', categoryII: '衬衫', gmv: 20 },
  ]);
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0].key, rows[1].key);
});

test('empty BI rows are unavailable, not a live empty store', () => {
  const response = buildCategoryResponse([], '2026-09-23');
  assert.equal(response.status, 'unavailable');
  assert.deepEqual(response.rows, []);
});

test('snapshot status never claims live freshness', () => {
  const response = buildCategoryResponse(
    [{ category: '女装', categoryII: '毛针织衫', gmv: 100 }],
    '2026-09-23',
  );
  assert.equal(response.status, 'snapshot');
  assert.equal(response.asOf, '2026-09-23');
});
