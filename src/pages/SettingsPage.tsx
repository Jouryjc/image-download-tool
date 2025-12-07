import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Edit2, Check, X, Download, Folder } from 'lucide-react';
import { ImageSource } from '../types';
import { configApi } from '../services/api';

const SettingsPage: React.FC = () => {
  const [sources, setSources] = useState<ImageSource[]>([]);
  const [downloadPath, setDownloadPath] = useState('./downloads');
  const [maxConcurrentDownloads, setMaxConcurrentDownloads] = useState(3);
  const [chunkSize, setChunkSize] = useState(50); // MB
  const [retryAttempts, setRetryAttempts] = useState(3);
  const [retryDelay, setRetryDelay] = useState(5); // seconds
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [newSource, setNewSource] = useState<Partial<ImageSource>>({});
  const [isAddingSource, setIsAddingSource] = useState(false);

  // 加载配置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const sourcesRes = await configApi.getImageSources();
      setSources(sourcesRes.data || []);
      const settingsRes = await configApi.getSettings();
      const s = settingsRes.data || {};
      setDownloadPath(s.defaultDownloadPath || './downloads');
      setMaxConcurrentDownloads(s.maxConcurrentDownloads || 3);
      setChunkSize(Math.floor((s.chunkSize || 50 * 1024 * 1024) / (1024 * 1024)));
      setRetryAttempts(s.maxRetries || 3);
      setRetryDelay(5);
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  // 保存配置
  const saveSettings = async () => {
    try {
      // 保存源（批量保存简化为覆盖）
      // 逐条更新：此处示例仅更新设置，源管理在后端已有增删改接口
      await configApi.updateSettings({
        defaultDownloadPath: downloadPath,
        maxConcurrentDownloads,
        chunkSize: chunkSize * 1024 * 1024,
        maxRetries: retryAttempts,
      });
      alert('配置已保存');
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存配置失败');
    }
  };

  // 镜像源管理
  const addSource = () => {
    if (!newSource.name || !newSource.url) {
      alert('请填写完整的镜像源信息');
      return;
    }

    const source: ImageSource = {
      id: Date.now().toString(),
      name: newSource.name,
      url: newSource.url,
      type: newSource.type || 'dockerhub',
      enabled: newSource.enabled !== false,
      priority: newSource.priority || sources.length + 1,
      auth: newSource.auth,
    };

    setSources([...sources, source]);
    setNewSource({});
    setIsAddingSource(false);
  };

  const updateSource = (id: string, updates: Partial<ImageSource>) => {
    setSources(sources.map(source => 
      source.id === id ? { ...source, ...updates } : source
    ));
  };

  const deleteSource = (id: string) => {
    if (confirm('确定要删除这个镜像源吗？')) {
      setSources(sources.filter(source => source.id !== id));
    }
  };

  const toggleSourceEnabled = (id: string) => {
    setSources(sources.map(source => 
      source.id === id ? { ...source, enabled: !source.enabled } : source
    ));
  };

  const moveSourcePriority = (id: string, direction: 'up' | 'down') => {
    const index = sources.findIndex(s => s.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sources.length - 1)
    ) {
      return;
    }

    const newSources = [...sources];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newSources[index], newSources[newIndex]] = [newSources[newIndex], newSources[index]];
    
    // 更新优先级
    newSources.forEach((source, i) => {
      source.priority = i + 1;
    });
    
    setSources(newSources);
  };

  // 选择下载路径
  const selectDownloadPath = async () => {
    // 在浏览器环境中，这里应该调用文件系统API
    // 暂时使用prompt作为替代
    const path = prompt('请输入下载路径:', downloadPath);
    if (path) {
      setDownloadPath(path);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">系统设置</h1>
          <p className="text-gray-600">配置镜像源、下载选项和其他设置</p>
        </div>

        <div className="space-y-6">
          {/* 镜像源配置 */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">镜像源配置</h2>
                <button
                  onClick={() => setIsAddingSource(true)}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加源</span>
                </button>
              </div>
            </div>

            <div className="divide-y">
              {isAddingSource && (
                <div className="p-6 bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">添加新镜像源</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                      <input
                        type="text"
                        value={newSource.name || ''}
                        onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="例如: Docker Hub"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                      <input
                        type="url"
                        value={newSource.url || ''}
                        onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="例如: https://hub.docker.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                      <select
                        value={newSource.type || 'dockerhub'}
                        onChange={(e) => setNewSource({ ...newSource, type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        <option value="dockerhub">Docker Hub</option>
                        <option value="quay">Quay.io</option>
                        <option value="ghcr">GitHub Container Registry</option>
                        <option value="custom">自定义</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">认证 (可选)</label>
                      <input
                        type="text"
                        value={newSource.auth?.token || ''}
                        onChange={(e) => setNewSource({ 
                          ...newSource, 
                          auth: { token: e.target.value } 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="访问令牌"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={addSource}
                      className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>确认</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingSource(false);
                        setNewSource({});
                      }}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>取消</span>
                    </button>
                  </div>
                </div>
              )}

              {sources.map((source) => (
                <div key={source.id} className="p-6">
                  {editingSource === source.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                          <input
                            type="text"
                            value={source.name}
                            onChange={(e) => updateSource(source.id, { name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                          <input
                            type="url"
                            value={source.url}
                            onChange={(e) => updateSource(source.id, { url: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setEditingSource(null)}
                          className="bg-black text-white px-3 py-1 rounded text-sm hover:bg-gray-800 transition-colors"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingSource(null)}
                          className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => moveSourcePriority(source.id, 'up')}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            disabled={source.priority === 1}
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveSourcePriority(source.id, 'down')}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            disabled={source.priority === sources.length}
                          >
                            ↓
                          </button>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-medium text-gray-900">{source.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              source.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {source.enabled ? '启用' : '禁用'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{source.url}</p>
                          <p className="text-xs text-gray-400">类型: {source.type} | 优先级: {source.priority}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleSourceEnabled(source.id)}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            source.enabled
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {source.enabled ? '禁用' : '启用'}
                        </button>
                        <button
                          onClick={() => setEditingSource(source.id)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteSource(source.id)}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 下载设置 */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">下载设置</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    下载路径
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={downloadPath}
                      onChange={(e) => setDownloadPath(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <button
                      onClick={selectDownloadPath}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="选择路径"
                    >
                      <Folder className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最大并发下载数
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxConcurrentDownloads}
                    onChange={(e) => setMaxConcurrentDownloads(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分块大小 (MB)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    重试次数
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={retryAttempts}
                    onChange={(e) => setRetryAttempts(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    重试延迟 (秒)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={retryDelay}
                    onChange={(e) => setRetryDelay(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 保存按钮 */}
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>保存设置</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
