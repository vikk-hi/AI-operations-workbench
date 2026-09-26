export type DashboardRange = 'day' | '7d' | 'mtd' | 'ytd';

export interface MetricValue {
  key: 'gmv' | 'net' | 'uv' | 'buyers' | 'cvr' | 'aov' | 'asp';
  label: string;
  value: number | null;
  target: number | null;
  targetRate: number | null;
  yoy: number | null;
  mom: number | null;
  unit: 'currency' | 'number' | 'percent';
}

export interface CoreDashboardResponse {
  range: DashboardRange;
  period: { start: string | null; end: string | null; days: number };
  metrics: MetricValue[];
  warnings: string[];
  source: { name: string; url: string; updatedAt: string | null };
}

export interface CoreOverviewResponse {
  ranges: Record<DashboardRange, CoreDashboardResponse>;
  daily: Array<{ date: string; gmv: number | null; target: number | null }>;
  sourceUrl: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  section: string | null;
  category: string | null;
  subgroup: string | null;
  notes: string | null;
  responsiblePerson: string | null;
  responsiblePeople: Array<{ id: string; name: string }>;
  reviewerPeople: Array<{ id: string; name: string }>;
  peopleStatus: 'resolved' | 'unassigned' | 'unresolved';
}

export interface TaskTemplateSummary {
  id: string;
  title: string;
  frequency: string | null;
  scene: string | null;
  skills: string[];
}

export interface TasksDashboardResponse {
  tasks: TaskSummary[];
  templates: TaskTemplateSummary[];
  statusOptions: string[];
  ownerOptions: Array<{ id: string; name: string }>;
  source: { tasksUrl: string; templatesUrl: string; readOnly: boolean; writable: boolean };
  viewer: { id: string; name: string; role: 'developer' | 'member' } | null;
  readStatus: {
    sourceKey: string;
    mode: string;
    lastReadAt: string;
    recordCount: number;
    cached: boolean;
    warnings: string[];
  };
}

export interface DataSourceSummary {
  key: string;
  label: string;
  baseUrl: string;
  tableName: string;
  mode: 'continuous-sync' | 'read-write' | 'demo';
  readOnlyOriginal: boolean;
}

export interface DataSourcesResponse {
  sources: DataSourceSummary[];
  replacementRule: string;
}

export interface CategoryMetricRow {
  key: string;
  category: string;
  categoryII: string;
  gmv: number | null;
  share: number | null;
  dayChange: number | null;
  yearChange: number | null;
}

export interface CategoryResponse {
  status: 'snapshot' | 'unavailable';
  asOf: string | null;
  source: string;
  rows: CategoryMetricRow[];
}

export interface ProductSourceResponse {
  status: 'snapshot' | 'unavailable';
  coverage: 'top-200-id' | 'none';
  asOf: string | null;
  rows: [];
  message: string;
}

export interface TargetProgressResponse {
  asOf: string | null;
  company: {
    source: string;
    precision: 'rounded-yuan';
    mtd: { gmvTarget: number | null; netTarget: number | null; gmvActual: number | null; netActual: number | null };
    ytd: { gmvTarget: number | null; netTarget: number | null; gmvActual: number | null; netActual: number | null };
    october: { gmvTarget: number | null; netTarget: number | null };
  };
  brand: {
    source: string;
    october: Array<{ date: string; recordId: string | null; gmv: number | null; net: number | null; uv: number | null; cr: number | null; aov: number | null }>;
    status: 'empty' | 'partial' | 'complete';
  };
  d11: { start: '2026-10-15'; end: '2026-10-19'; gmvTarget: number | null; status: 'unconfirmed' | 'ready-for-review' };
}

export interface TimelineResponse {
  source: string;
  readOnly: true;
  rows: Array<{
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
  }>;
}
