import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeCompanyTargets } from '../server/modules/workbench/company-target.ts';

test('company target MTD uses whole month and YTD uses elapsed months only', () => {
  const result = summarizeCompanyTargets([
    ...Array.from({ length: 8 }, (_, index) => ({ month: `${index + 1}月`, shop: 'HM官方旗舰店_天猫', gmv: index === 0 ? 100 : 0, net: index === 0 ? 40 : 0 })),
    { month: '9月', shop: 'HM官方旗舰店_天猫', gmv: 200, net: 80 },
    { month: '10月', shop: 'HM官方旗舰店_天猫', gmv: 300, net: 120 },
    { month: '9月', shop: 'H&M官方旗舰店_京东', gmv: 999, net: 999 },
  ], '2026-09-24');
  assert.equal(result.mtd.gmv, 200);
  assert.equal(result.ytd.gmv, 300);
  assert.equal(result.october.gmv, 300);
  assert.equal(result.mtd.net, 80);
});
