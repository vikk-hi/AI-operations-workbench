import { createFieldReader } from '../bitable/field-map.mjs';

const SHOP = 'HM官方旗舰店_天猫';
const GMV = '26年目标\n（含购物金）';
const NET = '2026年\n实收目标\n（不含购物金GMV X 不含购物金退款率）';
const empty = () => ({ gmv: null, net: null });
const choice = (value) => Array.isArray(value) ? value.map(choice).filter(Boolean).join('、') : typeof value === 'object' && value ? choice(value.name ?? value.text ?? value.value) : value == null ? null : String(value);

function summarize(rows, asOf) {
  const currentMonth = Number(asOf.slice(5, 7));
  const valid = rows.map((row) => ({ ...row, monthNumber: Number(row.month?.match(/^(\d{1,2})月$/)?.[1]) }))
    .filter((row) => row.shop === SHOP && row.monthNumber >= 1 && row.monthNumber <= 12);
  const month = (value) => valid.find((row) => row.monthNumber === value);
  const through = (value) => {
    const selected = valid.filter((row) => row.monthNumber <= value);
    const complete = selected.length === value && new Set(selected.map((row) => row.monthNumber)).size === value;
    return { gmv: complete && selected.every((row) => row.gmv != null) ? selected.reduce((sum, row) => sum + row.gmv, 0) : null, net: complete && selected.every((row) => row.net != null) ? selected.reduce((sum, row) => sum + row.net, 0) : null };
  };
  const mtd = month(currentMonth);
  const october = month(10);
  return { mtd: mtd ? { gmv: mtd.gmv, net: mtd.net } : empty(), ytd: through(currentMonth), october: october ? { gmv: october.gmv, net: october.net } : empty() };
}

export function createTargetRepository({ client, source, asOf = () => new Date().toISOString().slice(0, 10), now = () => new Date() }) {
  return Object.freeze({
    async getTargets() {
      const [definitions, records] = await Promise.all([client.listFields(source.appToken, source.tableId), client.listAllRecords(source.appToken, source.tableId)]);
      const reader = createFieldReader(definitions, { sourceAlias: source.key });
      reader.requireField('店铺名+平台', [3]); reader.requireField('月份', [1]); reader.requireField(GMV, [2]); reader.requireField(NET, [2]);
      const rows = records.map((record) => ({ shop: choice(record.fields?.['店铺名+平台']), month: reader.text(record.fields, '月份'), gmv: reader.number(record.fields, GMV), net: reader.number(record.fields, NET) }));
      const summary = summarize(rows, asOf());
      const sourceUrl = `https://qingmutec.feishu.cn/base/${source.appToken}?table=${source.tableId}`;
      return {
        asOf: asOf(),
        company: {
          source: sourceUrl, precision: 'rounded-yuan',
          mtd: { gmvTarget: summary.mtd.gmv, netTarget: summary.mtd.net, gmvActual: null, netActual: null },
          ytd: { gmvTarget: summary.ytd.gmv, netTarget: summary.ytd.net, gmvActual: null, netActual: null },
          october: { gmvTarget: summary.october.gmv, netTarget: summary.october.net },
        },
        brand: { source: '', october: [], status: 'empty' },
        d11: { start: '2026-10-15', end: '2026-10-19', gmvTarget: null, status: 'unconfirmed' },
        readStatus: { sourceKey: source.key, mode: 'live-readonly', lastReadAt: now().toISOString(), recordCount: records.length, cached: false, warnings: ['品牌目标表尚未确认'] },
      };
    },
  });
}
