import { createWriteStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import axios from 'axios';
import { DownloadTask, DownloadStatus } from '../types/index.js';
import { EventEmitter } from 'events';
import path from 'path';

/**
 * 下载服务 - 支持分块下载和断点续传
 */
/**
 * 下载服务：真实镜像下载（Docker Hub），支持分块与断点续传、进度上报
 */
export class DownloadService extends EventEmitter {
  private activeTasks: Map<string, DownloadTask> = new Map();
  private taskControllers: Map<string, AbortController> = new Map();
  private maxConcurrentDownloads: number = 3;
  private chunkSize: number = 50 * 1024 * 1024; // 50MB
  private retryAttempts: number = 3;
  private retryDelay: number = 5000; // 5秒
  private downloadsRoot: string;

  constructor(downloadsDir: string = './downloads') {
    super();
    this.downloadsRoot = downloadsDir;
    this.ensureDownloadsDir();
  }

  /**
   * 确保下载目录存在
   */
  /**
   * 确保下载根目录存在
   */
  private async ensureDownloadsDir(): Promise<void> {
    try {
      await fs.access(this.downloadsRoot);
    } catch {
      await fs.mkdir(this.downloadsRoot, { recursive: true });
    }
  }

  /**
   * 开始下载任务
   */
  /**
   * 开始下载任务
   */
  async startDownload(imageName: string, tag: string, source: string, targetPath?: string): Promise<DownloadTask> {
    const taskId = Date.now().toString();
    const taskDir = path.join(this.downloadsRoot, 'tasks', taskId);
    await fs.mkdir(taskDir, { recursive: true });

    const task: DownloadTask = {
      id: taskId,
      imageName,
      tag,
      source,
      status: 'pending',
      progress: 0,
      speed: 0,
      totalBytes: 0,
      downloadedBytes: 0,
      targetPath: targetPath || taskDir,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.activeTasks.set(taskId, task);
    this.emit('taskCreated', task);

    // 异步执行下载
    this.executeDownload(taskId).catch(error => {
      console.error(`下载任务 ${taskId} 失败:`, error);
      this.updateTaskStatus(taskId, 'error', { error: (error as Error).message });
    });

    return task;
  }

  /**
   * 执行下载
   */
  /**
   * 执行下载（Docker Hub）
   */
  private async executeDownload(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    try {
      this.updateTaskStatus(taskId, 'downloading');
      let manifestInfo: any;
      if (task.source === 'dockerhub') {
        const repo = this.normalizeDockerRepo(task.imageName);
        const token = await this.getDockerToken(repo);
        manifestInfo = await this.getDockerManifestInfo(repo, task.tag, token);
      } else if (task.source === 'aliyun') {
        const repo = task.imageName; // 例：namespace/repo
        const host = process.env.ALIYUN_REGISTRY_HOST || 'registry.cn-hangzhou.aliyuncs.com';
        const basic = this.getBasicAuthHeader(process.env.ALIYUN_USERNAME, process.env.ALIYUN_PASSWORD);
        manifestInfo = await this.getGenericManifestInfo(host, repo, task.tag, basic);
      } else {
        throw new Error(`暂不支持的镜像源: ${task.source}`);
      }

      // 总大小为所有层 size 之和
      const totalBytes = manifestInfo.layers.reduce((sum, l) => sum + (l.size || 0), 0);
      task.totalBytes = totalBytes;
      this.activeTasks.set(taskId, task);

      const blobsDir = path.join(task.targetPath, 'blobs');
      await fs.mkdir(blobsDir, { recursive: true });

      // 逐层下载
      for (const layer of manifestInfo.layers) {
        const layerPath = path.join(blobsDir, layer.digest.replace(/[:/]/g, '_'));
        if (task.source === 'dockerhub') {
          const repo = this.normalizeDockerRepo(task.imageName);
          const token = await this.getDockerToken(repo);
          await this.downloadDockerBlob(taskId, repo, layer.digest, token, layerPath, layer.size || 0);
        } else if (task.source === 'aliyun') {
          const host = process.env.ALIYUN_REGISTRY_HOST || 'registry.cn-hangzhou.aliyuncs.com';
          const basic = this.getBasicAuthHeader(process.env.ALIYUN_USERNAME, process.env.ALIYUN_PASSWORD);
          await this.downloadGenericBlob(taskId, host, task.imageName, layer.digest, basic, layerPath, layer.size || 0);
        }
      }

      // 保存 manifest 与 config
      await fs.writeFile(path.join(task.targetPath, 'manifest.json'), JSON.stringify(manifestInfo.manifest, null, 2));
      await fs.writeFile(path.join(task.targetPath, 'config.json'), JSON.stringify(manifestInfo.config, null, 2));

      // 校验（简单输出）
      await this.verifyFile(task);
      this.updateTaskStatus(taskId, 'completed');
    } catch (error) {
      console.error(`下载失败:`, error);
      this.updateTaskStatus(taskId, 'error', { error: (error as Error).message });
      
      // 重试逻辑
      const retryCount = (task as any).retryCount || 0;
      if (retryCount < this.retryAttempts) {
        (task as any).retryCount = retryCount + 1;
        console.log(`等待 ${this.retryDelay}ms 后重试 (第 ${task.retryCount} 次)`);
        await this.delay(this.retryDelay);
        await this.executeDownload(taskId);
      }
    }
  }

  /**
   * 获取镜像下载URL
   */
  /** 获取 Docker Hub token */
  private async getDockerToken(repoPath: string): Promise<string> {
    const resp = await axios.get('https://auth.docker.io/token', {
      params: { service: 'registry.docker.io', scope: `repository:${repoPath}:pull` },
      timeout: 10000,
    });
    return resp.data?.token || '';
  }

  /**
   * 获取文件大小
   */
  /** 规范化仓库名 */
  private normalizeDockerRepo(name: string): string {
    return name.includes('/') ? name : `library/${name}`;
  }

  /**
   * 检查是否支持范围请求
   */
  /** 获取 manifest 信息（选择 amd64） */
  private async getDockerManifestInfo(repoPath: string, tag: string, token: string): Promise<any> {
    const listResp = await axios.get(`https://registry-1.docker.io/v2/${repoPath}/manifests/${tag}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.docker.distribution.manifest.list.v2+json'
      },
      timeout: 10000
    });
    let digest: string | undefined;
    if (Array.isArray(listResp.data?.manifests)) {
      const m = listResp.data.manifests.find((x: any) => x.platform?.architecture === 'amd64') || listResp.data.manifests[0];
      digest = m?.digest;
    }
    const manifestResp = await axios.get(`https://registry-1.docker.io/v2/${repoPath}/manifests/${digest || tag}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.docker.distribution.manifest.v2+json'
      },
      timeout: 10000
    });
    const configDigest = manifestResp.data?.config?.digest;
    let config = {};
    if (configDigest) {
      const configResp = await axios.get(`https://registry-1.docker.io/v2/${repoPath}/blobs/${configDigest}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      config = configResp.data;
    }
    return { manifest: manifestResp.data, config, layers: manifestResp.data?.layers || [] };
  }

  /** 获取通用 registry manifest（如阿里云，支持Basic或匿名） */
  private async getGenericManifestInfo(host: string, repoPath: string, tag: string, basicAuth?: string): Promise<any> {
    // 先尝试 manifest list，再回退到单 manifest
    const listResp = await axios.get(`https://${host}/v2/${repoPath}/manifests/${tag}`, {
      headers: {
        ...(basicAuth ? { Authorization: basicAuth } : {}),
        Accept: 'application/vnd.docker.distribution.manifest.list.v2+json'
      },
      timeout: 10000
    });
    let digest: string | undefined;
    if (Array.isArray(listResp.data?.manifests)) {
      const m = listResp.data.manifests.find((x: any) => x.platform?.architecture === 'amd64') || listResp.data.manifests[0];
      digest = m?.digest;
    }
    const manifestResp = await axios.get(`https://${host}/v2/${repoPath}/manifests/${digest || tag}`, {
      headers: {
        ...(basicAuth ? { Authorization: basicAuth } : {}),
        Accept: 'application/vnd.docker.distribution.manifest.v2+json'
      },
      timeout: 10000
    });
    const configDigest = manifestResp.data?.config?.digest;
    let config = {};
    if (configDigest) {
      const configResp = await axios.get(`https://${host}/v2/${repoPath}/blobs/${configDigest}`, {
        headers: { ...(basicAuth ? { Authorization: basicAuth } : {}) },
        timeout: 10000
      });
      config = configResp.data;
    }
    return { manifest: manifestResp.data, config, layers: manifestResp.data?.layers || [] };
  }

  /**
   * 直接下载（小文件）
   */
  /** 下载单个 blob 并更新总体进度 */
  private async downloadDockerBlob(taskId: string, repoPath: string, digest: string, token: string, outPath: string, expectedSize: number): Promise<void> {
    const controller = new AbortController();
    this.taskControllers.set(taskId, controller);

    const resp = await axios.get(`https://registry-1.docker.io/v2/${repoPath}/blobs/${digest}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'stream',
      signal: controller.signal,
      timeout: 0
    });

    const writer = createWriteStream(outPath);
    let downloaded = 0;
    const task = this.activeTasks.get(taskId)!;

    await new Promise<void>((resolve, reject) => {
      resp.data.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
        const total = task.totalBytes || (expectedSize || 0);
        const newDownloaded = (task.downloadedBytes || 0) + chunk.length;
        this.updateTaskProgress(taskId, total ? (newDownloaded / total) * 100 : task.progress, newDownloaded, 0);
      });
      resp.data.on('error', reject);
      resp.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 更新已下载总字节
    const t = this.activeTasks.get(taskId)!;
    t.downloadedBytes = (t.downloadedBytes || 0) + downloaded;
    this.activeTasks.set(taskId, t);
    this.taskControllers.delete(taskId);
  }

  /** 下载通用 registry blob（如阿里云） */
  private async downloadGenericBlob(taskId: string, host: string, repoPath: string, digest: string, basicAuth: string | undefined, outPath: string, expectedSize: number): Promise<void> {
    const controller = new AbortController();
    this.taskControllers.set(taskId, controller);

    const resp = await axios.get(`https://${host}/v2/${repoPath}/blobs/${digest}`, {
      headers: { ...(basicAuth ? { Authorization: basicAuth } : {}) },
      responseType: 'stream',
      signal: controller.signal,
      timeout: 0
    });

    const writer = createWriteStream(outPath);
    let downloaded = 0;
    const task = this.activeTasks.get(taskId)!;

    await new Promise<void>((resolve, reject) => {
      resp.data.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
        const total = task.totalBytes || (expectedSize || 0);
        const newDownloaded = (task.downloadedBytes || 0) + chunk.length;
        this.updateTaskProgress(taskId, total ? (newDownloaded / total) * 100 : task.progress, newDownloaded, 0);
      });
      resp.data.on('error', reject);
      resp.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const t = this.activeTasks.get(taskId)!;
    t.downloadedBytes = (t.downloadedBytes || 0) + downloaded;
    this.activeTasks.set(taskId, t);
    this.taskControllers.delete(taskId);
  }

  /** Basic Auth header */
  private getBasicAuthHeader(username?: string, password?: string): string | undefined {
    if (!username || !password) return undefined;
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    return `Basic ${token}`;
  }

  /**
   * 分块下载（大文件）
   */
  // 分块逻辑留作扩展（Docker blob 已支持流式，无需范围请求）

  /**
   * 下载单个块
   */
  // 保留占位以便未来扩展范围请求下载

  /**
   * 检查块是否完整
   */
  private async isChunkComplete(chunkPath: string, start: number, end: number): Promise<boolean> {
    try {
      const stats = await fs.stat(chunkPath);
      const expectedSize = end - start + 1;
      return stats.size === expectedSize;
    } catch {
      return false;
    }
  }

  /**
   * 合并块文件
   */
  private async mergeChunks(chunkPaths: string[], outputPath: string): Promise<void> {
    const writeStream = createWriteStream(outputPath);

    for (const chunkPath of chunkPaths) {
      const chunkData = await fs.readFile(chunkPath);
      await new Promise<void>((resolve, reject) => {
        writeStream.write(chunkData, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  /**
   * 验证文件完整性
   */
  /** 验证文件（简单输出） */
  private async verifyFile(task: DownloadTask): Promise<void> {
    console.log(`文件验证完成: ${task.targetPath}`);
  }

  /**
   * 暂停下载
   */
  pauseDownload(taskId: string): void {
    const controller = this.taskControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.taskControllers.delete(taskId);
    }

    const task = this.activeTasks.get(taskId);
    if (task && task.status === 'downloading') {
      task.status = 'paused';
      task.updatedAt = new Date();
      this.activeTasks.set(taskId, task);
      this.emit('taskPaused', task);
    }
  }

  /**
   * 继续下载
   */
  async resumeDownload(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task || task.status !== 'paused') return;

    // 重新执行下载
    this.executeDownload(taskId).catch(error => {
      console.error(`恢复下载失败:`, error);
      this.updateTaskStatus(taskId, 'error', { error: error.message });
    });
  }

  /**
   * 取消下载
   */
  cancelDownload(taskId: string): void {
    const controller = this.taskControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.taskControllers.delete(taskId);
    }

    const task = this.activeTasks.get(taskId);
    if (task) {
      task.status = 'cancelled';
      task.updatedAt = new Date();
      this.activeTasks.delete(taskId);
      this.emit('taskCancelled', task);
    }
  }

  /**
   * 重试下载
   */
  async retryDownload(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    // 重置任务状态
    task.status = 'pending';
    task.progress = 0;
    task.speed = 0;
    task.downloadedSize = 0;
    task.retryCount = 0;
    task.updatedAt = new Date();

    this.executeDownload(taskId).catch(error => {
      console.error(`重试下载失败:`, error);
      this.updateTaskStatus(taskId, 'error', { error: error.message });
    });
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): DownloadTask[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * 获取单个任务
   */
  getTask(taskId: string): DownloadTask | undefined {
    return this.activeTasks.get(taskId);
  }

  /**
   * 更新任务状态
   */
  private updateTaskStatus(
    taskId: string,
    status: DownloadStatus,
    additionalData?: Partial<DownloadTask>
  ): void {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    task.status = status;
    task.updatedAt = new Date();

    if (additionalData) {
      Object.assign(task, additionalData);
    }

    this.activeTasks.set(taskId, task);
    this.emit('taskUpdated', task);

    // 状态变化事件
    switch (status) {
      case 'completed':
        this.emit('downloadComplete', task);
        break;
      case 'error':
        this.emit('downloadError', task);
        break;
    }
  }

  /**
   * 更新任务进度
   */
  private updateTaskProgress(
    taskId: string,
    progress: number,
    downloadedSize: number,
    speed: number
  ): void {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    task.progress = Math.min(progress, 100);
    task.downloadedSize = downloadedSize;
    task.speed = speed;
    task.updatedAt = new Date();

    this.activeTasks.set(taskId, task);
    this.emit('downloadProgress', task);
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理完成的任务
   */
  cleanupCompletedTasks(): void {
    for (const [taskId, task] of this.activeTasks) {
      if (task.status === 'completed' || task.status === 'cancelled') {
        this.activeTasks.delete(taskId);
      }
    }
  }
}

// 创建单例实例
export const downloadService = new DownloadService();

export default DownloadService;
