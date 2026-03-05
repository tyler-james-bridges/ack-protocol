import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('homepage loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ACK/i);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('nav links are present and work', async ({ page }) => {
    await page.goto('/');
    const exploreLink = page.getByRole('link', { name: 'Discover' }).first();
    const kudosLink = page.getByRole('link', { name: 'Give Kudos' }).first();
    const registerLink = page.getByRole('link', { name: 'Register' }).first();

    await expect(exploreLink).toBeVisible();
    await expect(kudosLink).toBeVisible();
    await expect(registerLink).toBeVisible();
  });

  test('explore link points to leaderboard', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const href = await page
      .getByRole('link', { name: 'Discover' })
      .first()
      .getAttribute('href');
    expect(href).toBe('/leaderboard');
  });

  test('kudos link points correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const href = await page
      .getByRole('link', { name: 'Give Kudos' })
      .first()
      .getAttribute('href');
    expect(href).toBe('/kudos');
  });

  test('register link points correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const href = await page
      .getByRole('link', { name: 'Register' })
      .first()
      .getAttribute('href');
    expect(href).toBe('/register');
  });

  test('logo links to homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const href = await page
      .getByRole('navigation')
      .getByRole('link', { name: 'ACK' })
      .getAttribute('href');
    expect(href).toBe('/');
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
      .getByRole('link', { name: 'Discover' });
    await expect(mobileExplore).toBeVisible({ timeout: 5000 });

    // Close menu via the X button inside the panel header
    await page.locator('.fixed button').first().click();
    await expect(mobileExplore).not.toBeVisible({ timeout: 5000 });
  });

  test('connect button is visible when not connected', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: /connect/i }).first()
    ).toBeVisible();
  });
});
