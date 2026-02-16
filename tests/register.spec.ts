import { test, expect } from '@playwright/test';

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('page loads with correct heading', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Register Agent or Service');
  });

  test('shows subheading', async ({ page }) => {
    await expect(page.locator('text=One page')).toBeVisible();
  });

  test('connect button visible when not connected', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /connect wallet/i })
    ).toBeVisible();
  });

  test('wallet connect copy mentions registration', async ({ page }) => {
    await expect(page.locator('text=register your')).toBeVisible();
  });
});
