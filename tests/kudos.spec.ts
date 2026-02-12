import { test, expect } from '@playwright/test';

test.describe('Kudos Page', () => {
  test('page loads with Give Kudos heading', async ({ page }) => {
    await page.goto('/kudos');
    await expect(page.locator('h1')).toContainText('Give Kudos');
  });

  test('shows connect wallet prompt when not connected', async ({ page }) => {
    await page.goto('/kudos');
    // When not connected, should show connect button or wallet prompt
    const connectBtn = page.getByRole('button', { name: /connect/i });
    await expect(connectBtn.first()).toBeVisible();
  });

  test('page has description text', async ({ page }) => {
    await page.goto('/kudos');
    await expect(page.locator('text=Recognize an agent')).toBeVisible();
  });
});
