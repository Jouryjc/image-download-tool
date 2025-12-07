import { test, expect } from '@playwright/test';

/**
 * 并发性能测试：并行创建≥5个任务并统计耗时
 */
test('并发创建与模拟5个下载任务直至完成', async ({ request }) => {
  const start = Date.now();
  const creates = Array.from({ length: 5 }).map((_, i) =>
    request.post('http://localhost:3001/api/downloads', {
      data: { imageName: `nginx-${i}`, tag: 'latest', source: 'dockerhub' }
    })
  );
  const results = await Promise.all(creates);
  results.forEach(r => expect(r.status()).toBe(200));
  const tasks = await Promise.all(results.map(r => r.json()));
  const ids = tasks.map(t => t.data.id);

  // 触发模拟进度
  await Promise.all(ids.map(id => request.post(`http://localhost:3001/api/downloads/${id}/simulate`)));

  // 轮询直到全部完成
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const statuses = await Promise.all(ids.map(async id => {
      const res = await request.get(`http://localhost:3001/api/downloads/${id}`);
      const body = await res.json();
      return body.data.status;
    }));
    if (statuses.every(s => s === 'completed')) break;
    await new Promise(r => setTimeout(r, 200));
  }

  const duration = Date.now() - start;
  console.log(`[perf] 5并发下载完成耗时: ${duration}ms`);
  expect(duration).toBeLessThan(10_000);
});
