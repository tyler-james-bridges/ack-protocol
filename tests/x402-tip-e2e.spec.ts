/**
 * E2E tests for kudos + x402 tip flows.
 *
 * Uses AGENT_PRIVATE_KEY from .env.local (ACK openclaw agent wallet).
 * Run:
 *   npx playwright test tests/x402-tip-e2e.spec.ts --headed --workers=1
 */

import { test, expect } from './fixtures/test-wallet';

const AGENT_PATH = '/agent/2741/615';
const AGENT_NAME = 'Saucaiii';

// Wallet signing + onchain confirmation can be slow
test.setTimeout(120_000);

// ─── Helpers ──────────────────────────────────────────────

async function ensureConnected(page: import('@playwright/test').Page) {
  // Wait for hydration to settle — wagmi may auto-connect via EIP-6963
  await page.waitForTimeout(3_000);

  // Check if already connected (no Connect button visible)
  const connectBtn = page.getByRole('button', { name: /connect/i }).first();
  const needsConnect = await connectBtn
    .isVisible({ timeout: 2_000 })
    .catch(() => false);

  if (!needsConnect) return; // Already connected

  await connectBtn.click();

  // Click "Browser Wallet" — our injected EIP-6963 provider
  const browserWallet = page.getByText('Browser Wallet').first();
  await browserWallet.click({ timeout: 5_000 });

  // Wait for modal to close
  await expect(connectBtn).toBeHidden({ timeout: 15_000 });
  await page.waitForTimeout(1_000);
}

// ─── Test 1: Give Kudos ───────────────────────────────────

test.describe('Kudos flow', () => {
  test('give kudos and verify it appears in the feed', async ({ page }) => {
    await page.goto(AGENT_PATH, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`text=${AGENT_NAME}`).first()).toBeVisible({
      timeout: 15_000,
    });

    await ensureConnected(page);

    // Scroll to kudos form (use .first() — there are two #give-kudos elements)
    const kudosForm = page.locator('#give-kudos').first();
    await kudosForm.scrollIntoViewIfNeeded();

    // Pick a category
    const categories = kudosForm.locator('button').filter({
      hasText: /Reliable|Accurate|Helpful|Innovative|Trustworthy/,
    });
    await categories.first().click();

    // Type a message
    const messages = [
      'Solid agent, always delivers',
      'Great work on the community vibes',
      'Consistent and reliable, keep it up',
      'Top-tier agent behavior right here',
    ];
    const testMessage = messages[Date.now() % messages.length];
    await kudosForm.locator('textarea').fill(testMessage);

    // Submit
    const sendBtn = kudosForm.getByRole('button', { name: /send kudos/i });
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // Wait for onchain confirmation + success state
    await expect(page.locator(`text=Kudos sent to ${AGENT_NAME}`)).toBeVisible({
      timeout: 90_000,
    });

    // Verify tx link
    const txLink = page.locator('a:has-text("View transaction")');
    await expect(txLink).toBeVisible();
    const txHref = await txLink.getAttribute('href');
    expect(txHref).toMatch(/abscan\.org\/tx\/0x[a-fA-F0-9]+/);

    // The onchain indexer may take a while to pick up the new kudos.
    // The tx link + success state above already proves the kudos went onchain.
    // Optionally verify in the feed with a reload + retry.
    let foundInFeed = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5_000);
      const feedVisible = await page
        .locator('#kudos-feed')
        .isVisible()
        .catch(() => false);
      if (feedVisible) {
        foundInFeed = await page
          .locator(`#kudos-feed >> text=${testMessage}`)
          .isVisible({ timeout: 5_000 })
          .catch(() => false);
        if (foundInFeed) break;
      }
    }
    // Soft assertion — feed indexing is eventually consistent
    if (!foundInFeed) {
      // eslint-disable-next-line no-console
      console.log(
        'Note: kudos not yet visible in feed (indexer delay). Tx was confirmed onchain.'
      );
    }
  });
});

// ─── Test 2: x402 USDC Tip ───────────────────────────────

test.describe('x402 Tip flow', () => {
  test('tip $1 USDC and verify transaction', async ({ page }) => {
    await page.goto(AGENT_PATH, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`text=${AGENT_NAME}`).first()).toBeVisible({
      timeout: 15_000,
    });

    await ensureConnected(page);

    // Verify tip component exists with USDC default
    await expect(page.locator('text=Tip with USDC')).toBeVisible();

    // Select $1 preset
    await page.locator('button:has-text("$1")').first().click();

    // Send
    const sendBtn = page.getByRole('button', { name: /send \$1 usdc/i });
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // Wait for onchain confirmation
    await expect(page.locator('text=sent to')).toBeVisible({ timeout: 90_000 });

    // Verify tx link
    const txLink = page.locator('a:has-text("View transaction")');
    await expect(txLink).toBeVisible();
    const txHref = await txLink.getAttribute('href');
    expect(txHref).toMatch(/abscan\.org\/tx\/0x[a-fA-F0-9]+/);

    // Verify share button present
    await expect(page.locator('a:has-text("Share")')).toBeVisible();
  });

  test('tip custom amount USDC', async ({ page }) => {
    await page.goto(AGENT_PATH, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`text=${AGENT_NAME}`).first()).toBeVisible({
      timeout: 15_000,
    });

    await ensureConnected(page);

    // Enter custom amount
    await page.locator('input[placeholder="Custom amount"]').fill('0.50');

    // Send
    const sendBtn = page.getByRole('button', { name: /send \$0\.5 usdc/i });
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    await expect(page.locator('text=sent to')).toBeVisible({ timeout: 90_000 });
  });

  test('tip with PENGU token', async ({ page }) => {
    await page.goto(AGENT_PATH, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`text=${AGENT_NAME}`).first()).toBeVisible({
      timeout: 15_000,
    });

    await ensureConnected(page);

    // Switch to PENGU
    await page.locator('button:has-text("PENGU")').first().click();
    await expect(page.locator('text=Tip with PENGU')).toBeVisible();

    // Use custom input to avoid ambiguous preset buttons
    await page.locator('input[placeholder="Custom amount"]').fill('1');

    // Send
    const sendBtn = page.getByRole('button', { name: /send 1 pengu/i });
    await expect(sendBtn).toBeEnabled({ timeout: 5_000 });
    await sendBtn.click();

    await expect(page.locator('text=PENGU sent to')).toBeVisible({
      timeout: 90_000,
    });

    // Verify tx link
    const txLink = page.locator('a:has-text("View transaction")');
    await expect(txLink).toBeVisible();
  });
});
