import { describe, it, expect, beforeAll } from 'vitest';
import { indexedDBService } from '../services/indexedDBService';

/**
 * IndexedDB 服务单元测试
 */
describe('indexedDBService', () => {
  beforeAll(async () => {
    await indexedDBService.initDB();
  });

  it('should save and retrieve image sources', async () => {
    await indexedDBService.saveImageSources([
      { id: '1', name: 'Docker Hub', url: 'https://hub.docker.com', type: 'dockerhub', enabled: true, priority: 1 },
    ] as any);
    const sources = await indexedDBService.getImageSources();
    expect(sources.length).toBe(1);
    expect(sources[0].name).toBe('Docker Hub');
  });

  it('should add and query download history', async () => {
    const id = await indexedDBService.addDownloadHistory({
      imageName: 'nginx',
      imageTag: 'latest',
      source: 'dockerhub',
      architecture: 'amd64',
      os: 'linux',
      downloadPath: '/downloads/nginx.tar',
      fileSize: 100,
      downloadTime: 10,
      completedAt: new Date(),
      status: 'completed',
      checksum: 'sha256:abc',
    });
    expect(id).toBeTruthy();
    const history = await indexedDBService.getDownloadHistory({ imageName: 'nginx' });
    expect(history.length).toBeGreaterThan(0);
  });
});

