/**
 * API服务模块
 * 封装所有后端API调用
 */

import { ImageInfo, SearchResponse, DownloadTask, DownloadHistory, ImageSource, ApiResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * API请求封装
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
}

/**
 * 镜像搜索API
 */
export const imageApi = {
  /**
   * 搜索镜像
   */
  searchImages: (query: string, options?: {
    source?: string;
    architecture?: string;
    tag?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const params = new URLSearchParams();
    params.append('query', query);
    
    if (options?.source) params.append('source', options.source);
    if (options?.architecture) params.append('architecture', options.architecture);
    if (options?.tag) params.append('tag', options.tag);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
    
    return request<SearchResponse>(`/images/search?${params}`);
  },

  /**
   * 获取热门镜像
   */
  getPopularImages: (limit: number = 10) => {
    return request<{ code: number; data: { images: ImageInfo[]; total: number } }>(
      `/images/popular?limit=${limit}`
    );
  },

  /**
   * 获取镜像详情
   */
  getImageDetails: (name: string, tag?: string, source?: string) => {
    const params = new URLSearchParams();
    if (tag) params.append('tag', tag);
    if (source) params.append('source', source);
    
    return request<{ code: number; data: ImageInfo }>(`/images/${name}?${params}`);
  },

  /**
   * 获取镜像大小
   */
  getImageSize: (name: string, source: string = 'dockerhub', tag: string = 'latest') => {
    const params = new URLSearchParams();
    params.append('name', name);
    params.append('source', source);
    params.append('tag', tag);
    return request<{ sizeBytes: number; size: string }>(`/images/size?${params}`);
  },
};

/**
 * 下载任务API
 */
export const downloadApi = {
  /**
   * 创建下载任务
   */
  createDownloadTask: (task: Omit<DownloadTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    return request<{ code: number; data: DownloadTask }>('/downloads', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  /**
   * 获取下载任务列表
   */
  getDownloadTasks: () => {
    return request<{ code: number; data: DownloadTask[] }>('/downloads');
  },

  /**
   * 获取下载任务详情
   */
  getDownloadTask: (taskId: string) => {
    return request<{ code: number; data: DownloadTask }>(`/downloads/${taskId}`);
  },

  /**
   * 暂停下载任务
   */
  pauseDownloadTask: (taskId: string) => {
    return request<{ code: number; data: DownloadTask }>(`/downloads/${taskId}/pause`, {
      method: 'POST',
    });
  },

  /**
   * 恢复下载任务
   */
  resumeDownloadTask: (taskId: string) => {
    return request<{ code: number; data: DownloadTask }>(`/downloads/${taskId}/resume`, {
      method: 'POST',
    });
  },

  /**
   * 取消下载任务
   */
  cancelDownloadTask: (taskId: string) => {
    return request<{ code: number; data: DownloadTask }>(`/downloads/${taskId}/cancel`, {
      method: 'POST',
    });
  },

  /**
   * 删除下载任务
   */
  deleteDownloadTask: (taskId: string) => {
    return request<{ code: number; message: string }>(`/downloads/${taskId}`, {
      method: 'DELETE',
    });
  },
};

/**
 * 下载历史API
 */
export const historyApi = {
  /**
   * 获取下载历史
   */
  getDownloadHistory: (options?: {
    startDate?: string;
    endDate?: string;
    imageName?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const params = new URLSearchParams();
    
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.imageName) params.append('imageName', options.imageName);
    if (options?.status) params.append('status', options.status);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
    
    return request<{ code: number; data: { history: DownloadHistory[]; total: number } }>(
      `/history?${params}`
    );
  },

  /**
   * 删除历史记录
   */
  deleteHistoryItem: (historyId: string) => {
    return request<{ code: number; message: string }>(`/history/${historyId}`, {
      method: 'DELETE',
    });
  },

  /**
   * 重新下载
   */
  redownload: (historyId: string) => {
    return request<{ code: number; data: DownloadTask }>(`/history/${historyId}/redownload`, {
      method: 'POST',
    });
  },
};

/**
 * 配置API
 */
export const configApi = {
  /**
   * 获取镜像源配置
   */
  getImageSources: () => {
    return request<{ code: number; data: ImageSource[] }>('/config/sources');
  },

  /**
   * 添加镜像源
   */
  addImageSource: (source: Omit<ImageSource, 'id'>) => {
    return request<{ code: number; data: ImageSource }>('/config/sources', {
      method: 'POST',
      body: JSON.stringify(source),
    });
  },

  /**
   * 更新镜像源
   */
  updateImageSource: (sourceId: string, source: Partial<ImageSource>) => {
    return request<{ code: number; data: ImageSource }>(`/config/sources/${sourceId}`, {
      method: 'PUT',
      body: JSON.stringify(source),
    });
  },

  /**
   * 删除镜像源
   */
  deleteImageSource: (sourceId: string) => {
    return request<{ code: number; message: string }>(`/config/sources/${sourceId}`, {
      method: 'DELETE',
    });
  },

  /**
   * 获取系统设置
   */
  getSettings: () => {
    return request<{ code: number; data: any }>('/config/settings');
  },

  /**
   * 更新系统设置
   */
  updateSettings: (settings: any) => {
    return request<{ code: number; data: any }>('/config/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },
};
