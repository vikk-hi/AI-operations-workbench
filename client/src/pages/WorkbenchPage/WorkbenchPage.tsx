import { useEffect, useState } from 'react';
import { Activity, BadgeCheck, CalendarDays, ChevronRight, CircleAlert, Database, Gauge, ListChecks, RefreshCw, Settings2, ShoppingBag, Sparkles, Target, Users } from 'lucide-react';
import { getCoreDashboard, getDataSources, getTasksDashboard } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CoreDashboardResponse, DashboardRange, DataSourcesResponse, MetricValue, TasksDashboardResponse } from '@shared/api.interface';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

type View = 'core' | 'diagnosis' | 'tasks' | 'sources';
const ranges: Array<[DashboardRange, string]> = [['day', '最新完整日'], ['7d', '近7日'], ['mtd', '本月'], ['ytd', '本年']];

const formatValue = (metric: MetricValue) => {
  if (metric.value == null) return '—';
  if (metric.unit === 'percent') return `${(metric.value * 100).toFixed(2)}%`;
  if (metric.unit === 'currency') return `¥${metric.value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
  return metric.value.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
};
const percent = (value: number | null) => value == null ? '数据不足' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;

export default function WorkbenchPage() {
  const [view, setView] = useState<View>('core');
  const [range, setRange] = useState<DashboardRange>('day');
  const [core, setCore] = useState<CoreDashboardResponse | null>(null);
  const [tasks, setTasks] = useState<TasksDashboardResponse | null>(null);
  const [sources, setSources] = useState<DataSourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    Promise.all([getCoreDashboard(range), getTasksDashboard(), getDataSources()])
      .then(([coreData, taskData, sourceData]) => { setCore(coreData); setTasks(taskData); setSources(sourceData); })
      .catch(() => setError('数据加载失败，请稍后重试'))
      .finally(() => setLoading(false));
  }, [range]);

  const nav = [
    { key: 'core' as const, label: '核心数据', icon: Gauge },
    { key: 'diagnosis' as const, label: '店铺诊断', icon: Activity },
    { key: 'tasks' as const, label: '待办事项', icon: ListChecks },
  ];

  return <div className="workbench-shell">
    <aside className="workbench-sidebar">
      <div className="brand-mark"><div className="brand-logo">H&M</div><div><strong>运营工作台</strong><span>妙搭全栈版</span></div></div>
      <nav>{nav.map(({ key, label, icon: Icon }) => <button key={key} className={view === key ? 'nav-item active' : 'nav-item'} onClick={() => setView(key)}><Icon />{label}<ChevronRight /></button>)}</nav>
      <div className="sidebar-note"><Database /><div><strong>真实数据已接入</strong><span>使用副本持续同步，原表只读</span></div></div>
    </aside>
    <main className="workbench-main">
      <header className="workbench-header"><div><p>H&M 电商运营</p><h1>{view === 'sources' ? '数据源设置' : nav.find((item) => item.key === view)?.label}</h1></div><div className="header-actions"><Badge variant="outline"><RefreshCw />持续同步</Badge><Button variant="outline" size="icon" aria-label="数据源设置" onClick={() => setView('sources')}><Settings2 /></Button></div></header>
      {error && <div className="error-banner"><CircleAlert />{error}</div>}
      {loading ? <div className="loading-state"><RefreshCw className="spin" />正在读取妙搭数据库…</div> : null}
      {!loading && view === 'core' && core && <CorePanel data={core} range={range} setRange={setRange} />}
      {!loading && view === 'diagnosis' && <DiagnosisPanel />}
      {!loading && view === 'tasks' && tasks && <TasksPanel data={tasks} />}
      {!loading && view === 'sources' && sources && <SourcesPanel data={sources} />}
    </main>
  </div>;
}

function CorePanel({ data, range, setRange }: { data: CoreDashboardResponse; range: DashboardRange; setRange: (range: DashboardRange) => void }) {
  return <section className="panel-stack">
    <div className="toolbar"><div className="range-switch">{ranges.map(([key, label]) => <button key={key} className={key === range ? 'selected' : ''} onClick={() => setRange(key)}>{label}</button>)}</div><span>{data.period.start} 至 {data.period.end} · {data.period.days} 天</span></div>
    <div className="metric-grid">{data.metrics.map((metric) => <Card key={metric.key} className="metric-card"><CardHeader><CardTitle>{metric.label}</CardTitle><Target /></CardHeader><CardContent><div className="metric-value">{formatValue(metric)}</div><div className="metric-target"><span>目标 {metric.target == null ? '未配置' : metric.unit === 'percent' ? `${(metric.target * 100).toFixed(2)}%` : metric.target.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</span><b>{metric.targetRate == null ? '—' : `${(metric.targetRate * 100).toFixed(1)}%`}</b></div><div className="comparison"><span>同比 <b className={(metric.yoy ?? 0) >= 0 ? 'positive' : 'negative'}>{percent(metric.yoy)}</b></span><span>环比 <b className={(metric.mom ?? 0) >= 0 ? 'positive' : 'negative'}>{percent(metric.mom)}</b></span></div></CardContent></Card>)}</div>
    <Card className="formula-card"><CardHeader><CardTitle><Sparkles />黄金公式</CardTitle></CardHeader><CardContent><div className="formula-flow"><span>GMV</span><i>=</i><span>UV</span><i>×</i><span>转化率</span><i>×</i><span>客单价</span></div><p>转化率、客单价、件单价均按汇总分子 ÷ 汇总分母计算，并分别展示目标、同比、环比。</p></CardContent></Card>
    {data.warnings.length > 0 && <div className="warning-row">{data.warnings.map((warning) => <span key={warning}><CircleAlert />{warning}</span>)}</div>}
  </section>;
}

function DiagnosisPanel() {
  const items = [{ label: '流量机会', value: '搜索流量有提升空间', icon: Users }, { label: '转化诊断', value: '商品页转化偏弱', icon: ShoppingBag }, { label: '客单结构', value: '连带购买可优化', icon: Activity }];
  return <section className="panel-stack"><div className="demo-banner"><Sparkles /><div><strong>演示数据预留区</strong><p>当前诊断尚未连接真实数据源，以下内容只用于确认界面与分析结构。</p></div><Badge>DEMO</Badge></div><div className="diagnosis-grid">{items.map(({ label, value, icon: Icon }) => <Card key={label}><CardHeader><Icon /><CardTitle>{label}</CardTitle></CardHeader><CardContent><h3>{value}</h3><p>后续可绑定商品、流量和行业对标数据，形成可追溯诊断。</p></CardContent></Card>)}</div></section>;
}

function TasksPanel({ data }: { data: TasksDashboardResponse }) {
  return <section className="task-layout"><Card><CardHeader><CardTitle><ListChecks />当前待办</CardTitle><Badge variant="secondary">{data.tasks.length} 条</Badge></CardHeader><CardContent className="item-list">{data.tasks.slice(0, 12).map((task) => <div className="task-row" key={task.id}><span className="status-dot" /><div><strong>{task.title}</strong><p>{task.section ?? '未分组'} · {task.startDate ?? '未排期'} → {task.endDate ?? '未设置DDL'}</p></div><Badge variant="outline">{task.status}</Badge></div>)}</CardContent></Card><Card><CardHeader><CardTitle><CalendarDays />策划事项模板</CardTitle><Badge variant="secondary">{data.templates.length} 项</Badge></CardHeader><CardContent className="item-list">{data.templates.slice(0, 12).map((item) => <div className="template-row" key={item.id}><div><strong>{item.title}</strong><p>{item.scene ?? '通用场景'} · {item.frequency ?? '按需'}</p></div>{item.skills.length > 0 && <Badge>{item.skills[0]}</Badge>}</div>)}</CardContent></Card><div className="writeback-note"><BadgeCheck /><div><strong>读取链路已接通</strong><p>新建任务写回多维表和负责人消息触达将作为下一阶段启用；当前页面不会假装写入成功。</p></div></div></section>;
}

function SourcesPanel({ data }: { data: DataSourcesResponse }) {
  return <section className="panel-stack"><div className="source-intro"><div><h2>已注册的数据源</h2><p>{data.replacementRule}</p></div><Badge variant="outline">原表零改动</Badge></div><div className="source-grid">{data.sources.map((source) => <Card key={source.key}><CardHeader><Database /><div><CardTitle>{source.label}</CardTitle><p>{source.tableName}</p></div><Badge variant={source.mode === 'demo' ? 'secondary' : 'default'}>{source.mode === 'demo' ? '演示' : '持续同步'}</Badge></CardHeader><CardContent><p>{source.readOnlyOriginal ? '从副本读取 · 原表只读' : '可写'}</p>{source.baseUrl ? <UniversalLink to={source.baseUrl} target="_blank" rel="noreferrer">打开数据源 <ChevronRight /></UniversalLink> : <span>等待配置</span>}</CardContent></Card>)}</div><div className="source-next"><Settings2 /><div><strong>后续自助更换流程</strong><p>选择候选多维表 → 自动复制 → 校验字段 → 注册为可选数据源 → 切换生效。为避免误改原表，不允许直接覆盖当前同步。</p></div></div></section>;
}
