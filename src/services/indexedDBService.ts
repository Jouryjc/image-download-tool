/**
 * IndexedDB 本地存储服务
 * 用于存储下载历史、镜像源配置等数据
 */

export interface DownloadHistoryItem {
  id: string;
  imageName: string;
  imageTag: string;
  source: string;
  architecture: string;
  os: string;
  downloadPath: string;
  fileSize: number;
  downloadTime: number;
  completedAt: Date;
  status: 'completed' | 'failed';
  checksum?: string;
}

export interface ImageSourceConfig {
  id: string;
  name: string;
  url: string;
  type: 'dockerhub' | 'quay' | 'ghcr' | 'custom';
  enabled: boolean;
  priority: number;
  auth?: {
    token?: string;
    username?: string;
    password?: string;
  };
}

export interface AppSettings {
  downloadPath: string;
  maxConcurrentDownloads: number;
  chunkSize: number; // MB
  retryAttempts: number;
  retryDelay: number; // seconds
  autoStartDownloads: boolean;
  notificationEnabled: boolean;
}

class IndexedDBService {
  private dbName = 'ContainerImageDownloader';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  // 数据库初始化
  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 下载历史表
        if (!db.objectStoreNames.contains('downloadHistory')) {
          const historyStore = db.createObjectStore('downloadHistory', { keyPath: 'id' });
          historyStore.createIndex('imageName', 'imageName', { unique: false });
          historyStore.createIndex('completedAt', 'completedAt', { unique: false });
          historyStore.createIndex('status', 'status', { unique: false });
        }

        // 镜像源配置表
        if (!db.objectStoreNames.contains('imageSources')) {
          const sourcesStore = db.createObjectStore('imageSources', { keyPath: 'id' });
          sourcesStore.createIndex('name', 'name', { unique: false });
          sourcesStore.createIndex('priority', 'priority', { unique: false });
          sourcesStore.createIndex('enabled', 'enabled', { unique: false });
        }

        // 应用设置表
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // 确保数据库已初始化
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    return this.db!;
  }

  // 下载历史相关方法
  async addDownloadHistory(item: Omit<DownloadHistoryItem, 'id'>): Promise<string> {
    const db = await this.ensureDB();
    const id = Date.now().toString();
    const historyItem: DownloadHistoryItem = {
      ...item,
      id,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['downloadHistory'], 'readwrite');
      const store = transaction.objectStore('downloadHistory');
      const request = store.add(historyItem);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(new Error('Failed to add download history'));
    });
  }

  async getDownloadHistory(options?: {
    limit?: number;
    offset?: number;
    imageName?: string;
    status?: 'completed' | 'failed';
    startDate?: Date;
    endDate?: Date;
  }): Promise<DownloadHistoryItem[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['downloadHistory'], 'readonly');
    const store = transaction.objectStore('downloadHistory');

    return new Promise((resolve, reject) => {
      let request: IDBRequest;

      if (options?.imageName) {
        // 按镜像名称搜索
        const index = store.index('imageName');
        request = index.openCursor(IDBKeyRange.bound(
          options.imageName,
          options.imageName + '\uffff'
        ));
      } else if (options?.status) {
        // 按状态筛选
        const index = store.index('status');
        request = index.openCursor(IDBKeyRange.only(options.status));
      } else {
        // 获取所有记录
        request = store.openCursor(null, 'prev');
      }

      const results: DownloadHistoryItem[] = [];
      let count = 0;
      const offset = options?.offset || 0;
      const limit = options?.limit || 50;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (!cursor) {
          resolve(results);
          return;
        }

        const item = cursor.value as DownloadHistoryItem;
        
        // 日期筛选
        if (options?.startDate || options?.endDate) {
          const completedAt = new Date(item.completedAt);
          if (options.startDate && completedAt < options.startDate) {
            cursor.continue();
            return;
          }
          if (options.endDate && completedAt > options.endDate) {
            cursor.continue();
            return;
          }
        }

        // 分页处理
        if (count >= offset && results.length < limit) {
          results.push(item);
        }
        count++;

        if (results.length < limit) {
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to get download history'));
      };
    });
  }

  async deleteDownloadHistory(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['downloadHistory'], 'readwrite');
      const store = transaction.objectStore('downloadHistory');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete download history'));
    });
  }

  async clearDownloadHistory(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['downloadHistory'], 'readwrite');
      const store = transaction.objectStore('downloadHistory');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear download history'));
    });
  }

  // 镜像源配置相关方法
  async saveImageSources(sources: ImageSourceConfig[]): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['imageSources'], 'readwrite');
      const store = transaction.objectStore('imageSources');

      // 先清空现有数据
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        // 添加新数据
        const addPromises = sources.map(source => {
          return new Promise<void>((resolveAdd, rejectAdd) => {
            const addRequest = store.add(source);
            addRequest.onsuccess = () => resolveAdd();
            addRequest.onerror = () => rejectAdd(new Error('Failed to add image source'));
          });
        });

        Promise.all(addPromises)
          .then(() => resolve())
          .catch(() => reject(new Error('Failed to save image sources')));
      };

      clearRequest.onerror = () => {
        reject(new Error('Failed to clear image sources'));
      };
    });
  }

  async getImageSources(): Promise<ImageSourceConfig[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['imageSources'], 'readonly');
      const store = transaction.objectStore('imageSources');
      const request = store.getAll();

      request.onsuccess = () => {
        const sources = request.result as ImageSourceConfig[];
        // 按优先级排序
        sources.sort((a, b) => a.priority - b.priority);
        resolve(sources);
      };

      request.onerror = () => {
        reject(new Error('Failed to get image sources'));
      };
    });
  }

  // 应用设置相关方法
  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');

      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
      }));

      const savePromises = settingsArray.map(item => {
        return new Promise<void>((resolveSave, rejectSave) => {
          const request = store.put(item);
          request.onsuccess = () => resolveSave();
          request.onerror = () => rejectSave(new Error(`Failed to save setting: ${item.key}`));
        });
      });

      Promise.all(savePromises)
        .then(() => resolve())
        .catch(() => reject(new Error('Failed to save settings')));
    });
  }

  async getSettings(): Promise<AppSettings | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.getAll();

      request.onsuccess = () => {
        const settingsArray = request.result;
        if (settingsArray.length === 0) {
          resolve(null);
          return;
        }

        const settings: AppSettings = {
          downloadPath: './downloads',
          maxConcurrentDownloads: 3,
          chunkSize: 50,
          retryAttempts: 3,
          retryDelay: 5,
          autoStartDownloads: false,
          notificationEnabled: true,
        };

        settingsArray.forEach((item: { key: string; value: any }) => {
          (settings as any)[item.key] = item.value;
        });

        resolve(settings);
      };

      request.onerror = () => {
        reject(new Error('Failed to get settings'));
      };
    });
  }

  // 获取统计数据
  async getStatistics(): Promise<{
    totalDownloads: number;
    completedDownloads: number;
    failedDownloads: number;
    totalSize: number;
  }> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['downloadHistory'], 'readonly');
      const store = transaction.objectStore('downloadHistory');
      const request = store.getAll();

      request.onsuccess = () => {
        const history = request.result as DownloadHistoryItem[];
        
        const stats = {
          totalDownloads: history.length,
          completedDownloads: history.filter(h => h.status === 'completed').length,
          failedDownloads: history.filter(h => h.status === 'failed').length,
          totalSize: history.reduce((sum, h) => sum + h.fileSize, 0),
        };

        resolve(stats);
      };

      request.onerror = () => {
        reject(new Error('Failed to get statistics'));
      };
    });
  }

  // 导出数据
  async exportData(): Promise<{
    downloadHistory: DownloadHistoryItem[];
    imageSources: ImageSourceConfig[];
    settings: AppSettings | null;
  }> {
    const [downloadHistory, imageSources, settings] = await Promise.all([
      this.getDownloadHistory(),
      this.getImageSources(),
      this.getSettings(),
    ]);

    return {
      downloadHistory,
      imageSources,
      settings,
    };
  }

  // 导入数据
  async importData(data: {
    downloadHistory?: DownloadHistoryItem[];
    imageSources?: ImageSourceConfig[];
    settings?: AppSettings;
  }): Promise<void> {
    const promises: Promise<void>[] = [];

    if (data.downloadHistory) {
      // 先清空历史记录，然后导入新数据
      promises.push(this.clearDownloadHistory().then(async () => {
        const addPromises = data.downloadHistory!.map(item => 
          this.addDownloadHistory({
            imageName: item.imageName,
            imageTag: item.imageTag,
            source: item.source,
            architecture: item.architecture,
            os: item.os,
            downloadPath: item.downloadPath,
            fileSize: item.fileSize,
            downloadTime: item.downloadTime,
            completedAt: item.completedAt,
            status: item.status,
            checksum: item.checksum,
          })
        );
        await Promise.all(addPromises);
      }));
    }

    if (data.imageSources) {
      promises.push(this.saveImageSources(data.imageSources));
    }

    if (data.settings) {
      promises.push(this.saveSettings(data.settings));
    }

    await Promise.all(promises);
  }

  // 清理旧数据
  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['downloadHistory'], 'readwrite');
      const store = transaction.objectStore('downloadHistory');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const request = store.openCursor();
      const deletePromises: Promise<void>[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (!cursor) {
          Promise.all(deletePromises)
            .then(() => resolve())
            .catch(() => reject(new Error('Failed to cleanup old data')));
          return;
        }

        const item = cursor.value as DownloadHistoryItem;
        if (new Date(item.completedAt) < cutoffDate) {
          deletePromises.push(
            new Promise((resolveDelete, rejectDelete) => {
              const deleteRequest = store.delete(item.id);
              deleteRequest.onsuccess = () => resolveDelete();
              deleteRequest.onerror = () => rejectDelete(new Error('Failed to delete old item'));
            })
          );
        }

        cursor.continue();
      };

      request.onerror = () => {
        reject(new Error('Failed to cleanup old data'));
      };
    });
  }
}

// 创建单例实例
export const indexedDBService = new IndexedDBService();

export default IndexedDBService;