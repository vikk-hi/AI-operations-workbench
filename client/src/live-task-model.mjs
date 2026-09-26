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
    responsibleOpenIds: stableIds((task?.responsiblePeople ?? []).map((person) => person.id)),
  };
}

export function buildTaskPatch(originalTask, draft) {
  const patch = {};
  const originalStatus = clean(originalTask?.status);
  const nextStatus = clean(draft?.status);
  const originalOwnerIds = stableIds((originalTask?.responsiblePeople ?? []).map((person) => person.id));
  const nextOwnerIds = stableIds(Array.isArray(draft?.responsibleOpenIds) ? draft.responsibleOpenIds : []);
  if (nextStatus !== originalStatus) patch.status = nextStatus;
  if (JSON.stringify(nextOwnerIds) !== JSON.stringify(originalOwnerIds)) patch.responsibleOpenIds = nextOwnerIds;
  return Object.keys(patch).length ? patch : null;
}

if (typeof window !== 'undefined') {
  window.__hmTaskModel = Object.freeze({ isTaskComplete, filterTasks, taskFilterOptions, createTaskEditDraft, buildTaskPatch });
}
