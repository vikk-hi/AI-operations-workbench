import { createFieldReader } from '../bitable/field-map.mjs';

const textValue = (value) => {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join('、') || null;
  if (typeof value === 'object') return textValue(value.name ?? value.text ?? value.value);
  return String(value);
};

const people = (value) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const seen = new Set();
  return values.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const id = item.id ?? item.open_id ?? item.user_id;
    const name = item.name;
    if (!id || !name || seen.has(id)) return [];
    seen.add(id);
    return [{ id: String(id), name: String(name) }];
  });
};

export function createTaskRepository({ client, source, now = () => new Date() }) {
  return Object.freeze({
    async getTasks(viewer) {
      const [definitions, records] = await Promise.all([
        client.listFields(source.appToken, source.tableId),
        client.listAllRecords(source.appToken, source.tableId),
      ]);
      const reader = createFieldReader(definitions, { sourceAlias: source.key });
      reader.requireField('任务事项', [1]);
      reader.requireField('负责人', [11]);
      reader.requireField('板块', [3]);
      reader.requireField('状态', [3]);
      const tasks = records.map((record) => {
        const owners = people(record.fields?.负责人);
        const rawOwners = Array.isArray(record.fields?.负责人) ? record.fields.负责人 : [];
        return {
          id: record.record_id,
          title: reader.text(record.fields, '任务事项') ?? '未命名任务',
          status: textValue(record.fields?.状态) ?? '未设置',
          startDate: null,
          endDate: null,
          section: textValue(record.fields?.板块),
          responsiblePerson: owners[0]?.name ?? null,
          responsiblePeople: owners,
          reviewerPeople: [],
          peopleStatus: owners.length > 0 ? 'resolved' : rawOwners.length > 0 ? 'unresolved' : 'unassigned',
        };
      });
      const baseUrl = `https://qingmutec.feishu.cn/base/${source.appToken}?table=${source.tableId}`;
      return {
        tasks,
        templates: [],
        source: { tasksUrl: baseUrl, templatesUrl: '', readOnly: true },
        viewer: viewer ?? null,
        readStatus: { sourceKey: source.key, mode: 'live-readonly', lastReadAt: now().toISOString(), recordCount: records.length, cached: false, warnings: ['任务模板表尚未单独映射'] },
      };
    },
  });
}
