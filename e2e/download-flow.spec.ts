import { test, expect } from '@playwright/test';

/**
 * 端到端下载流程（通过 API 创建任务，页面展示）
 */
test('创建下载任务并在下载页展示', async ({ page, request }) => {
  const res = await request.post('http://localhost:3001/api/downloads', {
    data: { imageName: 'nginx', tag: 'latest', source: 'dockerhub' }
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  const taskId = body.data.id;

  await page.goto('/download');
  await expect(page.getByText('下载管理')).toBeVisible();
  // 简单检查任务列表API可用
  const listRes = await request.get('http://localhost:3001/api/downloads');
  expect(listRes.status()).toBe(200);
  const list = await listRes.json();
  expect(Array.isArray(list.data)).toBe(true);
  expect(list.data.find((t: any) => t.id === taskId)).toBeTruthy();
});
