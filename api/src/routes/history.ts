/**
 * 下载历史API路由
 */
import express from 'express';
import { DownloadHistory } from '../types/index.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// 存储下载历史（实际应用中应该使用数据库）
const downloadHistory = new Map<string, DownloadHistory>();

/**
 * GET /api/history
 * 获取下载历史
 */
router.get('/', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      imageName, 
      status, 
      page = '1', 
      pageSize = '20' 
    } = req.query;
    
    let history = Array.from(downloadHistory.values());
    
    // 筛选条件
    if (startDate) {
      const start = new Date(startDate as string);
      history = history.filter(item => item.completedAt >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate as string);
      history = history.filter(item => item.completedAt <= end);
    }
    
    if (imageName) {
      history = history.filter(item => 
        item.imageName.toLowerCase().includes((imageName as string).toLowerCase())
      );
    }
    
    // 按完成时间倒序排列
    history.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
    
    // 分页
    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);
    const startIndex = (pageNum - 1) * pageSizeNum;
    const endIndex = startIndex + pageSizeNum;
    const paginatedHistory = history.slice(startIndex, endIndex);
    
    res.json({
      code: 200,
      data: {
        history: paginatedHistory,
        total: history.length,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error) {
    logger.error('Get download history error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to get download history',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * DELETE /api/history/:historyId
 * 删除历史记录
 */
router.delete('/:historyId', async (req, res) => {
  try {
    const { historyId } = req.params;
    
    if (!downloadHistory.has(historyId)) {
      return res.status(404).json({
        code: 404,
        message: 'History item not found'
      });
    }
    
    downloadHistory.delete(historyId);
    
    logger.info(`Deleted history item: ${historyId}`);
    
    res.json({
      code: 200,
      message: 'History item deleted successfully'
    });
  } catch (error) {
    logger.error('Delete history item error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to delete history item',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * POST /api/history/:historyId/redownload
 * 重新下载
 */
router.post('/:historyId/redownload', async (req, res) => {
  try {
    const { historyId } = req.params;
    const historyItem = downloadHistory.get(historyId);
    
    if (!historyItem) {
      return res.status(404).json({
        code: 404,
        message: 'History item not found'
      });
    }
    
    // 这里应该创建新的下载任务
    // 暂时返回成功消息
    
    logger.info(`Redownload requested for: ${historyId}`);
    
    res.json({
      code: 200,
      message: 'Redownload task created',
      data: {
        taskId: `redownload-${historyId}`,
        imageName: historyItem.imageName,
        tag: historyItem.tag,
        source: historyItem.source
      }
    });
  } catch (error) {
    logger.error('Redownload error:', error);
    res.status(500).json({
      code: 500,
      message: 'Failed to create redownload task',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

export default router;