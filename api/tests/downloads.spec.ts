import request from 'supertest';
import { server } from '../src/index.js';

/**
 * 下载任务接口测试
 */
describe('API /api/downloads', () => {
  let taskId: string;

  it('should create a download task', async () => {
    const res = await request(server)
      .post('/api/downloads')
      .send({ imageName: 'nginx', tag: 'latest', source: 'dockerhub' });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBeTruthy();
    taskId = res.body.data.id;
  });

  it('should list tasks', async () => {
    const res = await request(server).get('/api/downloads');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should fetch task detail', async () => {
    const res = await request(server).get(`/api/downloads/${taskId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(taskId);
  });
});

