import { createFieldReader } from '../bitable/field-map.mjs';

const choice = (value) => Array.isArray(value) ? value.map(choice).filter(Boolean).join('、') : typeof value === 'object' && value ? choice(value.name ?? value.text ?? value.value) : value == null ? null : String(value);

export function createTimelineRepository({ client, source, now = () => new Date() }) {
  return Object.freeze({
    async getTimeline() {
      const [definitions, records] = await Promise.all([client.listFields(source.appToken, source.tableId), client.listAllRecords(source.appToken, source.tableId)]);
      const reader = createFieldReader(definitions, { sourceAlias: source.key });
      const required = [['活动名称', [1]], ['活动开始日期', [5]], ['活动结束日期', [5]], ['事项', [1]], ['事项开始日期', [5]], ['事项结束日期', [5]], ['负责人', [19]], ['是否完成', [7]], ['测试人员', [11]]];
      required.forEach(([name, types]) => reader.requireField(name, types));
      const normalized = records.map((record) => ({
        recordId: record.record_id,
        activity: reader.text(record.fields, '活动名称'), item: reader.text(record.fields, '事项'),
        activityStart: reader.date(record.fields, '活动开始日期'), activityEnd: reader.date(record.fields, '活动结束日期'),
        itemStart: reader.date(record.fields, '事项开始日期'), itemEnd: reader.date(record.fields, '事项结束日期'),
        sourceOwnerName: choice(record.fields?.负责人), completed: reader.boolean(record.fields, '是否完成') === true,
      })).filter((row) => row.activity === '双11抢先购').sort((a, b) => (a.itemStart ?? '').localeCompare(b.itemStart ?? '') || a.recordId.localeCompare(b.recordId));
      let targetSelected = false;
      const rows = normalized.map((row) => {
        const isTarget = row.item === '大促活动目标制定（618/D11/IP活动）';
        const selectedForTest = isTarget && !targetSelected;
        if (selectedForTest) targetSelected = true;
        return { ...row, activity: row.activity ?? '', item: row.item ?? '未命名事项', ownerName: selectedForTest ? '榅桲' : row.sourceOwnerName ?? '待分派', selectedForTest };
      });
      return {
        source: `https://qingmutec.feishu.cn/base/${source.appToken}?table=${source.tableId}`,
        readOnly: true,
        rows,
        readStatus: { sourceKey: source.key, mode: 'live-readonly', lastReadAt: now().toISOString(), recordCount: records.length, cached: false },
      };
    },
  });
}
