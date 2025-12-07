import { test, expect } from '@playwright/test';

/**
 * 基础可用性与页面元素检查
 */
test('首页加载与基本元素存在', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('容器镜像下载器')).toBeVisible();
});
