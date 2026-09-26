const WRITABLE_MODULES = new Set(['tasks', 'timeline']);
const WRITABLE_METHODS = new Set(['POST', 'PATCH', 'DELETE']);

export function createWorkbenchWriter({ baseUrl, fetchImpl = fetch, refresh }) {
  return async (moduleName, method, recordId = '', body = null) => {
    if (!WRITABLE_MODULES.has(moduleName)) throw new Error('该数据模块不允许写入');
    if (!WRITABLE_METHODS.has(method)) throw new Error('不支持的写入操作');
    const suffix = recordId ? `/${encodeURIComponent(recordId)}` : '';
    const response = await fetchImpl(`${baseUrl}/api/workbench/${moduleName}${suffix}`, {
      method,
      credentials: 'include',
      headers: body === null ? undefined : { 'content-type': 'application/json' },
      body: body === null ? undefined : JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = payload?.error;
      const message = typeof error === 'string' ? error : response.status === 401 ? '请先登录' : `操作失败（${error?.code ?? response.status}）`;
      throw new Error(message);
    }
    await refresh();
    return payload;
  };
}
