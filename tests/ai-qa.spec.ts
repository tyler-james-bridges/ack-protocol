import { test, expect } from '@playwright/test';
import {
  analyzeWithAI,
  attachScreenshots,
  attachBugReport,
} from 'ai-qa-engineer';
import type { AnalysisReport } from 'ai-qa-engineer';

/**
 * AI-powered QA tests for ACK Protocol.
 *
 * These tests use ai-qa-engineer to capture screenshots at multiple viewports,
 * feed them (plus ARIA/DOM snapshots) to an LLM, and assert zero critical bugs.
 *
 * Set ANTHROPIC_API_KEY (or OPENAI_API_KEY / GEMINI_API_KEY) to enable AI analysis.
 * Without a key the AI analysis is skipped but console/network error capture still runs.
 */

const HAS_AI_KEY = !!(
  process.env.ANTHROPIC_API_KEY ||
  process.env.OPENAI_API_KEY ||
  process.env.GEMINI_API_KEY
);

// Longer timeout for AI analysis (LLM calls can take 10-30s per page)
test.describe.configure({ timeout: 120_000 });

async function runAnalysis(
  page: Parameters<typeof analyzeWithAI>[0],
  testInfo: Parameters<typeof attachScreenshots>[0],
  options?: Parameters<typeof analyzeWithAI>[1]
): Promise<AnalysisReport | null> {
  if (!HAS_AI_KEY) {
    test.skip(!HAS_AI_KEY, 'No LLM API key set -- skipping AI analysis');
    return null;
  }

  const report = await analyzeWithAI(page, {
    viewports: ['desktop', 'mobile'],
    ...options,
  });

  await attachScreenshots(testInfo, report);
  await attachBugReport(testInfo, report);

  return report;
}

test.describe('AI QA: Homepage', () => {
  test('no critical bugs on homepage', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const report = await runAnalysis(page, testInfo);
    if (!report) return;

    expect(
      report.criticalBugs,
      `Critical bugs found: ${JSON.stringify(report.criticalBugs)}`
    ).toHaveLength(0);
    expect(report.consoleErrors).toHaveLength(0);
  });

  test('homepage accessibility', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const report = await runAnalysis(page, testInfo, {
      focus: 'accessibility',
    });
    if (!report) return;

    expect(report.criticalBugs).toHaveLength(0);
  });
});

test.describe('AI QA: Leaderboard', () => {
  // Leaderboard renders 100+ agent cards, producing fullPage screenshots >8000px tall.
  // Anthropic rejects images exceeding 8000px on any dimension.
  // TODO: Fix in ai-qa-engineer (resize before sending) then re-enable.
  test.skip('no critical bugs on leaderboard', async ({ page }, testInfo) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');

    const report = await runAnalysis(page, testInfo);
    if (!report) return;

    expect(report.criticalBugs).toHaveLength(0);
    expect(report.consoleErrors).toHaveLength(0);
  });

  test.skip('leaderboard visual consistency', async ({ page }, testInfo) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');

    const report = await runAnalysis(page, testInfo, { focus: 'visual' });
    if (!report) return;

    expect(report.criticalBugs).toHaveLength(0);
  });
});

test.describe('AI QA: Register', () => {
  test('no critical bugs on register page', async ({ page }, testInfo) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const report = await runAnalysis(page, testInfo);
    if (!report) return;

    expect(report.criticalBugs).toHaveLength(0);
    expect(report.consoleErrors).toHaveLength(0);
  });

  test('register form accessibility', async ({ page }, testInfo) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const report = await runAnalysis(page, testInfo, { focus: 'forms' });
    if (!report) return;

    // Filter out false positives about missing labels (visible labels + htmlFor are present)
    const realBugs = report.criticalBugs.filter(
      (b) => !b.title.toLowerCase().includes('missing form label')
    );
    expect(realBugs).toHaveLength(0);
  });
});

test.describe('AI QA: Kudos', () => {
  test('no critical bugs on kudos page', async ({ page }, testInfo) => {
    await page.goto('/kudos');
    await page.waitForLoadState('networkidle');

    const report = await runAnalysis(page, testInfo);
    if (!report) return;

    expect(report.criticalBugs).toHaveLength(0);
    expect(report.consoleErrors).toHaveLength(0);
  });
});

test.describe('AI QA: Agent Profile', () => {
  test('no critical bugs on agent profile', async ({ page }, testInfo) => {
    // Use a known agent address (Abstract chain agent #606)
    await page.goto('/agent/0x0000000000000000000000000000000000000001');
    await page.waitForLoadState('networkidle');

    const report = await runAnalysis(page, testInfo);
    if (!report) return;

    expect(report.criticalBugs).toHaveLength(0);
  });
});

test.describe('AI QA: Graph', () => {
  test('no critical bugs on graph page', async ({ page }, testInfo) => {
    await page.goto('/graph');
    await page.waitForLoadState('networkidle');
    // Give 3D graph a moment to render
    await page.waitForTimeout(2000);

    const report = await runAnalysis(page, testInfo);
    if (!report) return;

    expect(report.criticalBugs).toHaveLength(0);
  });
});

test.describe('AI QA: Cross-page network health', () => {
  test('no network errors across core pages', async ({ page }) => {
    const networkErrors: Array<{ page: string; url: string; status?: number }> =
      [];

    page.on('response', (response) => {
      if (response.status() >= 400 && !response.url().includes('favicon')) {
        networkErrors.push({
          page: page.url(),
          url: response.url(),
          status: response.status(),
        });
      }
    });

    const pages = ['/', '/leaderboard', '/register', '/kudos'];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }

    expect(
      networkErrors,
      `Network errors: ${JSON.stringify(networkErrors, null, 2)}`
    ).toHaveLength(0);
  });

  test('no console errors across core pages', async ({ page }) => {
    const consoleErrors: Array<{ page: string; text: string }> = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known noise
        if (text.includes('favicon') || text.includes('DevTools')) return;
        consoleErrors.push({ page: page.url(), text });
      }
    });

    const pages = ['/', '/leaderboard', '/register', '/kudos'];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }

    expect(
      consoleErrors,
      `Console errors: ${JSON.stringify(consoleErrors, null, 2)}`
    ).toHaveLength(0);
  });
});
