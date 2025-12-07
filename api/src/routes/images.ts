/**
 * 镜像搜索API路由
 */
import express from 'express';
import { ImageService } from '../services/imageService.js';
import { logger } from '../utils/logger.js';
import { } from '../types/index.js';
import { } from '../services/imageService.js';

const router = express.Router();
const imageService = new ImageService();

/**
 * GET /api/images/search
 * 搜索镜像
 */
router.get('/search', async (req, res) => {
  try {
    const { 
      query, 
      source, 
      architecture, 
      tag, 
      page = '1', 
      pageSize = '20' 
    } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        code: 400,
        message: 'Query parameter is required'
      });
    }

    const result = await imageService.searchImages(query, {
      source: source as string,
      architecture: architecture as string,
      tag: tag as string,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string)
    });

    res.json(result);
  } catch (error) {
    logger.error('Search API error:', error);
    res.status(500).json({
      code: 500,
      message: 'Search failed',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * GET /api/images/popular
 * 获取热门镜像
 */
router.get('/popular', async (req, res) => {
  try {
    const { limit = '10' } = req.query;
    
    const images = await imageService.getPopularImages(parseInt(limit as string));
    
    res.json({
      code: 200,
      data: {
        images,
        total: images.length
      }
    });
  } catch (error) {
    logger.error('Popular images API error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to get popular images',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * GET /api/images/:name
 * 获取镜像详情
 */
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { tag = 'latest', source = 'dockerhub' } = req.query;

    const image = await imageService.getImageDetails(
      name,
      tag as string,
      source as string
    );

    if (!image) {
      return res.status(404).json({
        code: 404,
        message: 'Image not found'
      });
    }

    res.json({
      code: 200,
      data: image
    });
  } catch (error) {
    logger.error('Image details API error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to get image details',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

export default router;

/**
 * GET /api/images/size
 * 获取镜像大小（目前支持 dockerhub）
 */
router.get('/size', async (req, res) => {
  try {
    const { name, source = 'dockerhub', tag = 'latest' } = req.query as any;
    if (!name) {
      return res.status(400).json({ code: 400, message: 'Missing param: name' });
    }
    let sizeBytes = 0;
    if (source === 'dockerhub') {
      // 动态导入以避免循环引用
      const mod = await import('../services/imageService.js');
      sizeBytes = await mod.getDockerHubImageSize(name as string, tag as string);
    }
    res.json({ code: 200, data: { sizeBytes, size: sizeBytes ? modFormatBytes(sizeBytes) : 'Unknown' } });
  } catch (error) {
    logger.error('Get image size error:', error);
    res.status(500).json({ code: 500, message: 'Failed to get image size' });
  }
});

function modFormatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
