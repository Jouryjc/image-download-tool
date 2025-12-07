/**
 * 前端类型定义文件
 */

/**
 * 镜像信息接口
 */
export interface ImageInfo {
  name: string;
  tag: string;
  size: string;
  sizeBytes: number;
  source: string;
  updatedAt: string;
  description: string;
  architecture?: string;
  digest?: string;
}

/**
 * 搜索响应接口
 */
export interface SearchResponse {
  code: number;
  data: {
    images: ImageInfo[];
    total: number;
    page: number;
    pageSize: number;
  };
}

/**
 * 下载任务接口
 */
export interface DownloadTask {
  id: string;
  imageName: string;
  tag: string;
  source: string;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'error';
  progress: number;
  speed: number;
  totalBytes: number;
  downloadedBytes: number;
  targetPath: string;
  createdAt: Date;
  updatedAt: Date;
  checksum?: string;
  error?: string;
  chunks?: DownloadChunk[];
}

/**
 * 下载分块接口
 */
export interface DownloadChunk {
  start: number;
  end: number;
  downloaded: boolean;
  retryCount: number;
}

/**
 * 下载历史接口
 */
export interface DownloadHistory {
  id: string;
  taskId: string;
  imageName: string;
  tag: string;
  source: string;
  fileSize: number;
  downloadTime: number;
  completedAt: Date;
  checksum: string;
  filePath: string;
}

/**
 * 镜像源配置接口
 */
export interface ImageSource {
  id: string;
  name: string;
  url: string;
  priority: number;
  isActive: boolean;
  auth?: {
    username: string;
    password: string;
  };
}

/**
 * WebSocket事件类型
 */
export interface DownloadProgressEvent {
  type: 'download:progress';
  data: {
    taskId: string;
    progress: number;
    speed: number;
    remainingTime: number;
    downloadedBytes: number;
    totalBytes: number;
  };
}

export interface DownloadCompleteEvent {
  type: 'download:complete';
  data: {
    taskId: string;
    filePath: string;
    checksum: string;
  };
}

export interface DownloadErrorEvent {
  type: 'download:error';
  data: {
    taskId: string;
    error: string;
  };
}

export type WebSocketEvent = 
  | DownloadProgressEvent 
  | DownloadCompleteEvent 
  | DownloadErrorEvent;

/**
 * API响应接口
 */
export interface ApiResponse<T = any> {
  code: number;
  message?: string;
  data?: T;
  error?: string;
}