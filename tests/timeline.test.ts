import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeTimeline } from '../server/modules/workbench/timeline.ts';

test('D11 duplicate template items remain visible but only one target node is selected', () => {
  const rows = normalizeTimeline([
    { recordId: 'r1', activity: '双11抢先购', item: '大促活动目标制定（618/D11/IP活动）', owner: null, start: '2026-10-15', end: '2026-10-19' },
    { recordId: 'r2', activity: '双11抢先购', item: '大促活动目标制定（618/D11/IP活动）', owner: null, start: '2026-10-15', end: '2026-10-19' },
  ]);
  assert.equal(rows.filter((row) => row.selectedForTest).length, 1);
  assert.equal(rows[0].ownerName, '榅桲');
  assert.equal(rows[1].ownerName, '待分派');
  assert.equal(rows[0].activityStart, '2026-10-15');
});
