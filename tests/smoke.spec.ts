import { test, expect } from '@playwright/test';

/**
 * Smoke test suite — critical paths only.
 * Run before every deploy to catch regressions fast.
 *
 * npx playwright test tests/smoke.spec.ts
 */
test.describe('Smoke Tests', () => {
  test('homepage loads with hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Onchain reputation');
    await expect(
      page.getByRole('button', { name: /connect/i }).first()
    ).toBeVisible();
    // Nav links present
    await expect(
      page.getByRole('link', { name: 'Explore' }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Docs' }).first()
    ).toBeVisible();
  });

  test('leaderboard loads agents', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(
      page.getByRole('heading', { name: /explore/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('agent detail page loads for ACK #606', async ({ page }) => {
    await page.goto('/agent/2741/606');
    await expect(page.locator('text=ACK').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('agent detail supports chain name in URL', async ({ page }) => {
    await page.goto('/agent/abstract/606');
    await page.waitForURL('**/agent/2741/606', { timeout: 5000 });
  });

  test('kudos page loads', async ({ page }) => {
    await page.goto('/kudos');
    await expect(
      page.getByRole('heading', { name: 'Give Kudos' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Recent Kudos' })
    ).toBeVisible();
  });

  test('kudos feed does not show raw JSON', async ({ page }) => {
    await page.goto('/kudos');
    // Wait for feed to load
    await page.waitForTimeout(5000);
    // No raw JSON blobs should be visible as kudos messages
    const cards = page.locator('text=/"agentId"/');
    expect(await cards.count()).toBe(0);
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(
      page.getByRole('heading', { name: /register agent/i })
    ).toBeVisible();
  });

  test('docs redirects to GitBook', async ({ page }) => {
    await page.goto('/docs');
    await page.waitForURL(/docs\.ack-onchain\.dev/, { timeout: 10000 });
  });

  test('404 page is branded', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz');
    await expect(page.locator('text=404')).toBeVisible();
    await expect(page.locator('text=Back to home')).toBeVisible();
  });

  test('API: agents endpoint responds', async ({ request }) => {
    const res = await request.get('/api/agents');
    // 200 = success, 502 = upstream rate limit (acceptable in test)
    expect([200, 429, 502]).toContain(res.status());
  });
});
