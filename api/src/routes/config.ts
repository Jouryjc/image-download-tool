/**
 * 配置管理API路由
 */
import express from 'express';
import { randomUUID } from 'node:crypto';
import { ImageSource } from '../types/index.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// 存储镜像源配置（实际应用中应该使用数据库）
const imageSources = new Map<string, ImageSource>([
  ['1', {
    id: '1',
    name: 'Docker Hub',
    url: 'https://hub.docker.com',
    priority: 1,
    isActive: true
  }],
  ['2', {
    id: '2',
    name: 'Quay.io',
    url: 'https://quay.io',
    priority: 2,
    isActive: true
  }]
  ,
  ['3', {
    id: '3',
    name: 'Aliyun Container Registry',
    url: 'https://registry.cn-hangzhou.aliyuncs.com',
    priority: 3,
    isActive: true
  }]
]);

// 系统设置
let systemSettings = {
  maxConcurrentDownloads: 3,
  defaultDownloadPath: '/downloads',
  autoRetry: true,
  maxRetries: 3,
  chunkSize: 50 * 1024 * 1024, // 50MB
  maxChunkConcurrency: 5
};

/**
 * GET /api/config/sources
 * 获取镜像源配置
 */
router.get('/sources', async (req, res) => {
  try {
    const sources = Array.from(imageSources.values()).sort((a, b) => a.priority - b.priority);
    
    res.json({
      code: 200,
      data: sources
    });
  } catch (error) {
    logger.error('Get image sources error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to get image sources',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * POST /api/config/sources
 * 添加镜像源
 */
router.post('/sources', async (req, res) => {
  try {
    const { name, url, priority, isActive, auth } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({
        code: 400,
        message: 'Missing required fields: name, url'
      });
    }
    
    const id = randomUUID();
    const source: ImageSource = {
      id,
      name,
      url,
      priority: priority || 999,
      isActive: isActive !== undefined ? isActive : true,
      auth
    };
    
    imageSources.set(id, source);
    
    logger.info(`Added image source: ${name} (${url})`);
    
    res.json({
      code: 200,
      data: source
    });
  } catch (error) {
    logger.error('Add image source error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to add image source',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * PUT /api/config/sources/:sourceId
 * 更新镜像源
 */
router.put('/sources/:sourceId', async (req, res) => {
  try {
    const { sourceId } = req.params;
    const updates = req.body;
    
    const source = imageSources.get(sourceId);
    if (!source) {
      return res.status(404).json({
        code: 404,
        message: 'Image source not found'
      });
    }
    
    const updatedSource = { ...source, ...updates };
    imageSources.set(sourceId, updatedSource);
    
    logger.info(`Updated image source: ${sourceId}`);
    
    res.json({
      code: 200,
      data: updatedSource
    });
  } catch (error) {
    logger.error('Update image source error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to update image source',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * DELETE /api/config/sources/:sourceId
 * 删除镜像源
 */
router.delete('/sources/:sourceId', async (req, res) => {
  try {
    const { sourceId } = req.params;
    
    const source = imageSources.get(sourceId);
    if (!source) {
      return res.status(404).json({
        code: 404,
        message: 'Image source not found'
      });
    }
    
    imageSources.delete(sourceId);
    
    logger.info(`Deleted image source: ${sourceId}`);
    
    res.json({
      code: 200,
      message: 'Image source deleted successfully'
    });
  } catch (error) {
    logger.error('Delete image source error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to delete image source',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * GET /api/config/settings
 * 获取系统设置
 */
router.get('/settings', async (req, res) => {
  try {
    res.json({
      code: 200,
      data: systemSettings
    });
  } catch (error) {
    logger.error('Get settings error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to get settings',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * PUT /api/config/settings
 * 更新系统设置
 */
router.put('/settings', async (req, res) => {
  try {
    const updates = req.body;
    
    systemSettings = { ...systemSettings, ...updates };
    
    logger.info('Updated system settings');
    
    res.json({
      code: 200,
      data: systemSettings
    });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to update settings',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

export default router;
