export interface TaskPerson {
  id: string;
  name: string;
}

function parseValue(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

export function normalizeTaskPeople(raw: unknown): TaskPerson[] {
  const value: unknown = parseValue(raw);
  const candidates: unknown[] = Array.isArray(value) ? value : value ? [value] : [];
  const people: TaskPerson[] = [];
  const seen: Set<string> = new Set();

  for (const candidate of candidates) {
    if (typeof candidate !== 'object' || candidate === null) continue;
    const record: Record<string, unknown> = candidate as Record<string, unknown>;
    const id: unknown = record.id ?? record.user_id ?? record.userId;
    const name: unknown = record.name;
    if (typeof id !== 'string' || !id.trim() || typeof name !== 'string' || !name.trim()) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    people.push({ id, name });
  }
  return people;
}

export function linkedRecordIds(raw: unknown): string[] {
  const value: unknown = parseValue(raw);
  if (typeof value !== 'object' || value === null) return [];
  const ids: unknown = (value as Record<string, unknown>).link_record_ids;
  return Array.isArray(ids) ? ids.filter((id: unknown): id is string => typeof id === 'string') : [];
}
