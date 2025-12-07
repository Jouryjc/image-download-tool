/**
 * WebSocket提供者组件
 * 处理实时下载进度更新
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebSocketEvent } from '../types';
import { useStore } from '../store';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
});

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { updateDownloadTask, addToHistory } = useStore();
  
  useEffect(() => {
    // 创建WebSocket连接
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      transports: ['websocket'],
    });
    
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });
    
    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });
    
    // 监听下载进度事件
    newSocket.on('download:progress', (event: DownloadProgressEvent) => {
      const { taskId, progress, speed, remainingTime, downloadedBytes, totalBytes } = event.data;
      
      updateDownloadTask(taskId, {
        progress,
        speed,
        downloadedBytes,
        totalBytes,
        status: 'downloading',
        updatedAt: new Date(),
      });
    });
    
    // 监听下载完成事件
    newSocket.on('download:complete', (event: DownloadCompleteEvent) => {
      const { taskId, filePath, checksum } = event.data;
      
      updateDownloadTask(taskId, {
        status: 'completed',
        progress: 100,
        checksum,
        updatedAt: new Date(),
      });
      
      // 添加到历史记录
      // 这里需要从store中获取完整的任务信息
      // 暂时创建简化版本
      const historyItem = {
        id: `hist-${Date.now()}`,
        taskId,
        imageName: 'unknown',
        tag: 'latest',
        source: 'unknown',
        fileSize: 0,
        downloadTime: 0,
        completedAt: new Date(),
        checksum,
        filePath,
      };
      
      addToHistory(historyItem);
    });
    
    // 监听下载错误事件
    newSocket.on('download:error', (event: DownloadErrorEvent) => {
      const { taskId, error } = event.data;
      
      updateDownloadTask(taskId, {
        status: 'error',
        error,
        updatedAt: new Date(),
      });
    });
    
    setSocket(newSocket);
    
    // 清理函数
    return () => {
      newSocket.close();
    };
  }, [updateDownloadTask, addToHistory]);
  
  return (
    <WebSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

// 事件类型定义
interface DownloadProgressEvent {
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

interface DownloadCompleteEvent {
  type: 'download:complete';
  data: {
    taskId: string;
    filePath: string;
    checksum: string;
  };
}

interface DownloadErrorEvent {
  type: 'download:error';
  data: {
    taskId: string;
    error: string;
  };
}