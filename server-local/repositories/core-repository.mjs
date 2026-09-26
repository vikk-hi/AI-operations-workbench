import { createFieldReader } from '../bitable/field-map.mjs';

const DAY = 86_400_000;
const RANGES = ['day', '7d', 'mtd', 'ytd'];
const iso = (date) => date.toISOString().slice(0, 10);
const dateFromIso = (value) => new Date(`${value}T00:00:00.000Z`);
const number = (value) => value == null || value === '' ? 0 : Number(value);
const ratio = (a, b) => b > 0 ? a / b : null;
const change = (current, previous) => current != null && previous != null && previous !== 0 ? current / previous - 1 : null;

export function normalizeMetricDate(value) {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/);
  if (!match) return null;
  const candidate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  return iso(dateFromIso(candidate)) === candidate ? candidate : null;
}

function aggregate(rows) {
  const sums = rows.reduce((acc, row) => ({
    gmv: acc.gmv + number(row.gmv), net: acc.net + number(row.net), uv: acc.uv + number(row.uv),
    buyers: acc.buyers + number(row.buyers), pcs: acc.pcs + number(row.pcs), target: acc.target + number(row.target),
    cvrTarget: acc.cvrTarget + number(row.cvrTarget) * number(row.uv), cvrWeight: acc.cvrWeight + number(row.uv),
    aovTarget: acc.aovTarget + number(row.aovTarget) * number(row.buyers), aovWeight: acc.aovWeight + number(row.buyers),
    aspTarget: acc.aspTarget + number(row.aspTarget) * number(row.pcs), aspWeight: acc.aspWeight + number(row.pcs),
  }), { gmv: 0, net: 0, uv: 0, buyers: 0, pcs: 0, target: 0, cvrTarget: 0, cvrWeight: 0, aovTarget: 0, aovWeight: 0, aspTarget: 0, aspWeight: 0 });
  return {
    gmv: sums.gmv, net: sums.net, uv: sums.uv, buyers: sums.buyers,
    cvr: ratio(sums.buyers, sums.uv), aov: ratio(sums.gmv, sums.buyers), asp: ratio(sums.gmv, sums.pcs),
    targets: { gmv: sums.target || null, net: null, uv: null, buyers: null, cvr: ratio(sums.cvrTarget, sums.cvrWeight), aov: ratio(sums.aovTarget, sums.aovWeight), asp: ratio(sums.aspTarget, sums.aspWeight) },
  };
}

const selectPeriod = (rows, start, end) => rows.filter((row) => row.date && row.date >= start && row.date <= end);

function dashboard(rows, range, sourceUrl) {
  const complete = rows.filter((row) => row.gmv != null);
  const end = complete.map((row) => row.date).filter(Boolean).sort().at(-1) ?? null;
  if (!end) return { range, period: { start: null, end: null, days: 0 }, metrics: [], warnings: ['核心数据暂无有效日期'], source: { name: '2026天猫日报', url: sourceUrl, updatedAt: null } };
  const endDate = dateFromIso(end);
  const startDate = new Date(endDate);
  if (range === '7d') startDate.setUTCDate(startDate.getUTCDate() - 6);
  if (range === 'mtd') startDate.setUTCDate(1);
  if (range === 'ytd') { startDate.setUTCMonth(0); startDate.setUTCDate(1); }
  const start = iso(startDate);
  const days = Math.round((endDate.getTime() - startDate.getTime()) / DAY) + 1;
  const previousEnd = new Date(startDate.getTime() - DAY);
  const previousStart = new Date(previousEnd.getTime() - (days - 1) * DAY);
  const selected = selectPeriod(complete, start, end);
  const previous = selectPeriod(complete, iso(previousStart), iso(previousEnd));
  const current = aggregate(selected);
  const previousAggregate = aggregate(previous);
  const warnings = ['历史同期数据表尚未确认，同比暂不计算'];
  const comparableMom = previous.length === selected.length;
  if (!comparableMom) warnings.push('环比周期数据不完整，暂不计算');
  const definitions = [
    ['gmv', 'GMV', 'currency'], ['net', 'NET净销额', 'currency'], ['uv', 'UV', 'number'], ['buyers', '买家数', 'number'],
    ['cvr', '转化率', 'percent'], ['aov', '客单价', 'currency'], ['asp', '件单价', 'currency'],
  ];
  const metrics = definitions.map(([key, label, unit]) => {
    const value = current[key]; const target = current.targets[key];
    return { key, label, unit, value, target, targetRate: target != null ? ratio(value ?? 0, target) : null, yoy: null, mom: comparableMom ? change(value, previousAggregate[key]) : null };
  });
  return { range, period: { start, end, days }, metrics, warnings, source: { name: '2026天猫日报', url: sourceUrl, updatedAt: end } };
}

export function createCoreRepository({ client, source, now = () => new Date() }) {
  return Object.freeze({
    async getOverview() {
      const [fields, records] = await Promise.all([
        client.listFields(source.appToken, source.tableId),
        client.listAllRecords(source.appToken, source.tableId),
      ]);
      const reader = createFieldReader(fields, { sourceAlias: source.key });
      const required = [
        ['Date', [1]], ['全店整体数据-GMV', [2]], ['全店整体数据-Book sales Net', [2]], ['全店整体数据-UV', [2]],
        ['全店整体数据-No. of Buyer', [2]], ['全店整体数据-Sold pcs', [2]], ['全店整体数据-Target', [2]],
        ['全店整体数据-Conversion Rate', [2]], ['全店整体数据-AOV', [2]], ['全店整体数据-Avg price', [2]],
      ];
      required.forEach(([name, types]) => reader.requireField(name, types));
      const rows = records.map((record) => ({
        recordId: record.record_id,
        date: normalizeMetricDate(reader.text(record.fields, 'Date')),
        gmv: reader.number(record.fields, '全店整体数据-GMV'),
        net: reader.number(record.fields, '全店整体数据-Book sales Net'),
        uv: reader.number(record.fields, '全店整体数据-UV'),
        buyers: reader.number(record.fields, '全店整体数据-No. of Buyer'),
        pcs: reader.number(record.fields, '全店整体数据-Sold pcs'),
        target: reader.number(record.fields, '全店整体数据-Target'),
        cvrTarget: reader.number(record.fields, '全店整体数据-Conversion Rate'),
        aovTarget: reader.number(record.fields, '全店整体数据-AOV'),
        aspTarget: reader.number(record.fields, '全店整体数据-Avg price'),
      }));
      const sourceUrl = `https://qingmutec.feishu.cn/base/${source.appToken}?table=${source.tableId}`;
      const daily = rows.filter((row) => row.date && row.gmv != null).sort((a, b) => a.date.localeCompare(b.date)).map((row) => ({ date: row.date, gmv: row.gmv, target: row.target }));
      return {
        ranges: Object.fromEntries(RANGES.map((range) => [range, dashboard(rows, range, sourceUrl)])),
        daily,
        sourceUrl,
        readStatus: { sourceKey: source.key, mode: 'live-readonly', lastReadAt: now().toISOString(), recordCount: records.length, cached: false },
      };
    },
  });
}
