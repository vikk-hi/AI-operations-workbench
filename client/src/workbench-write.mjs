export function createWorkbenchWriter({ baseUrl, fetchImpl = fetch, refresh }) {
  return async (moduleName, method, recordId = '', body = null) => {
    if (moduleName !== 'tasks' || method !== 'PATCH') throw new Error('该数据模块或操作不允许写入');
    if (typeof recordId !== 'string' || !recordId.trim()) throw new Error('任务记录 ID 不能为空');
    const response = await fetchImpl(`${baseUrl}/api/workbench/tasks/${encodeURIComponent(recordId.trim())}`, {
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
