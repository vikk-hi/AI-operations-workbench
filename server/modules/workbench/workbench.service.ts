import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthNPaasService, DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { desc } from 'drizzle-orm';
import { hmActivityTimeline, hmBrandTargets, hmCompanyTargets, hmCoreMetrics, hmCoreMetrics2025, hmTaskMain, hmTasks, hmTaskTemplates } from '@server/database/schema';
import type { CoreOverviewResponse, DashboardRange, DataSourcesResponse, ProductSourceResponse, TargetProgressResponse, TaskSummary, TasksDashboardResponse, TimelineResponse } from '@shared/api.interface';
import { buildDashboard, normalizeDate } from './workbench-metrics';
import { buildCategoryResponse } from './category-normalize';
import categorySnapshot from './category-snapshot';
import { summarizeCompanyTargets } from './company-target';
import { normalizeTimeline } from './timeline';
import { linkedRecordIds, normalizeTaskPeople } from './task-person';

const displayText = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(displayText).filter(Boolean).join(' / ') || null;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return displayText(record.name ?? record.text ?? record.value ?? Object.values(record));
  }
  return String(value);
};

@Injectable()
export class WorkbenchService {
  private readonly logger: Logger = new Logger(WorkbenchService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly authnService: AuthNPaasService,
  ) {}

  async getCore(range: DashboardRange) {
    const [current, history] = await Promise.all([
      this.db.select().from(hmCoreMetrics),
      this.db.select().from(hmCoreMetrics2025),
    ]);
    const response = buildDashboard(current, history, range);
    response.source.url = 'https://qingmutec.feishu.cn/base/M1z2bWhVhahRlDsBUG1cDQUwnRg';
    return response;
  }

  async getOverview(): Promise<CoreOverviewResponse> {
    const [current, history] = await Promise.all([
      this.db.select().from(hmCoreMetrics),
      this.db.select().from(hmCoreMetrics2025),
    ]);
    const ranges = Object.fromEntries((['day', '7d', 'mtd', 'ytd'] as DashboardRange[]).map((range) => [range, buildDashboard(current, history, range)])) as Record<DashboardRange, ReturnType<typeof buildDashboard>>;
    const daily = current.map((row) => ({ date: normalizeDate(row.appDate), gmv: row.gmv == null ? null : Number(row.gmv), target: row.appTarget == null ? null : Number(row.appTarget) }))
      .filter((row): row is { date: string; gmv: number | null; target: number | null } => row.date !== null)
      .filter((row) => row.gmv !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
    return { ranges, daily, sourceUrl: 'https://qingmutec.feishu.cn/base/M1z2bWhVhahRlDsBUG1cDQUwnRg' };
  }

  async getTasks(viewer: TasksDashboardResponse['viewer'], hasAppContext: boolean): Promise<TasksDashboardResponse> {
    const [tasks, templates, mainTasks] = await Promise.all([
      this.db.select().from(hmTasks).orderBy(desc(hmTasks.updatedAt)).limit(200),
      this.db.select().from(hmTaskTemplates).orderBy(desc(hmTaskTemplates.updatedAt)).limit(300),
      this.db.select().from(hmTaskMain),
    ]);
    const mainByRecordId: Map<string, typeof mainTasks[number]> = new Map(
      mainTasks.filter((task: typeof mainTasks[number]) => Boolean(task.baseRecordId))
        .map((task: typeof mainTasks[number]) => [task.baseRecordId!, task]),
    );
    const ownerIds: string[] = [...new Set(mainTasks.flatMap(
      (task: typeof mainTasks[number]) => task.personInCharge ?? [],
    ))];
    const peopleById: Map<string, string> = new Map();
    if (hasAppContext) {
      try {
        for (let index: number = 0; index < ownerIds.length; index += 100) {
          const batch: string[] = ownerIds.slice(index, index + 100);
          const users: Awaited<ReturnType<AuthNPaasService['listUsersByIds']>> =
            await this.authnService.listUsersByIds(batch);
          users.forEach((user, position: number) => {
            const name: string = user?.name?.zh_cn ?? user?.name?.en_us ?? '';
            if (name) peopleById.set(batch[position], name);
          });
        }
      } catch (error) {
        this.logger.warn(`Task owner lookup failed: ${String(error)}`);
      }
    }
    const summaries: TaskSummary[] = tasks.map((task: typeof tasks[number]): TaskSummary => {
      const mainRecordId: string | undefined = linkedRecordIds(task.mainTask)[0];
      const mainTask: typeof mainTasks[number] | undefined = mainRecordId
        ? mainByRecordId.get(mainRecordId) : undefined;
      const linkedOwnerIds: string[] = mainTask?.personInCharge ?? [];
      const responsiblePeople: TaskSummary['responsiblePeople'] = normalizeTaskPeople(
        linkedOwnerIds.map((id: string) => ({ id, name: peopleById.get(id) })),
      );
      const peopleStatus: TaskSummary['peopleStatus'] = !linkedOwnerIds.length
        ? 'unassigned' : responsiblePeople.length === linkedOwnerIds.length
          ? 'resolved' : 'unresolved';
      return {
        id: task.baseRecordId ?? task.id,
        title: task.appTask ?? '未命名任务',
        status: task.appStatus ?? '未设置',
        startDate: task.startDate ?? null,
        endDate: task.endDate ?? null,
        section: displayText(task.appSection),
        responsiblePerson: linkedOwnerIds[0] ?? null,
        responsiblePeople,
        reviewerPeople: [],
        peopleStatus,
      };
    });
    return {
      tasks: summaries,
      viewer,
      templates: templates.filter((item) => !item.department?.length || item.department.includes('策划')).map((item) => ({
        id: item.baseRecordId ?? item.id, title: item.workItem ?? '未命名事项', frequency: item.frequency ?? null,
        scene: item.workScene ?? null, skills: item.correspondingSkill ?? [],
      })),
      source: {
        tasksUrl: 'https://qingmutec.feishu.cn/base/O4XhbiUw2aa5yRsgR8fckrNpnXe',
        templatesUrl: 'https://qingmutec.feishu.cn/base/KP2abpA8waP3Nbs3mptcXXMwn9d', readOnly: true,
      },
    };
  }

  getSources(): DataSourcesResponse {
    return {
      sources: [
        { key: 'core', label: '核心经营数据', baseUrl: 'https://qingmutec.feishu.cn/base/M1z2bWhVhahRlDsBUG1cDQUwnRg', tableName: '2026 / 2025 天猫日报', mode: 'continuous-sync', readOnlyOriginal: true },
        { key: 'tasks', label: '执行任务', baseUrl: 'https://qingmutec.feishu.cn/base/O4XhbiUw2aa5yRsgR8fckrNpnXe', tableName: '南桑', mode: 'continuous-sync', readOnlyOriginal: true },
        { key: 'templates', label: '任务事项模板', baseUrl: 'https://qingmutec.feishu.cn/base/KP2abpA8waP3Nbs3mptcXXMwn9d', tableName: '团队工作事项', mode: 'continuous-sync', readOnlyOriginal: true },
        { key: 'diagnosis', label: '店铺诊断', baseUrl: '', tableName: '演示数据', mode: 'demo', readOnlyOriginal: true },
      ],
      replacementRule: '先复制候选多维表并校验字段，再注册为可选数据源；工作台不会改动原表。',
    };
  }

  getCategories() {
    return buildCategoryResponse(categorySnapshot, '2026-09-23');
  }

  getProducts(): ProductSourceResponse {
    return {
      status: 'unavailable', coverage: 'none', asOf: null, rows: [],
      message: 'BI DDN TOP 200（ID）在已测试的日、月及年范围返回零行；不能将其视为全店商品列表。',
    };
  }

  async getTargets(): Promise<TargetProgressResponse> {
    const [companyRows, brandRows, actualRows] = await Promise.all([
      this.db.select().from(hmCompanyTargets),
      this.db.select().from(hmBrandTargets),
      this.db.select().from(hmCoreMetrics),
    ]);
    const complete = actualRows.filter((row) => row.gmv != null && normalizeDate(row.appDate));
    const asOf = complete.map((row) => normalizeDate(row.appDate)!).sort().at(-1) ?? null;
    const company = summarizeCompanyTargets(companyRows.map((row) => ({
      month: row.appMonth, shop: row.shopNamePlatform,
      gmv: row._26YearTargetWithoutShoppingGold == null ? null : Number(row._26YearTargetWithoutShoppingGold),
      net: row._2026ActualTargetGmvXRefundRate == null ? null : Number(row._2026ActualTargetGmvXRefundRate),
    })), asOf ?? '2026-09-01');
    const actual = (start: string) => {
      const rows = complete.filter((row) => {
        const date = normalizeDate(row.appDate)!;
        return date >= start && asOf != null && date <= asOf;
      });
      return { gmv: rows.length ? rows.reduce((sum, row) => sum + Number(row.gmv), 0) : null,
        net: rows.length && rows.every((row) => row.net != null) ? rows.reduce((sum, row) => sum + Number(row.net), 0) : null };
    };
    const mtd = actual(asOf ? `${asOf.slice(0, 7)}-01` : '2026-09-01');
    const ytd = actual(asOf ? `${asOf.slice(0, 4)}-01-01` : '2026-01-01');
    const october = brandRows.filter((row) => (row.appDate ?? '').startsWith('2026-10-'))
      .map((row) => ({
        date: row.appDate!, recordId: row.baseRecordId ?? null,
        gmv: row.gmvTarget == null ? null : Number(row.gmvTarget),
        net: row.netTarget == null ? null : Number(row.netTarget),
        uv: row.uvTarget == null ? null : Number(row.uvTarget),
        cr: row.crTarget == null ? null : Number(row.crTarget),
        aov: row.aovTarget == null ? null : Number(row.aovTarget),
      })).sort((a, b) => a.date.localeCompare(b.date));
    const populated = october.filter((row) => [row.gmv, row.net, row.uv, row.cr, row.aov].every((value) => value != null));
    const d11 = october.filter((row) => row.date >= '2026-10-15' && row.date <= '2026-10-19');
    return {
      asOf,
      company: {
        source: 'QM目标 · HM官方旗舰店_天猫 · 不含购物金；读取同步副本，金额显示为整数元',
        precision: 'rounded-yuan',
        mtd: { gmvTarget: company.mtd.gmv, netTarget: company.mtd.net, gmvActual: mtd.gmv, netActual: mtd.net },
        ytd: { gmvTarget: company.ytd.gmv, netTarget: company.ytd.net, gmvActual: ytd.gmv, netActual: ytd.net },
        october: { gmvTarget: company.october.gmv, netTarget: company.october.net },
      },
      brand: {
        source: 'biz plan目标 · 已复制 Base；目标未经人工确认前不得视为生效',
        october,
        status: populated.length === 0 ? 'empty' : populated.length === 31 ? 'complete' : 'partial',
      },
      d11: {
        start: '2026-10-15', end: '2026-10-19',
        gmvTarget: d11.length === 5 && d11.every((row) => row.gmv != null) ? d11.reduce((sum, row) => sum + (row.gmv ?? 0), 0) : null,
        status: populated.length === 31 ? 'ready-for-review' : 'unconfirmed',
      },
    };
  }

  async getTimeline(): Promise<TimelineResponse> {
    const sourceRows = await this.db.select().from(hmActivityTimeline).orderBy(hmActivityTimeline.itemStartDate);
    const date = (value: unknown): string | null => value == null ? null : String(value).slice(0, 10);
    return {
      source: 'https://qingmutec.feishu.cn/base/KP2abpA8waP3Nbs3mptcXXMwn9d?table=tbl2bLwV4QSLDVYL',
      readOnly: true,
      rows: normalizeTimeline(sourceRows.map((row) => ({
        recordId: row.baseRecordId ?? row.id,
        activity: row.activityName,
        item: row.item,
        owner: row.appPrincipal,
        start: date(row.activityStartDate),
        end: date(row.activityEndDate),
        itemStart: date(row.itemStartDate),
        itemEnd: date(row.itemEndDate),
        completed: row.appIsCompleted,
      }))),
    };
  }
}
