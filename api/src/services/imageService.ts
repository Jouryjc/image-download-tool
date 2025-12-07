/**
 * 镜像搜索服务
 * 负责从多个镜像源搜索容器镜像
 */
import axios from 'axios';
import { ImageInfo, SearchResponse } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * 镜像源配置
 */
const IMAGE_SOURCES = {
  dockerhub: {
    name: 'Docker Hub',
    baseUrl: 'https://hub.docker.com/v2',
    searchPath: '/search/repositories/',
    priority: 1
  },
  quay: {
    name: 'Quay.io',
    baseUrl: 'https://quay.io/api/v1',
    searchPath: '/repository',
    priority: 2
  },
  ghcr: {
    name: 'GitHub Container Registry',
    baseUrl: 'https://ghcr.io/v2',
    searchPath: '/_catalog',
    priority: 3
  }
};

/**
 * 从Docker Hub搜索镜像
 */
async function searchDockerHub(query: string, page: number = 1, pageSize: number = 20): Promise<ImageInfo[]> {
  try {
    // 首选 content API，提高关键词匹配质量
    const contentRes = await axios.get(`https://hub.docker.com/api/content/v1/products/search`, {
      params: {
        type: 'image',
        q: query,
        page_size: pageSize,
        page
      },
      timeout: 10000
    });

    const contentItems = Array.isArray(contentRes.data?.summaries)
      ? contentRes.data.summaries
      : (Array.isArray(contentRes.data?.results) ? contentRes.data.results : []);

    let mapped = contentItems.map((item: any) => ({
      name: item.slug || item.name || '',
      tag: '',
      size: 'Unknown',
      sizeBytes: 0,
      source: 'dockerhub',
      updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
      description: item.short_description || item.description || '',
      architecture: 'amd64',
      digest: item.slug || item.name || ''
    })).filter((r: ImageInfo) => r.name && r.name.toLowerCase().includes(query.toLowerCase()));

    // 回退到 v2 search
    if (mapped.length === 0) {
      const response = await axios.get(`${IMAGE_SOURCES.dockerhub.baseUrl}${IMAGE_SOURCES.dockerhub.searchPath}`, {
        params: {
          query,
          page,
          page_size: pageSize
        },
        timeout: 10000
      });

      const results = Array.isArray(response.data?.results) ? response.data.results : [];
      mapped = results.map((repo: any) => ({
        name: repo.repo_name || repo.name || repo.slug || '',
        tag: '',
        size: 'Unknown',
        sizeBytes: 0,
        source: 'dockerhub',
        updatedAt: repo.last_updated || new Date().toISOString(),
        description: repo.short_description || repo.description || '',
        architecture: 'amd64',
        digest: repo.repo_name || repo.name || ''
      })).filter((r: ImageInfo) => r.name && r.name.toLowerCase().includes(query.toLowerCase()));
    }

    // 为前 pageSize 条目补全大小信息
    const limit = Math.min(pageSize, mapped.length);
    for (let i = 0; i < limit; i++) {
      const name = mapped[i].name;
      const bytes = await getDockerHubImageSize(name, 'latest');
      if (bytes && bytes > 0) {
        mapped[i].sizeBytes = bytes;
        mapped[i].size = formatBytes(bytes);
      }
    }

    return mapped;
  } catch (error) {
    logger.error('Docker Hub search error:', error);
    return [];
  }
}

/**
 * 从Quay.io搜索镜像
 */
async function searchQuay(query: string, page: number = 1, pageSize: number = 20): Promise<ImageInfo[]> {
  try {
    const response = await axios.get(`${IMAGE_SOURCES.quay.baseUrl}${IMAGE_SOURCES.quay.searchPath}`, {
      params: {
        public: true,
        search: query
      },
      timeout: 10000
    });

    const repos = Array.isArray(response.data?.repositories) ? response.data.repositories : [];
    return repos.map((repo: any) => ({
      name: repo.name || '',
      tag: '',
      size: 'Unknown',
      sizeBytes: 0,
      source: 'quay',
      updatedAt: repo.last_modified || new Date().toISOString(),
      description: repo.description || '',
      architecture: 'amd64',
      digest: repo.name || ''
    })).filter((r: ImageInfo) => r.name && r.name.toLowerCase().includes(query.toLowerCase()));
  } catch (error) {
    logger.error('Quay.io search error:', error);
    return [];
  }
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 规范化 Docker Hub 仓库名
 * 例如：nginx -> library/nginx；namespace/name 保持不变
 */
function normalizeDockerRepo(name: string): string {
  if (!name) return '';
  return name.includes('/') ? name : `library/${name}`;
}

/**
 * 获取 Docker Hub 镜像大小（通过 Registry Manifests）
 */
async function getDockerHubImageSize(repoName: string, tag: string = 'latest'): Promise<number> {
  try {
    const repoPath = normalizeDockerRepo(repoName);
    // 获取访问 token
    const tokenResp = await axios.get('https://auth.docker.io/token', {
      params: {
        service: 'registry.docker.io',
        scope: `repository:${repoPath}:pull`
      },
      timeout: 10000
    });
    const token = tokenResp.data?.token;
    if (!token) return 0;

    // 尝试请求 manifest list
    const listResp = await axios.get(`https://registry-1.docker.io/v2/${repoPath}/manifests/${tag}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.docker.distribution.manifest.list.v2+json'
      },
      timeout: 10000
    });
    const manifests = listResp.data?.manifests;
    if (Array.isArray(manifests) && manifests.length > 0) {
      const amd64 = manifests.find((m: any) => m.platform?.architecture === 'amd64') || manifests[0];
      const digest = amd64?.digest;
      if (digest) {
        const manifestResp = await axios.get(`https://registry-1.docker.io/v2/${repoPath}/manifests/${digest}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.docker.distribution.manifest.v2+json'
          },
          timeout: 10000
        });
        const layers = manifestResp.data?.layers || [];
        return layers.reduce((sum: number, l: any) => sum + (l.size || 0), 0);
      }
    }

    // 回退：请求单一 manifest v2
    const manifestResp = await axios.get(`https://registry-1.docker.io/v2/${repoPath}/manifests/${tag}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.docker.distribution.manifest.v2+json'
      },
      timeout: 10000
    });
    const layers = manifestResp.data?.layers || [];
    return layers.reduce((sum: number, l: any) => sum + (l.size || 0), 0);
  } catch (e) {
    logger.warn('Failed to get Docker Hub image size:', e instanceof Error ? e.message : String(e));
    return 0;
  }
}

/**
 * 搜索镜像服务
 */
export class ImageService {
  /**
   * 聚合搜索多个镜像源
   */
  async searchImages(query: string, options: {
    source?: string;
    architecture?: string;
    tag?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<SearchResponse> {
    const { source, architecture, tag, page = 1, pageSize = 20 } = options;
    
    logger.info(`Searching images: query=${query}, source=${source || 'all'}, page=${page}`);

    let allResults: ImageInfo[] = [];
    const sources = source ? [source] : Object.keys(IMAGE_SOURCES);

    // 并行搜索多个源
    const searchPromises = sources.map(async (src) => {
      switch (src) {
        case 'dockerhub':
          return searchDockerHub(query, page, pageSize);
        case 'quay':
          return searchQuay(query, page, pageSize);
        default:
          return [];
      }
    });

    try {
      const results = await Promise.allSettled(searchPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allResults = allResults.concat(result.value);
        } else {
          logger.error(`Search failed for source ${sources[index]}:`, result.reason);
        }
      });

      // 名称包含过滤与去重
      const lcQuery = query.toLowerCase();
      allResults = allResults.filter(img => (img.name || '').toLowerCase().includes(lcQuery));

      const seen = new Set<string>();
      allResults = allResults.filter(item => {
        const key = `${item.source}:${item.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // 排序：精确匹配 > 官方library > 源优先级 > 名称
      allResults.sort((a, b) => {
        const exactA = (a.name || '').toLowerCase() === lcQuery ? 1 : 0;
        const exactB = (b.name || '').toLowerCase() === lcQuery ? 1 : 0;
        if (exactA !== exactB) return exactB - exactA;

        const officialA = (a.name || '').startsWith('library/') ? 1 : 0;
        const officialB = (b.name || '').startsWith('library/') ? 1 : 0;
        if (officialA !== officialB) return officialB - officialA;

        const sourcePriorityA = IMAGE_SOURCES[a.source as keyof typeof IMAGE_SOURCES]?.priority || 999;
        const sourcePriorityB = IMAGE_SOURCES[b.source as keyof typeof IMAGE_SOURCES]?.priority || 999;
        if (sourcePriorityA !== sourcePriorityB) return sourcePriorityA - sourcePriorityB;

        return (a.name || '').localeCompare(b.name || '');
      });

      // 过滤结果
      let filteredResults = allResults;
      
      if (architecture) {
        filteredResults = filteredResults.filter(img => 
          !img.architecture || img.architecture === architecture
        );
      }
      
      if (tag && tag !== 'latest') {
        // 这里可以添加更复杂的标签匹配逻辑
        filteredResults = filteredResults.filter(img => 
          img.tag === tag
        );
      }

      // 官方镜像兜底（结果过少时补充）
      const needFallback = filteredResults.length < 3;
      const lc = query.toLowerCase();
      if (needFallback) {
        const fallbackMap: Record<string, ImageInfo> = {
          nginx: {
            name: 'library/nginx',
            tag: '',
            size: 'Unknown',
            sizeBytes: 0,
            source: 'dockerhub',
            updatedAt: new Date().toISOString(),
            description: 'Official nginx image',
            architecture: 'amd64',
            digest: 'nginx'
          },
          redis: {
            name: 'library/redis',
            tag: '',
            size: 'Unknown',
            sizeBytes: 0,
            source: 'dockerhub',
            updatedAt: new Date().toISOString(),
            description: 'Official Redis image',
            architecture: 'amd64',
            digest: 'redis'
          }
        };
        if (fallbackMap[lc]) {
          const exists = filteredResults.some(r => r.name === fallbackMap[lc].name);
          if (!exists) filteredResults.unshift(fallbackMap[lc]);
        }
      }

      // 分页
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedResults = filteredResults.slice(startIndex, endIndex);

      logger.info(`Search completed: found ${paginatedResults.length} results out of ${filteredResults.length} total`);

      return {
        code: 200,
        data: {
          images: paginatedResults,
          total: filteredResults.length,
          page,
          pageSize
        }
      };
    } catch (error) {
      logger.error('Search service error:', error);
      throw error;
    }
  }

  /**
   * 获取热门镜像
   */
  async getPopularImages(limit: number = 10): Promise<ImageInfo[]> {
    const popularImages = [
      'nginx',
      'redis',
      'mysql',
      'postgres',
      'mongo',
      'node',
      'python',
      'golang',
      'alpine',
      'ubuntu'
    ];

    const results: ImageInfo[] = [];
    
    for (const imageName of popularImages.slice(0, limit)) {
      try {
        const searchResults = await this.searchImages(imageName, { 
          source: 'dockerhub', 
          pageSize: 1 
        });
        
        if (searchResults.data.images.length > 0) {
          results.push(searchResults.data.images[0]);
        }
      } catch (error) {
        logger.error(`Failed to get popular image ${imageName}:`, error);
      }
    }

    return results;
  }

  /**
   * 获取镜像详情
   */
  async getImageDetails(name: string, tag: string = 'latest', source: string = 'dockerhub'): Promise<ImageInfo | null> {
    try {
      const searchResults = await this.searchImages(name, { 
        source, 
        tag,
        pageSize: 1 
      });
      
      return searchResults.data.images.find(img => 
        img.name === name && img.tag === tag
      ) || null;
    } catch (error) {
      logger.error(`Failed to get image details for ${name}:${tag}:`, error);
      return null;
    }
  }
}

// 导出供路由调用
export { getDockerHubImageSize };
