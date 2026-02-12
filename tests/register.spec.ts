import { test, expect } from '@playwright/test';

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('page loads with correct heading', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Put your agent');
    await expect(page.locator('text=on the map')).toBeVisible();
  });

  test('name input accepts text', async ({ page }) => {
    const nameInput = page.getByPlaceholder('Agent name');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Test Agent');
    await expect(nameInput).toHaveValue('Test Agent');
  });

  test('description input accepts text', async ({ page }) => {
    const descInput = page.getByPlaceholder('What does your agent do?');
    await expect(descInput).toBeVisible();
    await descInput.fill('Short');
    await expect(descInput).toHaveValue('Short');
  });

  test('description shows character count warning when < 50 chars', async ({ page }) => {
    const descInput = page.getByPlaceholder('What does your agent do?');
    await descInput.fill('Too short description');
    await expect(page.locator('text=more characters needed')).toBeVisible();
  });

  test('description warning disappears at 50+ chars', async ({ page }) => {
    const descInput = page.getByPlaceholder('What does your agent do?');
    await descInput.fill('This is a sufficiently long description that exceeds the fifty character minimum requirement for agent descriptions');
    await expect(page.locator('text=more characters needed')).not.toBeVisible();
  });

  test('connect button visible when not connected', async ({ page }) => {
    await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible();
  });

  test('stats section loads real data', async ({ page }) => {
    // Network stats are conditionally rendered after API loads
    // Look for the stats row with "chains" text
    const chainsText = page.getByText('chains', { exact: true });
    await expect(chainsText).toBeVisible({ timeout: 20000 });
  });

  test('why register section has 3 cards', async ({ page }) => {
    const discovered = page.getByText('Get discovered', { exact: true });
    await discovered.scrollIntoViewIfNeeded();
    await expect(discovered).toBeVisible();
    await expect(page.getByText('Build reputation', { exact: true })).toBeVisible();
    await expect(page.getByText('Cross-chain rep', { exact: true })).toBeVisible();
  });
});
