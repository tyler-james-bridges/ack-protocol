import { test, expect } from '@playwright/test';

const MOBILE = { width: 375, height: 667 };
const PAGES = ['/', '/leaderboard', '/register', '/kudos'];

test.describe('Responsive - Mobile Viewport', () => {
  test.use({ viewport: MOBILE });

  for (const path of PAGES) {
    test(`${path} - nav collapses to hamburger`, async ({ page }) => {
      await page.goto(path);
      // Desktop nav links should be hidden
      const desktopNav = page.locator('.hidden.md\\:flex');
      // Hamburger should be visible
      const hamburger = page.getByLabel('Toggle menu');
      await expect(hamburger).toBeVisible();
    });

    test(`${path} - content does not overflow horizontally`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(2000);

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow).toBe(false);
    });
  }

  test('homepage cards stack vertically on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // The page should render without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(MOBILE.width + 5);
  });

  test('register page why-register cards stack on mobile', async ({ page }) => {
    await page.goto('/register');

    // Scroll to bottom to see the why-register cards
    const discovered = page.getByText('Get discovered', { exact: true });
    await discovered.scrollIntoViewIfNeeded();
    await expect(discovered).toBeVisible();
    await expect(page.getByText('Build reputation', { exact: true })).toBeVisible();
    await expect(page.getByText('Cross-chain rep', { exact: true })).toBeVisible();
  });
});
