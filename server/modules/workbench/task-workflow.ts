export type TaskWorkflowStatus = 'active' | 'awaiting-result' | 'submitted' | 'returned' | 'approved' | 'sync-paused';

export interface TaskWorkflow {
  taskNumber: string;
  creatorId: string;
  executorId: string;
  reviewerId: string;
  status: TaskWorkflowStatus;
  result: string | null;
  resultLink: string | null;
  creatorRecordDone: boolean;
  notify: string[];
  appliedKeys: string[];
}

export type TaskCommand = {
  key: string;
  type: 'submit' | 'return' | 'approve' | 'conflict';
  actorId: string;
  result?: string;
  resultLink?: string;
  comment?: string;
};

export function newTaskWorkflow(taskNumber: string, creatorId: string, executorId: string, reviewerId: string): TaskWorkflow {
  if (![taskNumber, creatorId, executorId, reviewerId].every(Boolean)) throw new Error('任务编号与三方真实身份不可为空');
  return { taskNumber, creatorId, executorId, reviewerId, status: 'active', result: null, resultLink: null,
    creatorRecordDone: false, notify: [], appliedKeys: [] };
}

export function transitionTask(current: TaskWorkflow, command: TaskCommand): TaskWorkflow {
  if (!command.key) throw new Error('缺少幂等请求编号');
  if (current.appliedKeys.includes(command.key)) return current;
  if (current.status === 'sync-paused') throw new Error('跨端口冲突已暂停同步，需要两个人确认');
  if (current.status === 'approved') throw new Error('任务已审核通过，不能重复更改');
  const next: TaskWorkflow = { ...current, notify: [], appliedKeys: [...current.appliedKeys, command.key] };
  if (command.type === 'conflict') {
    next.status = 'sync-paused';
    next.notify = [...new Set([current.creatorId, current.executorId, current.reviewerId])];
    return next;
  }
  if (command.type === 'submit') {
    if (command.actorId !== current.executorId) throw new Error('只有负责人可以提交');
    if (!['active', 'awaiting-result', 'returned'].includes(current.status)) throw new Error('当前状态不可提交');
    const result: string = command.result?.trim() ?? '';
    if (!result && !command.resultLink?.trim()) { next.status = 'awaiting-result'; return next; }
    next.status = 'submitted';
    next.result = result || null;
    next.resultLink = command.resultLink?.trim() || null;
    next.notify = [current.reviewerId];
    return next;
  }
  if (command.actorId !== current.reviewerId) throw new Error('只有指定审核人可以审核或退回');
  if (current.status !== 'submitted') throw new Error('只有已提交的任务可以审核');
  if (command.type === 'return') {
    next.status = 'returned';
    next.notify = [current.executorId];
    return next;
  }
  next.status = 'approved';
  next.creatorRecordDone = true;
  next.notify = [...new Set([current.creatorId, current.executorId])];
  return next;
}
