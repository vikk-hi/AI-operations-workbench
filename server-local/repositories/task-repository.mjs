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

const nonEmptyText = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const selectOptions = (definition) => {
  const options = Array.isArray(definition?.property?.options) ? definition.property.options : [];
  return options.map((option) => nonEmptyText(option?.name)).filter(Boolean);
};
const recordId = (value) => {
  const id = nonEmptyText(value);
  if (!id) throw new Error('记录 ID 不能为空');
  return id;
};
const writableTaskFields = (input, { creating = false } = {}) => {
  const fields = {};
  if ('title' in input || creating) {
    const title = nonEmptyText(input.title);
    if (!title) throw new Error('任务标题不能为空');
    fields.任务事项 = title;
  }
  const section = nonEmptyText(input.section);
  const status = nonEmptyText(input.status);
  if (section) fields.板块 = section;
  if (status) fields.状态 = status;
  if (Array.isArray(input.responsibleOpenIds)) {
    fields.负责人 = [...new Set(input.responsibleOpenIds.map(nonEmptyText).filter(Boolean))].map((id) => ({ id }));
  }
  if (!creating && Object.keys(fields).length === 0) throw new Error('没有可更新的任务字段');
  return fields;
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
      const statusDefinition = definitions.find((definition) => definition.field_name === '状态');
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
          category: textValue(record.fields?.事项分类),
          subgroup: textValue(record.fields?.子分组),
          notes: textValue(record.fields?.备注),
          responsiblePerson: owners[0]?.name ?? null,
          responsiblePeople: owners,
          reviewerPeople: [],
          peopleStatus: owners.length > 0 ? 'resolved' : rawOwners.length > 0 ? 'unresolved' : 'unassigned',
        };
      });
      const ownerOptions = [...new Map(tasks.flatMap((task) => task.responsiblePeople).map((person) => [person.id, person])).values()];
      const baseUrl = `https://qingmutec.feishu.cn/base/${source.appToken}?table=${source.tableId}`;
      return {
        tasks,
        templates: [],
        statusOptions: selectOptions(statusDefinition),
        ownerOptions,
        source: { tasksUrl: baseUrl, templatesUrl: '', readOnly: false, writable: true },
        viewer: viewer ?? null,
        readStatus: { sourceKey: source.key, mode: 'live-readwrite', lastReadAt: now().toISOString(), recordCount: records.length, cached: false, warnings: ['任务模板表尚未单独映射'] },
      };
    },
    async createTask(input) {
      const record = await client.createRecord(source.appToken, source.tableId, writableTaskFields(input ?? {}, { creating: true }));
      return { recordId: record.record_id };
    },
    async updateTask(id, input) {
      const normalizedId = recordId(id);
      const record = await client.updateRecord(source.appToken, source.tableId, normalizedId, writableTaskFields(input ?? {}));
      return { recordId: record.record_id };
    },
    async deleteTask(id) {
      const normalizedId = recordId(id);
      await client.deleteRecord(source.appToken, source.tableId, normalizedId);
      return { recordId: normalizedId, deleted: true };
    },
  });
}
