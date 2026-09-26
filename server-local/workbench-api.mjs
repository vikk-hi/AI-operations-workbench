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

  const writeRoutes = {
    tasks: {
      create: (body, viewer) => repositories.tasks.createTask(body, viewer),
      update: (id, body, viewer) => repositories.tasks.updateTask(id, body, viewer),
      remove: (id, viewer) => repositories.tasks.deleteTask(id, viewer),
    },
    timeline: {
      create: (body, viewer) => repositories.timeline.createTimelineItem(body, viewer),
      update: (id, body, viewer) => repositories.timeline.updateTimelineItem(id, body, viewer),
      remove: (id, viewer) => repositories.timeline.deleteTimelineItem(id, viewer),
    },
  };

  const clearModuleCache = (moduleName) => {
    for (const key of cache.keys()) if (key === `/api/workbench/${moduleName}` || key.startsWith(`/api/workbench/${moduleName}:`)) cache.delete(key);
  };

  return Object.freeze({
    async handle(method, path, viewer = null, body = null) {
      if (!path.startsWith('/api/workbench/')) return { status: 404, body: { error: 'Not found' } };
      if (method === 'GET') {
        const read = routes[path];
        if (!read) return { status: 404, body: { error: 'Not found' } };
        const cacheKey = path === '/api/workbench/tasks' ? `${path}:${viewer?.id ?? 'anonymous'}` : path;
        const cached = cache.get(cacheKey);
        if (cached && cached.expiresAt > now()) return { status: 200, body: { ...cached.body, readStatus: { ...(cached.body.readStatus ?? {}), cached: true } } };
        try {
          const result = await read(viewer);
          cache.set(cacheKey, { body: result, expiresAt: now() + cacheTtlMs });
          return { status: 200, body: result };
        } catch (error) {
          return { status: 503, body: { error: redactedError(error) } };
        }
      }

      const match = /^\/api\/workbench\/(tasks|timeline)(?:\/([^/]+))?$/.exec(path);
      if (!match) return { status: 405, body: { error: 'Method not allowed' } };
      if (!viewer?.id) return { status: 401, body: { error: '请先使用飞书登录' } };
      const [, moduleName, encodedId] = match;
      const id = encodedId ? decodeURIComponent(encodedId) : '';
      const write = writeRoutes[moduleName];
      try {
        let result;
        let status = 200;
        if (method === 'POST' && !id) { result = await write.create(body ?? {}, viewer); status = 201; }
        else if (method === 'PATCH' && id) result = await write.update(id, body ?? {}, viewer);
        else if (method === 'DELETE' && id) result = await write.remove(id, viewer);
        else return { status: 405, body: { error: 'Method not allowed' } };
        clearModuleCache(moduleName);
        return { status, body: result };
      } catch (error) {
        const diagnostic = redactedError(error);
        const status = diagnostic.kind === 'forbidden' ? 403 : error instanceof Error && !('kind' in error) ? 400 : 503;
        return { status, body: { error: diagnostic } };
      }
    },
  });
}
