import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Download, Pause, Play, Square, RefreshCw, FolderOpen, FileText } from 'lucide-react';
import { useWebSocket } from '../providers/WebSocketProvider';
import { DownloadTask } from '../types';
import { downloadApi } from '../services/api';

const DownloadPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { socket } = useWebSocket();
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const location = useLocation();

  // 获取URL参数中的镜像信息
  const imageName = searchParams.get('image');
  const imageTag = searchParams.get('tag') || 'latest';
  const imageSource = searchParams.get('source') || 'dockerhub';

  useEffect(() => {
    const handleProgress = (event: any) => {
      const { taskId, progress, speed, downloadedBytes, totalBytes } = event.data || {};
      setTasks(prev => prev.map(t => t.id === taskId ? {
        ...t,
        progress,
        speed,
        downloadedBytes,
        totalBytes,
        status: 'downloading',
        updatedAt: new Date(),
      } : t));
    };

    const handleComplete = (event: any) => {
      const { taskId, checksum } = event.data || {};
      setTasks(prev => prev.map(t => t.id === taskId ? {
        ...t,
        status: 'completed',
        progress: 100,
        checksum,
        updatedAt: new Date(),
      } : t));
    };

    const handleError = (event: any) => {
      const { taskId, error } = event.data || {};
      setTasks(prev => prev.map(t => t.id === taskId ? {
        ...t,
        status: 'error',
        error,
        updatedAt: new Date(),
      } : t));
    };

    // 初始化任务列表
    (async () => {
      try {
        const res = await downloadApi.getDownloadTasks();
        setTasks(res.data);
      } catch (e) {
        console.error('加载下载任务失败', e);
      }
    })();

    if (socket) {
      socket.on('download:progress', handleProgress);
      socket.on('download:complete', handleComplete);
      socket.on('download:error', handleError);
    }

    return () => {
      if (socket) {
        socket.off('download:progress', handleProgress);
        socket.off('download:complete', handleComplete);
        socket.off('download:error', handleError);
      }
    };
  }, [socket]);

  // 开始下载
  /**
   * 创建下载任务
   */
  const startDownload = async (name?: string, tag?: string, source?: string) => {
    const finalName = name || imageName;
    const finalTag = tag || imageTag;
    const finalSource = source || imageSource;
    if (!finalName) return;
    try {
      const res = await downloadApi.createDownloadTask({
        imageName: finalName,
        tag: finalTag,
        source: finalSource,
        targetPath: `/downloads/${finalName.replace(/[/:]/g, '_')}-${finalTag}.tar`,
      } as any);
      setTasks(prev => [...prev, res.data]);
    } catch (e) {
      console.error('创建下载任务失败', e);
    }
  };

  /**
   * 页面进入时自动创建任务（支持URL参数与路由state）
   */
  useEffect(() => {
    const state = (location.state || {}) as any;
    const single = state.imageName && state.tag && state.source;
    const batch = Array.isArray(state.batchImages) ? state.batchImages : null;
    const byQuery = imageName && imageTag && imageSource;
    if (single) {
      startDownload(state.imageName, state.tag, state.source);
    } else if (batch && batch.length > 0) {
      batch.forEach((img: any) => {
        startDownload(img.name, img.tag, img.source);
      });
    } else if (byQuery) {
      startDownload(imageName!, imageTag!, imageSource!);
    }
  }, []);

  // 控制下载任务
  const pauseTask = (taskId: string) => {
    if (socket) {
      socket.emit('pauseDownload', taskId);
    }
  };

  const resumeTask = (taskId: string) => {
    if (socket) {
      socket.emit('resumeDownload', taskId);
    }
  };

  const cancelTask = (taskId: string) => {
    if (socket) {
      socket.emit('cancelDownload', taskId);
    }
  };

  const retryTask = (taskId: string) => {
    if (socket) {
      socket.emit('retryDownload', taskId);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化速度
  const formatSpeed = (bytesPerSecond: number): string => {
    return formatFileSize(bytesPerSecond) + '/s';
  };

  // 获取状态颜色
  const getStatusColor = (status: DownloadTask['status']) => {
    switch (status) {
      case 'downloading':
        return 'text-blue-600 bg-blue-50';
      case 'paused':
        return 'text-yellow-600 bg-yellow-50';
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'pending':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // 获取状态文本
  const getStatusText = (status: DownloadTask['status']) => {
    switch (status) {
      case 'downloading':
        return '下载中';
      case 'paused':
        return '已暂停';
      case 'completed':
        return '已完成';
      case 'error':
        return '错误';
      case 'pending':
        return '等待中';
      default:
        return '未知';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">下载管理</h1>
          <p className="text-gray-600">管理和监控容器镜像下载任务</p>
        </div>

        {/* 快速下载区域 */}
        {imageName && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">快速下载</h2>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="text-sm text-gray-500">镜像</div>
                <div className="text-lg font-medium text-gray-900">
                  {imageName}:{imageTag}
                </div>
                <div className="text-sm text-gray-500">来源: {imageSource}</div>
              </div>
              <button
                onClick={() => startDownload()}
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>开始下载</span>
              </button>
            </div>
          </div>
        )}

        {/* 下载任务列表 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">下载任务</h2>
              <div className="text-sm text-gray-500">
                共 {tasks.length} 个任务
              </div>
            </div>
          </div>

          <div className="divide-y">
            {tasks.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无下载任务</h3>
                <p className="text-gray-500">从搜索页面选择镜像开始下载</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {task.imageName}:{task.imageTag}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusText(task.status)}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-500 mb-3">
                        来源: {task.source} | 架构: {task.architecture} | 系统: {task.os}
                      </div>

                      {/* 进度条 */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>{formatFileSize(task.downloadedBytes)} / {formatFileSize(task.totalBytes)}</span>
                          <span>{task.progress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-black h-2 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* 速度和时间信息 */}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>速度: {formatSpeed(task.speed)}</span>
                        {task.status === 'downloading' && (
                          <span>预计剩余: {typeof (task as any).remainingTime === 'number' ? `${(task as any).remainingTime}秒` : '计算中...'}</span>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-2">
                      {task.status === 'downloading' && (
                        <button
                          onClick={() => pauseTask(task.id)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="暂停"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      {task.status === 'paused' && (
                        <button
                          onClick={() => resumeTask(task.id)}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                          title="继续"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {(task.status === 'downloading' || task.status === 'paused') && (
                        <button
                          onClick={() => cancelTask(task.id)}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                          title="取消"
                        >
                          <Square className="w-4 h-4" />
                        </button>
                      )}
                      {task.status === 'error' && (
                        <button
                          onClick={() => retryTask(task.id)}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                          title="重试"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      {task.status === 'completed' && (
                        <button
                          onClick={() => window.electron?.openDownloadFolder(task.downloadPath)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="打开文件夹"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage;
