import { test, expect } from '@playwright/test';

test.describe('ngx-image-editor demo', () => {
  test('loads the marketing page and editor', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero__title')).toContainText('ngx-image-editor');
    await expect(page.locator('ngx-image-editor')).toBeVisible();
    await expect(page.locator('.ngx-nie__toolbar')).toBeVisible();
  });

  test('switches tools with keyboard shortcuts', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('ngx-image-editor');
    await editor.click();
    await page.keyboard.press('t');
    await expect(page.locator('.ngx-nie__statusbar')).toContainText('text');
    await page.keyboard.press('v');
    await expect(page.locator('.ngx-nie__statusbar')).toContainText('move');
  });

  test('shows premium brush tool when licensed', async ({ page }) => {
    await page.goto('/');
    const brush = page.locator('ngx-nie-toolbar button[aria-label="Brush"]');
    await expect(brush).toBeVisible();
    await brush.click();
    await expect(page.locator('.ngx-nie__statusbar')).toContainText('brush');
  });

  test('opens export dialog via shortcut', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('ngx-image-editor');
    await editor.click();
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+s' : 'Control+s');
    await expect(page.locator('.ngx-nie__export-dialog')).toBeVisible();
  });
});
