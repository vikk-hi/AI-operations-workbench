export interface DailyForecast {
  date: string;
  weight: number;
  uv: number;
  cr: number;
}

export interface DailyTarget extends DailyForecast {
  gmvCents: number;
  netCents: number;
  aov: number;
}

function allocateCents(total: number, weights: number[]): number[] {
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('月目标金额必须是非负整数分');
  const sum: number = weights.reduce((value, weight) => value + weight, 0);
  if (!Number.isFinite(sum) || sum <= 0) throw new Error('权重总和必须大于零');
  const raw: number[] = weights.map((weight) => total * weight / sum);
  const cents: number[] = raw.map(Math.floor);
  let remainder: number = total - cents.reduce((value, row) => value + row, 0);
  const order: number[] = raw.map((_, index) => index).sort((a, b) => (raw[b] - cents[b]) - (raw[a] - cents[a]) || a - b);
  for (const index of order) {
    if (remainder-- <= 0) break;
    cents[index] += 1;
  }
  return cents;
}

function validateForecasts(rows: readonly DailyForecast[]): void {
  if (rows.length !== 31) throw new Error('10 月目标必须有 31 个日期');
  const dates: Set<string> = new Set();
  for (const row of rows) {
    if (dates.has(row.date)) throw new Error(`重复日期：${row.date}`);
    dates.add(row.date);
    if (!Number.isFinite(row.weight) || row.weight < 0) throw new Error(`${row.date} 权重无效`);
    if (!Number.isFinite(row.uv) || row.uv <= 0) throw new Error(`${row.date} UV 无效`);
    if (!Number.isFinite(row.cr) || row.cr <= 0 || row.cr > 1) throw new Error(`${row.date} CR 无效`);
  }
  for (let day = 1; day <= 31; day++) {
    const date: string = `2026-10-${String(day).padStart(2, '0')}`;
    if (!dates.has(date)) throw new Error(`缺失日期：${date}`);
  }
}

export function buildOctoberPlan(forecasts: readonly DailyForecast[], monthlyGmvCents: number, monthlyNetCents: number): DailyTarget[] {
  validateForecasts(forecasts);
  const sorted: DailyForecast[] = [...forecasts].sort((a, b) => a.date.localeCompare(b.date));
  const gmv: number[] = allocateCents(monthlyGmvCents, sorted.map((row) => row.weight));
  const net: number[] = allocateCents(monthlyNetCents, gmv);
  return sorted.map((row, index) => ({
    ...row,
    gmvCents: gmv[index],
    netCents: net[index],
    aov: Math.round(gmv[index] / (row.uv * row.cr)) / 100,
  }));
}

export function validateOctoberDraft(rows: readonly DailyTarget[], monthlyGmvCents: number, monthlyNetCents: number): void {
  validateForecasts(rows);
  for (const row of rows) {
    if (!Number.isSafeInteger(row.gmvCents) || row.gmvCents < 0) throw new Error(`${row.date} GMV 无效`);
    if (!Number.isSafeInteger(row.netCents) || row.netCents < 0) throw new Error(`${row.date} NET 无效`);
    const derivedAov: number = Math.round(row.gmvCents / (row.uv * row.cr)) / 100;
    if (!Number.isFinite(row.aov) || Math.abs(row.aov - derivedAov) > 0.001) throw new Error(`${row.date} AOV 公式不符`);
  }
  if (rows.reduce((sum, row) => sum + row.gmvCents, 0) !== monthlyGmvCents) throw new Error('GMV 月合计不符');
  if (rows.reduce((sum, row) => sum + row.netCents, 0) !== monthlyNetCents) throw new Error('NET 月合计不符');
}
