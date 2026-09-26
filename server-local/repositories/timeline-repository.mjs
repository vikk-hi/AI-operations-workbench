import { createFieldReader } from '../bitable/field-map.mjs';

const choice = (value) => Array.isArray(value) ? value.map(choice).filter(Boolean).join('、') : typeof value === 'object' && value ? choice(value.name ?? value.text ?? value.value) : value == null ? null : String(value);
const nonEmptyText = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const recordId = (value) => {
  const id = nonEmptyText(value);
  if (!id) throw new Error('记录 ID 不能为空');
  return id;
};
const dateValue = (value) => {
  if (value === null || value === '') return null;
  const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('日期必须使用 YYYY-MM-DD 格式');
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const normalized = new Date(timestamp);
  if (normalized.getUTCFullYear() !== year || normalized.getUTCMonth() !== month - 1 || normalized.getUTCDate() !== day) throw new Error('请输入有效日期');
  return timestamp;
};
const writableTimelineFields = (input, { creating = false } = {}) => {
  const fields = {};
  if ('activity' in input || creating) {
    const activity = nonEmptyText(input.activity);
    if (!activity) throw new Error('活动名称不能为空');
    fields.活动名称 = activity;
  }
  if ('item' in input || creating) {
    const item = nonEmptyText(input.item);
    if (!item) throw new Error('事项不能为空');
    fields.事项 = item;
  }
  for (const [key, name] of [['activityStart', '活动开始日期'], ['activityEnd', '活动结束日期'], ['itemStart', '事项开始日期'], ['itemEnd', '事项结束日期']]) {
    if (key in input) fields[name] = dateValue(input[key]);
  }
  if ('completed' in input) fields.是否完成 = input.completed === true;
  if (Array.isArray(input.responsibleOpenIds)) {
    fields.测试人员 = [...new Set(input.responsibleOpenIds.map(nonEmptyText).filter(Boolean))].map((id) => ({ id }));
  }
  if (!creating && Object.keys(fields).length === 0) throw new Error('没有可更新的活动字段');
  return fields;
};

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
        writable: false,
        rows,
        readStatus: { sourceKey: source.key, mode: 'live-readonly', lastReadAt: now().toISOString(), recordCount: records.length, cached: false },
      };
    },
    async createTimelineItem(input) {
      const record = await client.createRecord(source.appToken, source.tableId, writableTimelineFields(input ?? {}, { creating: true }));
      return { recordId: record.record_id };
    },
    async updateTimelineItem(id, input) {
      const normalizedId = recordId(id);
      const record = await client.updateRecord(source.appToken, source.tableId, normalizedId, writableTimelineFields(input ?? {}));
      return { recordId: record.record_id };
    },
    async deleteTimelineItem(id) {
      const normalizedId = recordId(id);
      await client.deleteRecord(source.appToken, source.tableId, normalizedId);
      return { recordId: normalizedId, deleted: true };
    },
  });
}
