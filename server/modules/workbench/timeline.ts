export interface TimelineRawRow {
  recordId: string;
  activity: string | null;
  item: string | null;
  owner: unknown;
  start: string | null;
  end: string | null;
  itemStart?: string | null;
  itemEnd?: string | null;
  completed?: boolean | null;
}

export interface TimelineRow {
  recordId: string;
  activity: string;
  item: string;
  activityStart: string | null;
  activityEnd: string | null;
  itemStart: string | null;
  itemEnd: string | null;
  sourceOwnerName: string | null;
  ownerName: string;
  selectedForTest: boolean;
  completed: boolean;
}

function lookupName(value: unknown): string | null {
  if (typeof value === 'string') {
    try { return lookupName(JSON.parse(value)); } catch { return value.trim() || null; }
  }
  if (Array.isArray(value)) return value.map(lookupName).filter(Boolean).join('、') || null;
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    if (typeof item.name === 'string') return item.name;
    return lookupName(item.value);
  }
  return null;
}

export function normalizeTimeline(rows: readonly TimelineRawRow[]): TimelineRow[] {
  let targetSelected = false;
  return rows.filter((row) => row.activity === '双11抢先购')
    .sort((a, b) => (a.itemStart ?? '').localeCompare(b.itemStart ?? '') || a.recordId.localeCompare(b.recordId))
    .map((row) => {
    const isTarget = row.item === '大促活动目标制定（618/D11/IP活动）';
    const selectedForTest = isTarget && !targetSelected;
    if (selectedForTest) targetSelected = true;
    const sourceOwnerName = lookupName(row.owner);
    return {
      recordId: row.recordId,
      activity: row.activity ?? '',
      item: row.item ?? '未命名事项',
      activityStart: row.start,
      activityEnd: row.end,
      itemStart: row.itemStart ?? null,
      itemEnd: row.itemEnd ?? null,
      sourceOwnerName,
      ownerName: selectedForTest ? '榅桲' : sourceOwnerName ?? '待分派',
      selectedForTest,
      completed: row.completed === true,
    };
  });
}
