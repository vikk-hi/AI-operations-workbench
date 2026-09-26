const redactedError = (error) => ({
  kind: typeof error?.kind === 'string' ? error.kind : 'module_error',
  code: typeof error?.code === 'string' || typeof error?.code === 'number' ? error.code : 'UNAVAILABLE',
});

export function createWorkbenchApi(repositories, options = {}) {
  const cacheTtlMs = Number(options.cacheTtlMs ?? 60_000);
  const now = options.now ?? Date.now;
  const cache = new Map();
  const routes = {
    '/api/workbench/overview': () => repositories.core.getOverview(),
    '/api/workbench/tasks': (viewer) => repositories.tasks.getTasks(viewer ?? null),
    '/api/workbench/targets': () => repositories.targets.getTargets(),
    '/api/workbench/timeline': () => repositories.timeline.getTimeline(),
    '/api/workbench/sources': () => Promise.resolve(options.sources ?? { sources: [], replacementRule: '本地只读连接，不修改原始多维表格' }),
    '/api/workbench/categories': () => Promise.resolve({ status: 'unavailable', asOf: null, source: '', rows: [] }),
    '/api/workbench/products': () => Promise.resolve({ status: 'unavailable', coverage: 'none', asOf: null, rows: [], message: '商品明细数据源尚未接入' }),
  };

  return Object.freeze({
    async handle(method, path, viewer = null) {
      if (!path.startsWith('/api/workbench/')) return { status: 404, body: { error: 'Not found' } };
      if (method !== 'GET') return { status: 405, body: { error: 'Read-only endpoint' } };
      const read = routes[path];
      if (!read) return { status: 404, body: { error: 'Not found' } };
      const cacheKey = path === '/api/workbench/tasks' ? `${path}:${viewer?.id ?? 'anonymous'}` : path;
      const cached = cache.get(cacheKey);
      if (cached && cached.expiresAt > now()) return { status: 200, body: { ...cached.body, readStatus: { ...(cached.body.readStatus ?? {}), cached: true } } };
      try {
        const body = await read(viewer);
        cache.set(cacheKey, { body, expiresAt: now() + cacheTtlMs });
        return { status: 200, body };
      } catch (error) {
        return { status: 503, body: { error: redactedError(error) } };
      }
    },
  });
}
