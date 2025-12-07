import { describe, it, expect } from 'vitest';
import { useStore } from '../store';

/**
 * 全局 store 单元测试
 */
describe('Zustand store', () => {
  it('should add and update download tasks', () => {
    const { addDownloadTask, updateDownloadTask, useStore: store } = {
      addDownloadTask: useStore.getState().addDownloadTask,
      updateDownloadTask: useStore.getState().updateDownloadTask,
      useStore
    };

    const task = {
      id: 't1',
      imageName: 'nginx',
      tag: 'latest',
      source: 'dockerhub',
      status: 'pending',
      progress: 0,
      speed: 0,
      totalBytes: 0,
      downloadedBytes: 0,
      targetPath: '/downloads/nginx-latest.tar',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    addDownloadTask(task);
    expect(useStore.getState().downloadTasks.length).toBe(1);

    updateDownloadTask('t1', { status: 'downloading', progress: 50 });
    const updated = useStore.getState().downloadTasks[0];
    expect(updated.status).toBe('downloading');
    expect(updated.progress).toBe(50);
  });
});

