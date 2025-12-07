/**
 * 容器镜像下载器后端API主入口文件
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

import imageRoutes from './routes/images.js';
import downloadRoutes from './routes/downloads.js';
import historyRoutes from './routes/history.js';
import configRoutes from './routes/config.js';
import { setupSocketHandlers } from './services/socketService.js';
import { logger } from './utils/logger.js';
import { downloadService } from './services/downloadService.js';
import { broadcastDownloadProgress, broadcastDownloadComplete, broadcastDownloadError } from './services/socketService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// 确保必要的目录存在
const downloadsDir = join(__dirname, '../downloads');
const subDirs = ['config', 'tasks', 'history'];

subDirs.forEach(dir => {
  const fullPath = join(downloadsDir, dir);
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
  }
});

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API路由
app.use('/api/images', imageRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/config', configRoutes);

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    code: 500,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    code: 404,
    message: 'API endpoint not found'
  });
});

// 设置Socket.IO处理器
setupSocketHandlers(io);

// 将 io 挂载到 app，便于路由访问
app.set('io', io);

// 订阅下载服务事件并广播到 WebSocket
downloadService.on('downloadProgress', (task) => {
  broadcastDownloadProgress(io, {
    type: 'download:progress',
    data: {
      taskId: task.id,
      progress: task.progress,
      speed: task.speed,
      remainingTime: Math.max(0, Math.floor(((task.totalBytes || 0) - (task.downloadedBytes || 0)) / ((task.speed || 1)))) ,
      downloadedBytes: task.downloadedBytes || 0,
      totalBytes: task.totalBytes || 0,
    }
  });
});

downloadService.on('downloadComplete', (task) => {
  broadcastDownloadComplete(io, {
    type: 'download:complete',
    data: {
      taskId: task.id,
      filePath: task.targetPath,
      checksum: task.checksum || '',
    }
  });
});

downloadService.on('downloadError', (task) => {
  broadcastDownloadError(io, {
    type: 'download:error',
    data: {
      taskId: task.id,
      error: task.error || 'unknown'
    }
  });
});

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { io, app, server };
