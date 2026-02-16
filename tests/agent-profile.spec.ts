import { test, expect } from '@playwright/test';

test.describe('Agent Profile', () => {
  test('ACK agent profile loads', async ({ page }) => {
    await page.goto('/agent/2741/606', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await expect(page.locator('text=ACK').first()).toBeVisible();
    await expect(page.locator('text=Abstract').first()).toBeVisible();
  });

  test('agent profile shows reputation section', async ({ page }) => {
    await page.goto('/agent/2741/606', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await expect(page.locator('text=REPUTATION').first()).toBeVisible();
  });

  test('agent profile URL contains chain and token ID', async ({ page }) => {
    await page.goto('/agent/2741/606', { waitUntil: 'domcontentloaded' });
    expect(page.url()).toMatch(/\/agent\/2741\/606/);
  });

  test('agent profile supports chain name redirect', async ({ page }) => {
    await page.goto('/agent/abstract/606', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/agent/2741/606', { timeout: 5000 });
  });
});
