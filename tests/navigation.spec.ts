import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('homepage loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ACK/i);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('nav links are present and work', async ({ page }) => {
    await page.goto('/');
    const exploreLink = page.getByRole('link', { name: 'Explore' }).first();
    const kudosLink = page.getByRole('link', { name: 'Kudos' }).first();
    const registerLink = page.getByRole('link', { name: 'Register' }).first();

    await expect(exploreLink).toBeVisible();
    await expect(kudosLink).toBeVisible();
    await expect(registerLink).toBeVisible();
  });

  test('explore link navigates to leaderboard', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Explore' }).first().click();
    await expect(page).toHaveURL(/leaderboard/, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Explore Agents');
  });

  test('kudos link navigates correctly', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Kudos' }).first().click();
    await expect(page).toHaveURL(/kudos/);
  });

  test('register link navigates correctly', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Register' }).first().click();
    await expect(page).toHaveURL(/register/);
  });

  test('logo links back to homepage', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.getByRole('link', { name: 'ACK' }).click();
    await expect(page).toHaveURL('/');
  });

  test('mobile nav hamburger opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const hamburger = page.getByLabel('Toggle menu');
    await expect(hamburger).toBeVisible();

    // Open mobile menu
    await hamburger.click();

    // Verify links in mobile menu
    const mobileExplore = page
      .locator('.fixed')
      .getByRole('link', { name: 'Explore' });
    await expect(mobileExplore).toBeVisible();

    // Close menu - click the X button next to "Menu" text
    const menuHeader = page.locator('text=Menu').locator('..');
    const closeBtn = menuHeader.locator('button');
    await closeBtn.click();
    await expect(mobileExplore).not.toBeVisible({ timeout: 5000 });
  });

  test('connect button is visible when not connected', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: /connect/i }).first()
    ).toBeVisible();
  });
});
