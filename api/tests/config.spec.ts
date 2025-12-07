import request from 'supertest';
import { server } from '../src/index.js';

/**
 * 配置相关接口测试
 */
describe('API /api/config', () => {
  it('should list image sources', async () => {
    const res = await request(server).get('/api/config/sources');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should add image source', async () => {
    const res = await request(server)
      .post('/api/config/sources')
      .send({ name: 'TestSource', url: 'https://example.com', priority: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('TestSource');
  });
});

