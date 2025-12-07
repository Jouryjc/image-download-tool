/**
 * WebSocket服务处理器
 * 处理实时下载进度更新
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger.js';
import { WebSocketEvent } from '../types/index.js';

/**
 * 设置Socket.IO处理器
 */
export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // 监听客户端事件
    socket.on('join-room', (roomId: string) => {
      socket.join(roomId);
      logger.info(`Client ${socket.id} joined room: ${roomId}`);
    });
    
    socket.on('leave-room', (roomId: string) => {
      socket.leave(roomId);
      logger.info(`Client ${socket.id} left room: ${roomId}`);
    });
    
    // 监听断开连接
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
    
    // 错误处理
    socket.on('error', (error: Error) => {
      logger.error(`Socket error for client ${socket.id}:`, error);
    });
  });
  
  // 定期广播系统状态
  setInterval(() => {
    io.emit('system:status', {
      timestamp: new Date().toISOString(),
      activeConnections: io.engine.clientsCount,
      uptime: process.uptime()
    });
  }, 30000); // 每30秒广播一次
}

/**
 * 向特定房间广播下载进度
 */
export function broadcastDownloadProgress(io: SocketIOServer, event: WebSocketEvent) {
  const roomId = `download:${event.data.taskId}`;
  io.to(roomId).emit(event.type, event);
  
  // 同时广播到全局
  io.emit(event.type, event);
}

/**
 * 向特定房间广播下载完成
 */
export function broadcastDownloadComplete(io: SocketIOServer, event: WebSocketEvent) {
  const roomId = `download:${event.data.taskId}`;
  io.to(roomId).emit(event.type, event);
  
  // 同时广播到全局
  io.emit(event.type, event);
}

/**
 * 向特定房间广播下载错误
 */
export function broadcastDownloadError(io: SocketIOServer, event: WebSocketEvent) {
  const roomId = `download:${event.data.taskId}`;
  io.to(roomId).emit(event.type, event);
  
  // 同时广播到全局
  io.emit(event.type, event);
}