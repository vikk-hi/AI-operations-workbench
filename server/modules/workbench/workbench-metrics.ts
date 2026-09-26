import type { CoreDashboardResponse, DashboardRange, MetricValue } from '@shared/api.interface';

export interface MetricRow {
  appDate: string | null;
  gmv?: string | null;
  net?: string | null;
  uv?: string | null;
  appBuyers?: string | null;
  gmvPcs?: string | null;
  appTarget?: string | null;
  netSalesTarget?: string | null;
  conversionRateTarget?: string | null;
  unitPriceTarget?: string | null;
  itemUnitPriceTarget?: string | null;
}

const DAY = 86_400_000;
const number = (value?: string | null) => value == null || value === '' ? 0 : Number(value);
const nullableRatio = (a: number, b: number) => b > 0 ? a / b : null;
const change = (current: number | null, previous: number | null) => current != null && previous != null && previous !== 0 ? current / previous - 1 : null;
const iso = (date: Date) => date.toISOString().slice(0, 10);
const dateFromIso = (value: string) => new Date(`${value}T00:00:00.000Z`);

export function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/);
  if (!match) return null;
  const candidate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  return iso(dateFromIso(candidate)) === candidate ? candidate : null;
}

function aggregate(rows: MetricRow[]) {
  const sums = rows.reduce((acc, row) => ({
    gmv: acc.gmv + number(row.gmv), net: acc.net + number(row.net), uv: acc.uv + number(row.uv),
    buyers: acc.buyers + number(row.appBuyers), pcs: acc.pcs + number(row.gmvPcs),
    gmvTarget: acc.gmvTarget + number(row.appTarget),
    cvrTarget: acc.cvrTarget + number(row.conversionRateTarget) * number(row.uv), cvrWeight: acc.cvrWeight + number(row.uv),
    aovTarget: acc.aovTarget + number(row.unitPriceTarget) * number(row.appBuyers), aovWeight: acc.aovWeight + number(row.appBuyers),
    aspTarget: acc.aspTarget + number(row.itemUnitPriceTarget) * number(row.gmvPcs), aspWeight: acc.aspWeight + number(row.gmvPcs),
  }), { gmv: 0, net: 0, uv: 0, buyers: 0, pcs: 0, gmvTarget: 0, cvrTarget: 0, cvrWeight: 0, aovTarget: 0, aovWeight: 0, aspTarget: 0, aspWeight: 0 });
  return {
    gmv: sums.gmv, net: sums.net, uv: sums.uv, buyers: sums.buyers,
    cvr: nullableRatio(sums.buyers, sums.uv), aov: nullableRatio(sums.gmv, sums.buyers), asp: nullableRatio(sums.gmv, sums.pcs),
    // The source's "Net净销额目标" is not confirmed to be a daily value; do not sum it.
    targets: { gmv: sums.gmvTarget || null, net: null, uv: null, buyers: null,
      cvr: nullableRatio(sums.cvrTarget, sums.cvrWeight), aov: nullableRatio(sums.aovTarget, sums.aovWeight), asp: nullableRatio(sums.aspTarget, sums.aspWeight) },
  };
}

function selectPeriod(rows: MetricRow[], start: string, end: string) {
  return rows.filter((row) => { const date = normalizeDate(row.appDate); return date != null && date >= start && date <= end; });
}

export function buildDashboard(currentRows: MetricRow[], historyRows: MetricRow[], range: DashboardRange): CoreDashboardResponse {
  // A pre-created target row is not a completed sales day. Keep genuine zero GMV,
  // but exclude missing GMV so the latest incomplete date cannot look like a 0 sale.
  const completeRows = currentRows.filter((row) => row.gmv !== null && row.gmv !== undefined && row.gmv !== '');
  const dated = completeRows.map((row) => normalizeDate(row.appDate)).filter((value): value is string => Boolean(value)).sort();
  const end = dated.at(-1) ?? null;
  if (!end) return { range, period: { start: null, end: null, days: 0 }, metrics: [], warnings: ['核心数据暂无有效日期'], source: { name: '2026天猫日报（副本）', url: '', updatedAt: null } };
  const endDate = dateFromIso(end);
  const startDate = new Date(endDate);
  if (range === '7d') startDate.setUTCDate(startDate.getUTCDate() - 6);
  if (range === 'mtd') startDate.setUTCDate(1);
  if (range === 'ytd') { startDate.setUTCMonth(0); startDate.setUTCDate(1); }
  const start = iso(startDate);
  const days = Math.round((endDate.getTime() - startDate.getTime()) / DAY) + 1;
  const previousEnd = new Date(startDate.getTime() - DAY);
  const previousStart = new Date(previousEnd.getTime() - (days - 1) * DAY);
  const yoyStart = `${Number(start.slice(0, 4)) - 1}${start.slice(4)}`;
  const yoyEnd = `${Number(end.slice(0, 4)) - 1}${end.slice(4)}`;
  const selected = selectPeriod(completeRows, start, end);
  const previous = selectPeriod(completeRows, iso(previousStart), iso(previousEnd));
  const yoyRows = selectPeriod(historyRows, yoyStart, yoyEnd);
  const current = aggregate(selected);
  const previousAggregate = aggregate(previous);
  const yoyAggregate = aggregate(yoyRows);
  const warnings: string[] = [];
  const comparableMom = previous.length === selected.length;
  const comparableYoy = yoyRows.length === selected.length;
  if (!comparableMom) warnings.push('环比周期数据不完整，暂不计算');
  if (!comparableYoy) warnings.push('同比周期数据不完整，暂不计算');
  const definitions: Array<[MetricValue['key'], string, MetricValue['unit']]> = [
    ['gmv', 'GMV', 'currency'], ['net', 'NET净销额', 'currency'], ['uv', 'UV', 'number'], ['buyers', '买家数', 'number'],
    ['cvr', '转化率', 'percent'], ['aov', '客单价', 'currency'], ['asp', '件单价', 'currency'],
  ];
  const metrics = definitions.map(([key, label, unit]) => {
    const value = current[key]; const target = current.targets[key];
    return { key, label, unit, value, target, targetRate: target != null ? nullableRatio(value ?? 0, target) : null,
      yoy: comparableYoy ? change(value, yoyAggregate[key]) : null, mom: comparableMom ? change(value, previousAggregate[key]) : null };
  });
  return { range, period: { start, end, days }, metrics, warnings, source: { name: '2026天猫日报（副本）', url: '', updatedAt: end } };
}
