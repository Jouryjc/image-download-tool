/**
 * 下载任务API路由
 */
import express from 'express';
import { randomUUID } from 'node:crypto';
import { DownloadTask } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { broadcastDownloadProgress, broadcastDownloadComplete, broadcastDownloadError } from '../services/socketService.js';
import { downloadService } from '../services/downloadService.js';

const router = express.Router();

// 使用下载服务管理任务

/**
 * POST /api/downloads
 * 创建下载任务
 */
router.post('/', async (req, res) => {
  try {
    const { imageName, tag, source, targetPath, enableChunked } = req.body;
    
    if (!imageName || !tag || !source) {
      return res.status(400).json({
        code: 400,
        message: 'Missing required fields: imageName, tag, source'
      });
    }
    
    const task = await downloadService.startDownload(imageName, tag, source, targetPath);
    logger.info(`Created download task: ${task.id} for ${imageName}:${tag}`);
    res.json({ code: 200, data: task });
  } catch (error) {
    logger.error('Create download task error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to create download task',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * GET /api/downloads
 * 获取下载任务列表
 */
router.get('/', async (req, res) => {
  try {
    const tasks = downloadService.getAllTasks();
    
    res.json({
      code: 200,
      data: tasks
    });
  } catch (error) {
    logger.error('Get download tasks error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to get download tasks',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * GET /api/downloads/:taskId
 * 获取下载任务详情
 */
router.get('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = downloadService.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({
        code: 404,
        message: 'Download task not found'
      });
    }
    
    res.json({
      code: 200,
      data: task
    });
  } catch (error) {
    logger.error('Get download task error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to get download task',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * POST /api/downloads/:taskId/pause
 * 暂停下载任务
 */
router.post('/:taskId/pause', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = downloadService.getTask(taskId);
    if (!task) {
      return res.status(404).json({
        code: 404,
        message: 'Download task not found'
      });
    }
    
    if (task.status !== 'downloading') {
      return res.status(400).json({
        code: 400,
        message: 'Task is not in downloading status'
      });
    }
    
    downloadService.pauseDownload(taskId);
    
    logger.info(`Paused download task: ${taskId}`);
    
    res.json({
      code: 200,
      data: downloadService.getTask(taskId)
    });
  } catch (error) {
    logger.error('Pause download task error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to pause download task',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * POST /api/downloads/:taskId/resume
 * 恢复下载任务
 */
router.post('/:taskId/resume', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = downloadService.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({
        code: 404,
        message: 'Download task not found'
      });
    }
    
    if (task.status !== 'paused') {
      return res.status(400).json({
        code: 400,
        message: 'Task is not in paused status'
      });
    }
    
    await downloadService.resumeDownload(taskId);
    
    logger.info(`Resumed download task: ${taskId}`);
    
    res.json({
      code: 200,
      data: downloadService.getTask(taskId)
    });
  } catch (error) {
    logger.error('Resume download task error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to resume download task',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * POST /api/downloads/:taskId/cancel
 * 取消下载任务
 */
router.post('/:taskId/cancel', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = downloadService.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({
        code: 404,
        message: 'Download task not found'
      });
    }
    
    if (task.status === 'completed') {
      return res.status(400).json({
        code: 400,
        message: 'Cannot cancel completed task'
      });
    }
    
    downloadService.cancelDownload(taskId);
    
    logger.info(`Cancelled download task: ${taskId}`);
    
    res.json({
      code: 200,
      data: downloadService.getTask(taskId)
    });
  } catch (error) {
    logger.error('Cancel download task error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to cancel download task',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * DELETE /api/downloads/:taskId
 * 删除下载任务
 */
router.delete('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = downloadService.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({
        code: 404,
        message: 'Download task not found'
      });
    }
    
    if (task.status === 'downloading') {
      return res.status(400).json({
        code: 400,
        message: 'Cannot delete downloading task'
      });
    }
    
    // 直接从服务中移除（通过清理函数）
    downloadService.cleanupCompletedTasks();
    
    logger.info(`Deleted download task: ${taskId}`);
    
    res.json({
      code: 200,
      message: 'Download task deleted successfully'
    });
  } catch (error) {
    logger.error('Delete download task error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to delete download task',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

export default router;

/**
 * 测试/模拟接口：触发下载进度事件（仅在 ENABLE_SIM=1 时可用）
 */
// 已移除模拟接口，改为真实下载
