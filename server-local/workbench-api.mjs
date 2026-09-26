const redactedError = (error) => {
  const diagnostic = {
    kind: typeof error?.kind === 'string' ? error.kind : 'module_error',
    code: typeof error?.code === 'string' || typeof error?.code === 'number' ? error.code : 'UNAVAILABLE',
  };
  if (error?.committed === true && typeof error?.recordId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(error.recordId)) {
    diagnostic.committed = true;
    diagnostic.recordId = error.recordId;
  }
  return diagnostic;
};

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

      const create = method === 'POST' && path === '/api/workbench/tasks';
      const match = method === 'PATCH' ? /^\/api\/workbench\/tasks\/([^/]+)$/.exec(path) : null;
      if (!create && !match) return { status: 405, body: { error: 'Method not allowed' } };
      if (!viewer?.id) return { status: 401, body: { error: '请先使用飞书登录' } };
      try {
        const result = create
          ? await repositories.tasks.createTask(body ?? {}, viewer)
          : await repositories.tasks.updateTask(decodeURIComponent(match[1]), body ?? {}, viewer);
        return { status: create ? 201 : 200, body: result };
      } catch (error) {
        const diagnostic = redactedError(error);
        const status = diagnostic.kind === 'verification_mismatch' ? 409
          : ['STALE_STATUS', 'STALE_OWNER', 'STALE_SECTION', 'STALE_CATEGORY'].includes(diagnostic.code) ? 409
            : diagnostic.code === 'RECORD_NOT_FOUND' ? 404
              : diagnostic.code === 'INVALID_TITLE' ? 400
          : diagnostic.kind === 'forbidden' ? 403
            : error instanceof Error && !('kind' in error) ? 400 : 503;
        return { status, body: { error: diagnostic } };
      } finally {
        clearModuleCache('tasks');
      }
    },
  });
}
