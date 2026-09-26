import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboard, normalizeDate } from '../server/modules/workbench/workbench-metrics.ts';

test('normalizes Base date text without inventing invalid dates', () => {
  assert.equal(normalizeDate('2026/9/5'), '2026-09-05');
  assert.equal(normalizeDate('总计'), null);
});

test('aggregates ratios from totals and compares equal-length periods', () => {
  const current = [{ appDate: '2026-09-24', gmv: '100', net: '80', uv: '20', appBuyers: '4', gmvPcs: '5', appTarget: '120', netSalesTarget: '90', conversionRateTarget: '0.25', unitPriceTarget: '28', itemUnitPriceTarget: '22' }];
  const history = [{ appDate: '2025-09-24', gmv: '80', net: '70', uv: '20', appBuyers: '5', gmvPcs: '4', appTarget: '100', netSalesTarget: '80', conversionRateTarget: '0.2', unitPriceTarget: '20', itemUnitPriceTarget: '20' }];
  const result = buildDashboard(current, history, 'day');
  const cvr = result.metrics.find((metric) => metric.key === 'cvr');
  const aov = result.metrics.find((metric) => metric.key === 'aov');
  assert.equal(cvr?.value, 0.2);
  assert.equal(aov?.value, 25);
  assert.equal(aov?.yoy, 0.5625);
  assert.equal(result.period.days, 1);
});

test('returns unavailable comparisons when matching dates are missing', () => {
  const result = buildDashboard([{ appDate: '2026-09-24', gmv: '100' }], [], 'day');
  assert.equal(result.metrics.find((metric) => metric.key === 'gmv')?.yoy, null);
  assert.ok(result.warnings.some((warning) => warning.includes('同比')));
});

test('does not present a target-only day as a complete zero-sales day', () => {
  const result = buildDashboard([
    { appDate: '2026-09-24', gmv: '100', uv: '20', appTarget: '120' },
    { appDate: '2026-09-25', gmv: null, uv: null, appTarget: '130' },
  ], [], 'day');
  assert.equal(result.period.end, '2026-09-24');
  assert.equal(result.metrics.find((metric) => metric.key === 'gmv')?.value, 100);
});

test('does not sum a source NET target whose daily grain is unverified', () => {
  const result = buildDashboard([{ appDate: '2026-09-24', gmv: '100', net: '40', netSalesTarget: '221953857.33' }], [], 'day');
  assert.equal(result.metrics.find((metric) => metric.key === 'net')?.target, null);
});
