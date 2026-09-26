import type { CategoryMetricRow, CategoryResponse } from '@shared/api.interface';

interface RawCategoryRow {
  category?: unknown;
  categoryII?: unknown;
  gmv?: unknown;
  share?: unknown;
  dayChange?: unknown;
  yearChange?: unknown;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed: number = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeCategoryRows(rows: readonly RawCategoryRow[]): CategoryMetricRow[] {
  const seen: Set<string> = new Set();
  const result: CategoryMetricRow[] = [];
  for (const row of rows) {
    const category: string = typeof row.category === 'string' ? row.category.trim() : '';
    const categoryII: string = typeof row.categoryII === 'string' ? row.categoryII.trim() : '';
    if (!category || !categoryII) continue;
    const key: string = `${category}\u001f${categoryII}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      key,
      category,
      categoryII,
      gmv: numberOrNull(row.gmv),
      share: numberOrNull(row.share),
      dayChange: numberOrNull(row.dayChange),
      yearChange: numberOrNull(row.yearChange),
    });
  }
  return result;
}

export function buildCategoryResponse(rows: readonly RawCategoryRow[], asOf: string): CategoryResponse {
  const normalized: CategoryMetricRow[] = normalizeCategoryRows(rows);
  return {
    status: normalized.length ? 'snapshot' : 'unavailable',
    asOf: normalized.length ? asOf : null,
    source: 'BI · H&M Daily Report / Daily Report-category',
    rows: normalized,
  };
}
