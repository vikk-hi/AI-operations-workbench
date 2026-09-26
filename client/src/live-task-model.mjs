const completePattern = /已完成|已取消|无需执行|结束/;
const clean = (value) => typeof value === 'string' ? value.trim() : '';
const unique = (values) => [...new Set(values)];
const stableIds = (values) => unique(values.map(clean).filter(Boolean)).sort((left, right) => left.localeCompare(right));

export const isTaskComplete = (task) => completePattern.test(clean(task?.status));

export function filterTasks(tasks, filters = {}) {
  const list = Array.isArray(tasks) ? tasks : [];
  const scope = filters.scope ?? 'mine';
  const completion = filters.completion ?? 'open';
  const search = clean(filters.search).toLocaleLowerCase('zh-CN');
  return list.filter((task) => {
    const ownerIds = (task.responsiblePeople ?? []).map((person) => person.id);
    if (scope === 'mine' && (!filters.viewerId || !ownerIds.includes(filters.viewerId))) return false;
    if (completion === 'open' && isTaskComplete(task)) return false;
    if (completion === 'ended' && !isTaskComplete(task)) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.ownerId && !ownerIds.includes(filters.ownerId)) return false;
    if (filters.section && task.section !== filters.section) return false;
    if (search) {
      const haystack = [task.title, task.id, task.section, task.category, task.subgroup, task.notes]
        .map((value) => clean(value).toLocaleLowerCase('zh-CN'));
      if (!haystack.some((value) => value.includes(search))) return false;
    }
    return true;
  });
}

export function taskFilterOptions(tasks, statusOptions, ownerOptions) {
  const statuses = unique((statusOptions ?? []).map(clean).filter(Boolean));
  const ownersById = new Map();
  for (const person of ownerOptions ?? []) if (person?.id && person?.name && !ownersById.has(person.id)) ownersById.set(person.id, person);
  const owners = [...ownersById.values()];
  const sections = unique((tasks ?? []).map((task) => clean(task.section)).filter(Boolean)).sort((left, right) => left.localeCompare(right, 'zh-CN'));
  return { statuses, owners, sections };
}

export function createTaskEditDraft(task) {
  return {
    status: clean(task?.status),
    section: clean(task?.section),
    category: clean(task?.category),
    responsibleOpenIds: stableIds((task?.responsiblePeople ?? []).map((person) => person.id)),
  };
}

export function currentSelectChoice(value, options) {
  const normalizedValue = clean(value);
  const normalizedOptions = unique((options ?? []).map(clean).filter(Boolean));
  return {
    options: normalizedOptions,
    value: normalizedValue,
    stale: Boolean(normalizedValue) && !normalizedOptions.includes(normalizedValue),
  };
}

export function reconcileTaskEditDraft(task, preservedDraft, statusOptions, ownerOptions, sectionOptions, categoryOptions) {
  const current = createTaskEditDraft(task);
  if (!preservedDraft) return current;
  const allowedStatuses = new Set((statusOptions ?? []).map(clean).filter(Boolean));
  const allowedOwnerIds = new Set((ownerOptions ?? []).map((person) => clean(person?.id)).filter(Boolean));
  const allowedSections = new Set((sectionOptions ?? []).map(clean).filter(Boolean));
  const allowedCategories = new Set((categoryOptions ?? []).map(clean).filter(Boolean));
  const preservedOwnerIds = stableIds(Array.isArray(preservedDraft.responsibleOpenIds) ? preservedDraft.responsibleOpenIds : []);
  const validOwnerIds = preservedOwnerIds.filter((id) => allowedOwnerIds.has(id));
  return {
    status: allowedStatuses.has(clean(preservedDraft.status)) ? clean(preservedDraft.status) : current.status,
    section: clean(preservedDraft.section) === '' || allowedSections.has(clean(preservedDraft.section)) ? clean(preservedDraft.section) : current.section,
    category: clean(preservedDraft.category) === '' || allowedCategories.has(clean(preservedDraft.category)) ? clean(preservedDraft.category) : current.category,
    responsibleOpenIds: preservedOwnerIds.length > 0 && validOwnerIds.length === 0 ? current.responsibleOpenIds : validOwnerIds,
  };
}

export function buildTaskPatch(originalTask, draft) {
  const patch = {};
  const originalStatus = clean(originalTask?.status);
  const nextStatus = clean(draft?.status);
  const originalOwnerIds = stableIds((originalTask?.responsiblePeople ?? []).map((person) => person.id));
  const nextOwnerIds = stableIds(Array.isArray(draft?.responsibleOpenIds) ? draft.responsibleOpenIds : []);
  const originalSection = clean(originalTask?.section);
  const nextSection = clean(draft?.section);
  const originalCategory = clean(originalTask?.category);
  const nextCategory = clean(draft?.category);
  if (nextStatus !== originalStatus) patch.status = nextStatus;
  if (JSON.stringify(nextOwnerIds) !== JSON.stringify(originalOwnerIds)) patch.responsibleOpenIds = nextOwnerIds;
  if (nextSection !== originalSection) patch.section = nextSection || null;
  if (nextCategory !== originalCategory) patch.category = nextCategory || null;
  return Object.keys(patch).length ? patch : null;
}

export function buildBitableRecordUrl(baseUrl, recordId) {
  const url = new URL(baseUrl);
  url.searchParams.set('record', String(recordId));
  return url.toString();
}

if (typeof window !== 'undefined') {
  window.__hmTaskModel = Object.freeze({ isTaskComplete, filterTasks, taskFilterOptions, createTaskEditDraft, currentSelectChoice, reconcileTaskEditDraft, buildTaskPatch, buildBitableRecordUrl });
}
