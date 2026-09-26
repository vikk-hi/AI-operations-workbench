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
const optionalSelect = (value, label) => {
  if (value === null || value === '') return null;
  const normalized = nonEmptyText(value);
  if (!normalized) throw new Error(`${label}必须是单选值或空值`);
  return normalized;
};
const selectOptions = (definition) => {
  const options = Array.isArray(definition?.property?.options) ? definition.property.options : [];
  return options.map((option) => nonEmptyText(option?.name)).filter(Boolean);
};
const recordId = (value) => {
  const id = nonEmptyText(value);
  if (!id) throw new Error('记录 ID 不能为空');
  return id;
};
const taskFromRecord = (record, reader) => {
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
};

class TaskVerificationError extends Error {
  constructor(recordId = null) {
    super('飞书多维表格写入后复读结果不一致');
    this.name = 'TaskVerificationError';
    this.kind = 'verification_mismatch';
    this.code = 'READBACK_MISMATCH';
    if (recordId) {
      this.committed = true;
      this.recordId = recordId;
    }
  }
}

class TaskUpdateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'TaskUpdateError';
    this.kind = 'invalid_task_update';
    this.code = code;
  }
}

const sortedIds = (values) => [...values].sort((left, right) => left.localeCompare(right));

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
      reader.requireField('事项分类', [3]);
      reader.requireField('状态', [3]);
      const statusDefinition = definitions.find((definition) => definition.field_name === '状态');
      const sectionDefinition = definitions.find((definition) => definition.field_name === '板块');
      const categoryDefinition = definitions.find((definition) => definition.field_name === '事项分类');
      const tasks = records.map((record) => taskFromRecord(record, reader));
      const ownerEntries = tasks.flatMap((task) => task.responsiblePeople).map((person) => [person.id, person]);
      if (nonEmptyText(viewer?.id) && nonEmptyText(viewer?.name)) ownerEntries.push([String(viewer.id), { id: String(viewer.id), name: String(viewer.name) }]);
      const ownerOptions = [...new Map(ownerEntries).values()];
      const baseUrl = `https://qingmutec.feishu.cn/base/${source.appToken}?table=${source.tableId}`;
      return {
        tasks,
        templates: [],
        statusOptions: selectOptions(statusDefinition),
        sectionOptions: selectOptions(sectionDefinition),
        categoryOptions: selectOptions(categoryDefinition),
        ownerOptions,
        source: { tasksUrl: baseUrl, templatesUrl: '', readOnly: false, writable: true },
        viewer: viewer ?? null,
        readStatus: { sourceKey: source.key, mode: 'live-readwrite', lastReadAt: now().toISOString(), recordCount: records.length, cached: false, warnings: ['任务模板表尚未单独映射'] },
      };
    },
    async createTask(input, viewer = null) {
      const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
      const writableKeys = ['title', 'responsibleOpenIds', 'section', 'category', 'subgroup', 'status', 'notes'];
      const unknown = Object.keys(body).filter((key) => !writableKeys.includes(key));
      if (unknown.length) throw new Error(`不允许新增字段：${unknown.join('、')}`);
      const [definitions, records] = await Promise.all([
        client.listFields(source.appToken, source.tableId),
        client.listAllRecords(source.appToken, source.tableId),
      ]);
      const reader = createFieldReader(definitions, { sourceAlias: source.key });
      reader.requireField('任务事项', [1]);
      reader.requireField('负责人', [11]);
      reader.requireField('板块', [3]);
      reader.requireField('事项分类', [3]);
      reader.requireField('子分组', [1]);
      reader.requireField('状态', [3]);
      reader.requireField('备注', [1]);
      const title = nonEmptyText(body.title);
      if (!title) throw new TaskUpdateError('INVALID_TITLE', '任务事项不能为空');
      if (!Array.isArray(body.responsibleOpenIds ?? [])) throw new Error('负责人必须是人员 ID 列表');
      const responsibleOpenIds = [...new Set((body.responsibleOpenIds ?? []).map(nonEmptyText).filter(Boolean))];
      const statusDefinition = definitions.find((definition) => definition.field_name === '状态');
      const sectionDefinition = definitions.find((definition) => definition.field_name === '板块');
      const categoryDefinition = definitions.find((definition) => definition.field_name === '事项分类');
      const status = nonEmptyText(body.status);
      const section = optionalSelect(body.section ?? null, '板块');
      const category = optionalSelect(body.category ?? null, '事项分类');
      const validStatuses = new Set(selectOptions(statusDefinition));
      const validSections = new Set(selectOptions(sectionDefinition));
      const validCategories = new Set(selectOptions(categoryDefinition));
      const validOwnerIds = new Set(records.flatMap((record) => people(record.fields?.负责人).map((person) => person.id)));
      if (nonEmptyText(viewer?.id)) validOwnerIds.add(String(viewer.id));
      if (!status || !validStatuses.has(status)) throw new TaskUpdateError('STALE_STATUS', '状态选项已失效，请刷新后重新选择');
      if (responsibleOpenIds.some((ownerId) => !validOwnerIds.has(ownerId))) throw new TaskUpdateError('STALE_OWNER', '负责人选项已失效，请刷新后重新选择');
      if (section !== null && !validSections.has(section)) throw new TaskUpdateError('STALE_SECTION', '板块选项已失效，请刷新后重新选择');
      if (category !== null && !validCategories.has(category)) throw new TaskUpdateError('STALE_CATEGORY', '事项分类选项已失效，请刷新后重新选择');
      const fields = {
        任务事项: title,
        负责人: responsibleOpenIds.map((id) => ({ id })),
        板块: section,
        事项分类: category,
        子分组: nonEmptyText(body.subgroup),
        状态: status,
        备注: nonEmptyText(body.notes),
      };
      const created = await client.createRecord(source.appToken, source.tableId, fields);
      try {
        const freshRecord = await client.getRecord(source.appToken, source.tableId, created.record_id);
        const task = taskFromRecord(freshRecord, reader);
        const matches = task.title === title
          && JSON.stringify(sortedIds(task.responsiblePeople.map((person) => person.id))) === JSON.stringify(sortedIds(responsibleOpenIds))
          && task.section === fields.板块
          && task.category === fields.事项分类
          && task.subgroup === fields.子分组
          && task.status === fields.状态
          && task.notes === fields.备注;
        if (!matches) throw new TaskVerificationError(created.record_id);
        return { recordId: created.record_id, syncStatus: 'verified', task };
      } catch (error) {
        if (error instanceof TaskVerificationError && error.recordId) throw error;
        throw new TaskVerificationError(created.record_id);
      }
    },
    async updateTask(id, input) {
      const normalizedId = recordId(id);
      const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
      const writableKeys = ['status', 'responsibleOpenIds', 'section', 'category'];
      const unknown = Object.keys(body).filter((key) => !writableKeys.includes(key));
      if (unknown.length) throw new Error(`不允许更新字段：${unknown.join('、')}`);
      if (!writableKeys.some((key) => key in body)) throw new Error('没有可更新的任务字段');

      const [definitions, records] = await Promise.all([
        client.listFields(source.appToken, source.tableId),
        client.listAllRecords(source.appToken, source.tableId),
      ]);
      const current = records.find((record) => record.record_id === normalizedId);
      if (!current) throw new TaskUpdateError('RECORD_NOT_FOUND', '任务记录不存在，请刷新后重试');
      const reader = createFieldReader(definitions, { sourceAlias: source.key });
      reader.requireField('任务事项', [1]);
      reader.requireField('负责人', [11]);
      reader.requireField('板块', [3]);
      reader.requireField('事项分类', [3]);
      reader.requireField('状态', [3]);
      const statusDefinition = definitions.find((definition) => definition.field_name === '状态');
      const sectionDefinition = definitions.find((definition) => definition.field_name === '板块');
      const categoryDefinition = definitions.find((definition) => definition.field_name === '事项分类');
      const validStatuses = new Set(selectOptions(statusDefinition));
      const validSections = new Set(selectOptions(sectionDefinition));
      const validCategories = new Set(selectOptions(categoryDefinition));
      const validOwnerIds = new Set(records.flatMap((record) => people(record.fields?.负责人).map((person) => person.id)));
      const fields = {};
      let expectedStatus;
      let expectedOwnerIds;
      let expectedSection;
      let expectedCategory;

      if ('status' in body) {
        expectedStatus = nonEmptyText(body.status);
        if (!expectedStatus || !validStatuses.has(expectedStatus)) throw new TaskUpdateError('STALE_STATUS', '状态选项已失效，请刷新后重新选择');
        fields.状态 = expectedStatus;
      }
      if ('responsibleOpenIds' in body) {
        if (!Array.isArray(body.responsibleOpenIds)) throw new Error('负责人必须是人员 ID 列表');
        expectedOwnerIds = [...new Set(body.responsibleOpenIds.map(nonEmptyText).filter(Boolean))];
        if (expectedOwnerIds.some((ownerId) => !validOwnerIds.has(ownerId))) throw new TaskUpdateError('STALE_OWNER', '负责人选项已失效，请刷新后重新选择');
        fields.负责人 = expectedOwnerIds.map((ownerId) => ({ id: ownerId }));
      }
      if ('section' in body) {
        expectedSection = optionalSelect(body.section, '板块');
        if (expectedSection !== null && !validSections.has(expectedSection)) throw new TaskUpdateError('STALE_SECTION', '板块选项已失效，请刷新后重新选择');
        fields.板块 = expectedSection;
      }
      if ('category' in body) {
        expectedCategory = optionalSelect(body.category, '事项分类');
        if (expectedCategory !== null && !validCategories.has(expectedCategory)) throw new TaskUpdateError('STALE_CATEGORY', '事项分类选项已失效，请刷新后重新选择');
        fields.事项分类 = expectedCategory;
      }

      await client.updateRecord(source.appToken, source.tableId, normalizedId, fields);
      const freshRecord = await client.getRecord(source.appToken, source.tableId, normalizedId);
      const task = taskFromRecord(freshRecord, reader);
      const statusMatches = expectedStatus === undefined || task.status === expectedStatus;
      const ownerIds = task.responsiblePeople.map((person) => person.id);
      const ownersMatch = expectedOwnerIds === undefined
        || JSON.stringify(sortedIds(ownerIds)) === JSON.stringify(sortedIds(expectedOwnerIds));
      const sectionMatches = expectedSection === undefined || task.section === expectedSection;
      const categoryMatches = expectedCategory === undefined || task.category === expectedCategory;
      if (!statusMatches || !ownersMatch || !sectionMatches || !categoryMatches) throw new TaskVerificationError();
      return { recordId: normalizedId, syncStatus: 'verified', task };
    },
  });
}
