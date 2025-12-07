/**
 * 搜索页面组件
 * 多源聚合搜索、筛选条件、搜索结果展示
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Filter, Download, Search, Clock, Tag, Cpu } from 'lucide-react';
import { imageApi } from '../services/api';
import { useStore } from '../store';
import { ImageInfo } from '../types';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // 搜索参数
  const query = searchParams.get('q') || '';
  const source = searchParams.get('source') || '';
  const architecture = searchParams.get('architecture') || '';
  const tag = searchParams.get('tag') || '';
  
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  
  const { 
    searchResults, 
    searchLoading, 
    setSearchResults, 
    setSearchLoading, 
    setSearchQuery 
  } = useStore();
  
  // 执行搜索
  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query, source, architecture, tag]);

  // 搜索结果加载后，异步补全 dockerhub 条目的大小
  useEffect(() => {
    (async () => {
      const updated = [...searchResults];
      const tasks: Array<Promise<void>> = [];
      for (let i = 0; i < updated.length; i++) {
        const img = updated[i];
        if (img.source === 'dockerhub' && (img.size === 'Unknown' || !img.sizeBytes)) {
          tasks.push(
            imageApi.getImageSize(img.name, img.source, img.tag).then((res) => {
              const data: any = res.data || {};
              updated[i] = { ...img, sizeBytes: data.sizeBytes || 0, size: data.size || img.size } as ImageInfo;
            }).catch(() => {})
          );
        }
      }
      if (tasks.length) {
        await Promise.all(tasks);
        setSearchResults(updated);
      }
    })();
  }, [searchResults, setSearchResults]);
  
  const performSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setSearchLoading(true);
    
    try {
      const response = await imageApi.searchImages(query, {
        source: source || undefined,
        architecture: architecture || undefined,
        tag: tag || undefined,
        page: 1,
        pageSize: 20
      });
      
      setSearchResults(response.data.images);
      setSearchQuery(query);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };
  
  // 更新搜索参数
  const updateSearchParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };
  
  // 选择/取消选择镜像
  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };
  
  // 批量下载
  const handleBatchDownload = () => {
    const selectedImageList = searchResults.filter(img => 
      selectedImages.has(`${img.name}:${img.tag}`)
    );
    
    if (selectedImageList.length === 0) return;
    
    navigate('/download', { 
      state: { 
        batchImages: selectedImageList 
      } 
    });
  };
  
  // 单个下载
  const handleDownload = (image: ImageInfo) => {
    navigate('/download', { 
      state: { 
        imageName: image.name, 
        tag: image.tag || 'latest',
        source: image.source 
      } 
    });
  };
  
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-black flex items-center">
          <Search className="h-8 w-8 mr-3" />
          镜像搜索
        </h1>
        
        {selectedImages.size > 0 && (
          <button
            onClick={handleBatchDownload}
            className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            批量下载 ({selectedImages.size})
          </button>
        )}
      </div>
      
      {/* 搜索栏 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => updateSearchParam('q', e.target.value)}
              placeholder="输入镜像名称搜索..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          
          {/* 筛选条件 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Tag className="h-4 w-4 inline mr-1" />
                标签
              </label>
              <select
                value={tag}
                onChange={(e) => updateSearchParam('tag', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">所有标签</option>
                <option value="latest">latest</option>
                <option value="alpine">alpine</option>
                <option value="slim">slim</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Cpu className="h-4 w-4 inline mr-1" />
                架构
              </label>
              <select
                value={architecture}
                onChange={(e) => updateSearchParam('architecture', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">所有架构</option>
                <option value="amd64">amd64</option>
                <option value="arm64">arm64</option>
                <option value="386">386</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Filter className="h-4 w-4 inline mr-1" />
                镜像源
              </label>
              <select
                value={source}
                onChange={(e) => updateSearchParam('source', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">所有源</option>
                <option value="dockerhub">Docker Hub</option>
                <option value="quay">Quay.io</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* 搜索结果 */}
      {(loading || searchLoading) ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          <span className="ml-4 text-lg">搜索中...</span>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600">
              找到 {searchResults.length} 个结果
              {query && (
                <span className="ml-2">
                  关键词: <span className="font-medium">"{query}"</span>
                </span>
              )}
            </p>
          </div>
          
          {searchResults.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                未找到相关镜像
              </h3>
              <p className="text-gray-500">
                请尝试其他关键词或调整筛选条件
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((image) => (
                <div
                  key={`${image.name}-${image.tag}-${image.source}`}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedImages.has(`${image.name}:${image.tag}`)}
                        onChange={() => toggleImageSelection(`${image.name}:${image.tag}`)}
                        className="mt-1 h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-black mb-1">
                          {image.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-1">
                          标签: {image.tag}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          大小: {image.size}
                        </p>
                        <p className="text-xs text-gray-500">
                          来源: {image.source}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {image.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {image.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(image.updatedAt).toLocaleDateString()}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownload(image)}
                        className="bg-black text-white px-3 py-1 rounded text-sm hover:bg-gray-800 transition-colors flex items-center"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        下载
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
