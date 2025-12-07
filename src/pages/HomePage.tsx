/**
 * 首页组件
 * 镜像搜索、热门镜像推荐、下载状态概览
 */

import React, { useState, useEffect } from 'react';
import { Search, Download, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { imageApi } from '../services/api';
import { useStore } from '../store';
import { ImageInfo } from '../types';

export const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [popularImages, setPopularImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { setSearchResults, setSearchLoading, setSearchQuery: setStoreSearchQuery } = useStore();
  
  // 获取热门镜像
  useEffect(() => {
    const fetchPopularImages = async () => {
      try {
        const response = await imageApi.getPopularImages(6);
        setPopularImages(response.data.images);
      } catch (error) {
        console.error('Failed to fetch popular images:', error);
      }
    };
    
    fetchPopularImages();
  }, []);
  
  // 搜索处理
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await imageApi.searchImages(searchQuery);
      setSearchResults(response.data.images);
      setStoreSearchQuery(searchQuery);
      setSearchLoading(false);
      navigate('/search');
    } catch (error) {
      console.error('Search failed:', error);
      setLoading(false);
    }
  };
  
  // 快速下载
  const handleQuickDownload = (image: ImageInfo) => {
    navigate('/download', { 
      state: { 
        imageName: image.name, 
        tag: image.tag || 'latest',
        source: image.source 
      } 
    });
  };
  
  return (
    <div className="space-y-12">
      {/* 页面标题 */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-black mb-4">
          容器镜像下载器
        </h1>
        <p className="text-lg text-gray-600">
          高效、稳定的容器镜像下载服务，支持多源聚合搜索和断点续传
        </p>
      </div>
      
      {/* 搜索区域 */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSearch} className="relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入镜像名称搜索，如：nginx、redis、mysql"
              className="w-full pl-12 pr-4 py-4 text-lg border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !searchQuery.trim()}
            className="absolute right-2 top-2 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '搜索中...' : '搜索'}
          </button>
        </form>
      </div>
      
      {/* 热门镜像 */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-black flex items-center">
            <TrendingUp className="h-6 w-6 mr-2" />
            热门镜像
          </h2>
          <button
            onClick={() => navigate('/search')}
            className="text-black hover:underline"
          >
            查看更多
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularImages.map((image) => (
            <div
              key={`${image.name}-${image.tag}`}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-black mb-1">
                    {image.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">
                    标签: {image.tag}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    大小: {image.size}
                  </p>
                  <p className="text-xs text-gray-500">
                    来源: {image.source}
                  </p>
                </div>
                <button
                  onClick={() => handleQuickDownload(image)}
                  className="p-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
                  title="快速下载"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
              
              {image.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {image.description}
                </p>
              )}
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-500 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(image.updatedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => navigate(`/search?q=${image.name}`)}
                  className="text-sm text-black hover:underline"
                >
                  查看详情
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 功能特色 */}
      <div className="bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-black mb-6 text-center">
          功能特色
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-black text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-black mb-2">
              多源聚合搜索
            </h3>
            <p className="text-gray-600">
              同时搜索多个镜像源，提供最全面的搜索结果
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-black text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <Download className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-black mb-2">
              断点续传
            </h3>
            <p className="text-gray-600">
              支持大文件分块下载，网络中断后可自动恢复
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-black text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-black mb-2">
              智能队列
            </h3>
            <p className="text-gray-600">
              智能管理下载队列，支持并发控制和优先级设置
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
