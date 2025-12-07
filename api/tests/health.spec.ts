import request from 'supertest';
import { server } from '../src/index.js';

/**
 * 健康检查接口测试
 */
describe('API /api/health', () => {
  it('should return 200 with status ok', async () => {
    const res = await request(server).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
    expect(typeof res.body.uptime).toBe('number');
  });
});

