import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { CoreDashboardResponse, DashboardRange, DataSourcesResponse, TasksDashboardResponse } from '@shared/api.interface';


// Add more API functions here, use axios instance (`axiosForBackend`) to make requests.
// 
// 使用示例：
// export async function getUserData(userId: string) {
//   try {
//     const response = await axiosForBackend({
//       url: `/api/users/${userId}`,
//       method: 'GET'
//     });
//     return response.data;
//   } catch (error) {
//     logger.error('获取用户数据失败', error);
//     throw error;
//   }
// }

async function request<T>(url: string): Promise<T> {
  try {
    const response = await axiosForBackend({ url, method: 'GET' });
    return response.data as T;
  } catch (error) {
    logger.error(`请求失败: ${url}`, error);
    throw error;
  }
}

export const getCoreDashboard = (range: DashboardRange) => request<CoreDashboardResponse>(`/api/workbench/core?range=${range}`);
export const getTasksDashboard = () => request<TasksDashboardResponse>('/api/workbench/tasks');
export const getDataSources = () => request<DataSourcesResponse>('/api/workbench/sources');
