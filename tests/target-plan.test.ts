import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildOctoberPlan, validateOctoberDraft } from '../server/modules/workbench/target-plan.ts';

const forecasts = Array.from({ length: 31 }, (_, index) => ({
  date: `2026-10-${String(index + 1).padStart(2, '0')}`,
  weight: index === 14 ? 4 : 1,
  uv: 1000 + index,
  cr: 0.04,
}));

test('October plan preserves monthly GMV/NET cents and derives AOV', () => {
  const plan = buildOctoberPlan(forecasts, 12_749_442_654, 5_099_777_061);
  assert.equal(plan.length, 31);
  assert.equal(plan.reduce((sum, row) => sum + row.gmvCents, 0), 12_749_442_654);
  assert.equal(plan.reduce((sum, row) => sum + row.netCents, 0), 5_099_777_061);
  assert.equal(plan[14].date, '2026-10-15');
  assert.ok(Math.abs(plan[14].aov - plan[14].gmvCents / 100 / (plan[14].uv * plan[14].cr)) < 0.011);
});

test('missing/duplicate dates and invalid denominators reject confirmation', () => {
  assert.throws(() => buildOctoberPlan(forecasts.slice(1), 3100, 1000), /31/);
  assert.throws(() => buildOctoberPlan([...forecasts.slice(0, 30), forecasts[0]], 3100, 1000), /重复/);
  assert.throws(() => buildOctoberPlan(forecasts.map((row, index) => index === 0 ? { ...row, cr: 0 } : row), 3100, 1000), /CR/);
});

test('draft validation rejects altered formula and monthly total', () => {
  const plan = buildOctoberPlan(forecasts, 3100, 1000);
  assert.doesNotThrow(() => validateOctoberDraft(plan, 3100, 1000));
  assert.throws(() => validateOctoberDraft(plan.map((row, index) => index === 0 ? { ...row, aov: row.aov + 1 } : row), 3100, 1000), /AOV/);
  assert.throws(() => validateOctoberDraft(plan.map((row, index) => index === 0 ? { ...row, gmvCents: row.gmvCents + 1 } : row), 3100, 1000), /GMV/);
});
