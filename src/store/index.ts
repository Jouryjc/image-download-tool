/**
 * 全局状态管理
 * 使用Zustand管理应用状态
 */

import { create } from 'zustand';
import { DownloadTask, DownloadHistory, ImageSource, ImageInfo } from '../types';

interface AppState {
  // 下载任务状态
  downloadTasks: DownloadTask[];
  activeDownloads: number;
  
  // 搜索状态
  searchResults: ImageInfo[];
  searchLoading: boolean;
  searchQuery: string;
  
  // 历史记录状态
  downloadHistory: DownloadHistory[];
  historyLoading: boolean;
  
  // 配置状态
  imageSources: ImageSource[];
  settings: {
    maxConcurrentDownloads: number;
    defaultDownloadPath: string;
    autoRetry: boolean;
    maxRetries: number;
  };
  
  // 操作函数
  setDownloadTasks: (tasks: DownloadTask[]) => void;
  addDownloadTask: (task: DownloadTask) => void;
  updateDownloadTask: (taskId: string, updates: Partial<DownloadTask>) => void;
  removeDownloadTask: (taskId: string) => void;
  
  setSearchResults: (results: ImageInfo[]) => void;
  setSearchLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  
  setDownloadHistory: (history: DownloadHistory[]) => void;
  setHistoryLoading: (loading: boolean) => void;
  addToHistory: (item: DownloadHistory) => void;
  
  setImageSources: (sources: ImageSource[]) => void;
  addImageSource: (source: ImageSource) => void;
  updateImageSource: (sourceId: string, updates: Partial<ImageSource>) => void;
  removeImageSource: (sourceId: string) => void;
  
  updateSettings: (settings: Partial<AppState['settings']>) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // 初始状态
  downloadTasks: [],
  activeDownloads: 0,
  searchResults: [],
  searchLoading: false,
  searchQuery: '',
  downloadHistory: [],
  historyLoading: false,
  imageSources: [],
  settings: {
    maxConcurrentDownloads: 3,
    defaultDownloadPath: '/downloads',
    autoRetry: true,
    maxRetries: 3,
  },
  
  // 下载任务操作
  setDownloadTasks: (tasks) => set({ downloadTasks: tasks }),
  
  addDownloadTask: (task) => set((state) => ({
    downloadTasks: [...state.downloadTasks, task],
    activeDownloads: state.activeDownloads + (task.status === 'downloading' ? 1 : 0),
  })),
  
  updateDownloadTask: (taskId, updates) => set((state) => {
    const tasks = state.downloadTasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    );
    
    const activeDownloads = tasks.filter(task => task.status === 'downloading').length;
    
    return { 
      downloadTasks: tasks,
      activeDownloads,
    };
  }),
  
  removeDownloadTask: (taskId) => set((state) => {
    const tasks = state.downloadTasks.filter(task => task.id !== taskId);
    const activeDownloads = tasks.filter(task => task.status === 'downloading').length;
    
    return { 
      downloadTasks: tasks,
      activeDownloads,
    };
  }),
  
  // 搜索操作
  setSearchResults: (results) => set({ searchResults: results }),
  setSearchLoading: (loading) => set({ searchLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  // 历史记录操作
  setDownloadHistory: (history) => set({ downloadHistory: history }),
  setHistoryLoading: (loading) => set({ historyLoading: loading }),
  addToHistory: (item) => set((state) => ({
    downloadHistory: [item, ...state.downloadHistory],
  })),
  
  // 镜像源操作
  setImageSources: (sources) => set({ imageSources: sources }),
  
  addImageSource: (source) => set((state) => ({
    imageSources: [...state.imageSources, source],
  })),
  
  updateImageSource: (sourceId, updates) => set((state) => ({
    imageSources: state.imageSources.map(source => 
      source.id === sourceId ? { ...source, ...updates } : source
    ),
  })),
  
  removeImageSource: (sourceId) => set((state) => ({
    imageSources: state.imageSources.filter(source => source.id !== sourceId),
  })),
  
  // 设置操作
  updateSettings: (settings) => set((state) => ({
    settings: { ...state.settings, ...settings },
  })),
}));

/**
 * 选择器函数
 */
export const useDownloadTasks = () => useStore((state) => state.downloadTasks);
export const useActiveDownloads = () => useStore((state) => state.activeDownloads);
export const useSearchResults = () => useStore((state) => state.searchResults);
export const useSearchLoading = () => useStore((state) => state.searchLoading);
export const useSearchQuery = () => useStore((state) => state.searchQuery);
export const useDownloadHistory = () => useStore((state) => state.downloadHistory);
export const useHistoryLoading = () => useStore((state) => state.historyLoading);
export const useImageSources = () => useStore((state) => state.imageSources);
export const useSettings = () => useStore((state) => state.settings);