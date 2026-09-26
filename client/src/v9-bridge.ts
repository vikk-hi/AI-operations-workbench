import { showConfirm } from '@lark-apaas/client-toolkit';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { CategoryResponse, CoreOverviewResponse, DataSourcesResponse, ProductSourceResponse, TargetProgressResponse, TasksDashboardResponse, TimelineResponse } from '@shared/api.interface';

declare global {
  interface Window {
    __hmConfirm: (message: string) => Promise<boolean>;
  }
}

async function loadWorkbench() {
  try {
    const [overview, tasks, sources, categories, products, targets, timeline] = await Promise.all([
      axiosForBackend({ url: '/api/workbench/overview', method: 'GET' }),
      axiosForBackend({ url: '/api/workbench/tasks', method: 'GET' }),
      axiosForBackend({ url: '/api/workbench/sources', method: 'GET' }),
      axiosForBackend({ url: '/api/workbench/categories', method: 'GET' }),
      axiosForBackend({ url: '/api/workbench/products', method: 'GET' }),
      axiosForBackend({ url: '/api/workbench/targets', method: 'GET' }),
      axiosForBackend({ url: '/api/workbench/timeline', method: 'GET' }),
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

const runtime = document.createElement('script');
runtime.src = new URL('./v9-runtime.js', import.meta.url).href;
runtime.onload = () => { void loadWorkbench(); };
runtime.onerror = () => {
  const main = document.querySelector('#main');
  if (main) main.textContent = '工作台资源加载失败，请刷新后重试。';
};
document.body.appendChild(runtime);
