/**
 * 历史页面组件
 * 下载历史记录、筛选排序、重新下载
 */

import React, { useState, useEffect } from 'react';
import { Clock, Download, Trash2, RotateCcw, Filter, Calendar } from 'lucide-react';
import { historyApi } from '../services/api';
import { useStore } from '../store';
import { DownloadHistory } from '../types';

export const HistoryPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
    imageName: ''
  });
  
  const { downloadHistory, historyLoading, setDownloadHistory, setHistoryLoading } = useStore();
  
  // 获取下载历史
  useEffect(() => {
    fetchHistory();
  }, []);
  
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await historyApi.getDownloadHistory({
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        imageName: dateRange.imageName || undefined
      });
      
      setDownloadHistory(response.data.history);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };
  
  // 删除历史记录
  const handleDelete = async (historyId: string) => {
    if (!confirm('确定要删除这条历史记录吗？')) return;
    
    try {
      await historyApi.deleteHistoryItem(historyId);
      // 从store中删除
      setDownloadHistory(downloadHistory.filter(item => item.id !== historyId));
    } catch (error) {
      console.error('Failed to delete history item:', error);
    }
  };
  
  // 重新下载
  const handleRedownload = async (historyItem: DownloadHistory) => {
    try {
      const response = await historyApi.redownload(historyItem.id);
      // 这里应该跳转到下载页面或显示成功消息
      console.log('Redownload started:', response);
    } catch (error) {
      console.error('Failed to redownload:', error);
    }
  };
  
  // 格式化文件大小
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // 格式化下载时间
  const formatDownloadTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
    return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分钟`;
  };
  
  // 格式化日期
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString('zh-CN');
  };
  
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-black flex items-center">
          <Clock className="h-8 w-8 mr-3" />
          下载历史
        </h1>
      </div>
      
      {/* 筛选条件 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 mr-2 text-gray-600" />
          <h2 className="text-lg font-semibold text-black">筛选条件</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="h-4 w-4 inline mr-1" />
              开始日期
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              结束日期
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              镜像名称
            </label>
            <input
              type="text"
              value={dateRange.imageName}
              onChange={(e) => setDateRange({...dateRange, imageName: e.target.value})}
              placeholder="输入镜像名称..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>
        
        <div className="flex justify-end mt-4 space-x-3">
          <button
            onClick={() => {
              setDateRange({ startDate: '', endDate: '', imageName: '' });
              fetchHistory();
            }}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            重置
          </button>
          <button
            onClick={fetchHistory}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            应用筛选
          </button>
        </div>
      </div>
      
      {/* 历史记录列表 */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-black">历史记录</h2>
          <p className="text-sm text-gray-600 mt-1">
            共 {downloadHistory.length} 条记录
          </p>
        </div>
        
        {historyLoading ? (
          <div className="px-6 py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        ) : downloadHistory.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              暂无下载历史
            </h3>
            <p className="text-gray-500">
              下载的镜像记录将显示在这里
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {downloadHistory.map((item) => (
              <div key={item.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-black">
                        {item.imageName}
                      </h3>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {item.source}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">文件大小:</span>
                        <span className="ml-1">{formatBytes(item.fileSize)}</span>
                      </div>
                      <div>
                        <span className="font-medium">下载时间:</span>
                        <span className="ml-1">{formatDownloadTime(item.downloadTime)}</span>
                      </div>
                      <div>
                        <span className="font-medium">完成时间:</span>
                        <span className="ml-1">{formatDate(item.completedAt)}</span>
                      </div>
                      <div>
                        <span className="font-medium">校验和:</span>
                        <span className="ml-1 font-mono text-xs">
                          {item.checksum?.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleRedownload(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="重新下载"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="删除记录"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
