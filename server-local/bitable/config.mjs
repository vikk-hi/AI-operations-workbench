const source = (key, label, appToken, tableId, enabled = true, writable = false) => Object.freeze({
  key,
  label,
  appToken,
  tableId,
  enabled,
  readOnly: !writable,
  writable,
});

const SOURCES = Object.freeze({
  core: source('core', '核心经营数据', 'M1z2bWhVhahRlDsBUG1cDQUwnRg', 'tblxTrxDK5lGJxlo'),
  tasks: source('tasks', '执行任务', 'O4XhbiUw2aa5yRsgR8fckrNpnXe', 'tbl1Hi7UvvXTzTiQ', true, true),
  timeline: source('timeline', '活动时间线', 'KP2abpA8waP3Nbs3mptcXXMwn9d', 'tbl2bLwV4QSLDVYL', true, true),
  companyTargets: source('companyTargets', '公司目标', 'PNlTbnPPdaC4mKsWiulcuYzznHd', 'tbl74NgTMPJdwQXH'),
  coreHistory: source('coreHistory', '核心经营历史同期', 'M1z2bWhVhahRlDsBUG1cDQUwnRg', null, false),
  taskTemplates: source('taskTemplates', '任务模板', 'KP2abpA8waP3Nbs3mptcXXMwn9d', null, false),
  brandTargets: source('brandTargets', '品牌目标', null, null, false),
  taskMain: source('taskMain', '任务主表', 'O4XhbiUw2aa5yRsgR8fckrNpnXe', null, false),
});

export function loadBitableConfig(env = process.env) {
  const appId = env.FEISHU_APP_ID?.trim() || '';
  const appSecret = env.FEISHU_APP_SECRET?.trim() || '';
  const missing = [
    ['FEISHU_APP_ID', appId],
    ['FEISHU_APP_SECRET', appSecret],
  ].filter(([, value]) => !value).map(([name]) => name);

  return {
    appId,
    appSecret,
    sources: SOURCES,
    cacheTtlMs: Number(env.BITABLE_CACHE_TTL_MS || 60_000),
    pageSize: Number(env.BITABLE_PAGE_SIZE || 500),
    publicStatus: {
      configured: missing.length === 0,
      missing,
      enabledSources: Object.values(SOURCES).filter((item) => item.enabled).map((item) => item.key),
      disabledSources: Object.values(SOURCES).filter((item) => !item.enabled).map((item) => item.key),
    },
  };
}

export function resolveSource(config, sourceKey) {
  const selected = config.sources[sourceKey];
  if (!selected) throw new Error(`Bitable source is not allowlisted: ${sourceKey}`);
  if (!selected.enabled || !selected.appToken || !selected.tableId) {
    throw new Error(`Bitable source is not enabled: ${sourceKey}`);
  }
  return selected;
}
