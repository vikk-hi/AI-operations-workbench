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
      const code = error?.code;
      const staleMessages = {
        STALE_STATUS: '状态选项已更新，请重新选择后保存',
        STALE_OWNER: '负责人候选已更新，请重新选择后保存',
        STALE_SECTION: '板块选项已更新，请重新选择后保存',
        STALE_CATEGORY: '事项分类选项已更新，请重新选择后保存',
        RECORD_NOT_FOUND: '该任务记录已不存在，请刷新任务列表',
      };
      let refreshStatus = 'not_attempted';
      if (code && staleMessages[code]) {
        try {
          await refresh();
          refreshStatus = 'succeeded';
        } catch {
          refreshStatus = 'failed';
        }
      }
      const baseMessage = typeof error === 'string' ? error
        : response.status === 401 ? '请先登录'
          : staleMessages[code] ?? `操作失败（${code ?? response.status}）`;
      const message = refreshStatus === 'failed' ? `${baseMessage}；任务列表刷新失败，请刷新页面后重试` : baseMessage;
      const failure = new Error(message);
      failure.code = code;
      failure.refreshStatus = refreshStatus;
      throw failure;
    }
    try {
      await refresh();
    } catch {
      throw new Error('数据已写入并验证，但页面刷新失败，请保留当前窗口并重试刷新');
    }
    return payload;
  };
}
