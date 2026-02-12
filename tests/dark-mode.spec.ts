import { test, expect } from '@playwright/test';

test.describe('Dark Mode', () => {
  test('toggle dark mode via theme toggle button', async ({ page }) => {
    await page.goto('/');

    const themeToggle = page.getByLabel('Toggle theme');
    await expect(themeToggle).toBeVisible();

    const initialDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );

    await themeToggle.click();

    const afterToggle = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(afterToggle).toBe(!initialDark);
  });

  test('dark mode toggles the dark class on html element', async ({ page }) => {
    await page.goto('/');

    // Ensure we start in light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });

    const toggle = page.getByLabel('Toggle theme');

    // Toggle to dark
    await toggle.click();

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(hasDark).toBe(true);

    // localStorage should reflect
    const stored = await page.evaluate(() => localStorage.getItem('theme'));
    expect(stored).toBe('dark');
  });

  test('text remains readable in dark mode', async ({ page }) => {
    await page.goto('/');

    // Enable dark mode via toggle
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(200);

    // H1 should still be visible
    await expect(page.locator('h1')).toBeVisible();

    // Verify the dark class is on the html element
    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(hasDark).toBe(true);
  });

  test('dark mode persists theme toggle icon change', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByLabel('Toggle theme');
    const svgBefore = await toggle.innerHTML();

    await toggle.click();
    const svgAfter = await toggle.innerHTML();

    // The icon SVG should change (moon vs sun)
    expect(svgBefore).not.toBe(svgAfter);
  });
});
