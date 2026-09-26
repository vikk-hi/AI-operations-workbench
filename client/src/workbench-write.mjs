export function createWorkbenchWriter({ baseUrl, fetchImpl = fetch, refresh }) {
  return async (moduleName, method, recordId = '', body = null) => {
    if (moduleName !== 'tasks' || !['POST', 'PATCH'].includes(method)) throw new Error('该数据模块或操作不允许写入');
    if (method === 'PATCH' && (typeof recordId !== 'string' || !recordId.trim())) throw new Error('任务记录 ID 不能为空');
    const endpoint = method === 'POST' ? `${baseUrl}/api/workbench/tasks` : `${baseUrl}/api/workbench/tasks/${encodeURIComponent(recordId.trim())}`;
    const response = await fetchImpl(endpoint, {
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
        INVALID_TITLE: '请输入任务事项',
      };
      let refreshStatus = 'not_attempted';
      const committed = error?.committed === true;
      if (committed || (code && staleMessages[code])) {
        try {
          await refresh();
          refreshStatus = 'succeeded';
        } catch {
          refreshStatus = 'failed';
        }
      }
      const baseMessage = committed ? '任务已写入多维表，但复读验证未完成；请不要重复创建'
        : typeof error === 'string' ? error
        : response.status === 401 ? '请先登录'
          : staleMessages[code] ?? `操作失败（${code ?? response.status}）`;
      const message = refreshStatus === 'failed' ? `${baseMessage}；任务列表刷新失败，请刷新页面后重试` : baseMessage;
      const failure = new Error(message);
      failure.code = code;
      failure.refreshStatus = refreshStatus;
      failure.committed = committed;
      failure.recordId = committed && typeof error?.recordId === 'string' ? error.recordId : null;
      throw failure;
    }
    try {
      await refresh();
    } catch {
      const failure = new Error('数据已写入并验证，但页面刷新失败，请保留当前窗口并重试刷新');
      failure.committed = true;
      failure.recordId = typeof payload?.recordId === 'string' ? payload.recordId : method === 'PATCH' ? recordId.trim() : null;
      throw failure;
    }
    return payload;
  };
}
