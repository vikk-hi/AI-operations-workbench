import { showConfirm } from '@lark-apaas/client-toolkit';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { CategoryResponse, CoreOverviewResponse, DataSourcesResponse, ProductSourceResponse, TargetProgressResponse, TasksDashboardResponse, TimelineResponse } from '@shared/api.interface';
import { createWorkbenchWriter } from './workbench-write.mjs';

declare global {
  interface Window {
    __hmConfirm: (message: string) => Promise<boolean>;
    __hmWrite: (moduleName: 'tasks' | 'timeline', method: 'POST' | 'PATCH' | 'DELETE', recordId?: string, body?: Record<string, unknown> | null) => Promise<unknown>;
  }
}

const isLocalPreview = ['127.0.0.1', 'localhost'].includes(window.location.hostname);
const localAuthBase = `${window.location.protocol}//${window.location.hostname}:3001`;

async function loadLocalFeishuIdentity() {
  if (!isLocalPreview) return;
  try {
    const response = await fetch(`${localAuthBase}/auth/status`, { credentials: 'include' });
    const detail = await response.json();
    window.dispatchEvent(new CustomEvent('hm-auth-ready', { detail }));
  } catch (error) {
    logger.error('本地飞书身份服务不可用', error);
    window.dispatchEvent(new CustomEvent('hm-auth-error'));
  }
}

async function loadWorkbench() {
  try {
    const requestWorkbench = async (name: string) => {
      if (!isLocalPreview) return axiosForBackend({ url: `/api/workbench/${name}`, method: 'GET' });
      const response = await fetch(`${localAuthBase}/api/workbench/${name}`, { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(`Local workbench module failed: ${name}`);
      return { data };
    };
    const [overview, tasks, sources, categories, products, targets, timeline] = await Promise.all([
      requestWorkbench('overview'), requestWorkbench('tasks'), requestWorkbench('sources'), requestWorkbench('categories'),
      requestWorkbench('products'), requestWorkbench('targets'), requestWorkbench('timeline'),
    ]);
    window.dispatchEvent(new CustomEvent('hm-live-ready', { detail: {
      overview: overview.data as CoreOverviewResponse,
      tasks: tasks.data as TasksDashboardResponse,
      sources: sources.data as DataSourcesResponse,
      categories: categories.data as CategoryResponse,
      products: products.data as ProductSourceResponse,
      targets: targets.data as TargetProgressResponse,
      timeline: timeline.data as TimelineResponse,
    } }));
  } catch (error) {
    logger.error('工作台真实数据加载失败', error);
    window.dispatchEvent(new CustomEvent('hm-live-error'));
  }
}

window.__hmConfirm = showConfirm;
window.__hmWrite = createWorkbenchWriter({ baseUrl: localAuthBase, refresh: loadWorkbench });

const runtime = document.createElement('script');
runtime.src = new URL('./v9-runtime.js', import.meta.url).href;
runtime.onload = () => {
  void loadLocalFeishuIdentity();
  void loadWorkbench();
};
runtime.onerror = () => {
  const main = document.querySelector('#main');
  if (main) main.textContent = '工作台资源加载失败，请刷新后重试。';
};
document.body.appendChild(runtime);
