import { test, expect } from '@playwright/test';
import {
  analyzeWithAI,
  attachScreenshots,
  attachBugReport,
} from 'ai-qa-engineer';
import type { AnalysisReport } from 'ai-qa-engineer';

const HAS_AI_KEY = !!(
  process.env.ANTHROPIC_API_KEY ||
  process.env.OPENAI_API_KEY ||
  process.env.GEMINI_API_KEY
);

test.describe.configure({ timeout: 60_000 });

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
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const report = await runAnalysis(page, testInfo);
    if (!report) return;

    expect(report.criticalBugs).toHaveLength(0);
  });

  test('homepage accessibility', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const report = await runAnalysis(page, testInfo, {
      focus: 'accessibility',
    });
    if (!report) return;

    expect(report.criticalBugs).toHaveLength(0);
  });
});

test.describe('AI QA: Register', () => {
  test('no critical bugs on register page', async ({ page }, testInfo) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });

    const report = await runAnalysis(page, testInfo);
    if (!report) return;

    expect(report.criticalBugs).toHaveLength(0);
  });

  test('register form accessibility', async ({ page }, testInfo) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });

    const report = await runAnalysis(page, testInfo, { focus: 'forms' });
    if (!report) return;

    const realBugs = report.criticalBugs.filter(
      (b) => !b.title.toLowerCase().includes('missing form label')
    );
    expect(realBugs).toHaveLength(0);
  });
});

test.describe('AI QA: Kudos', () => {
  test('no critical bugs on kudos page', async ({ page }, testInfo) => {
    await page.goto('/kudos', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const report = await runAnalysis(page, testInfo);
    if (!report) return;

    expect(report.criticalBugs).toHaveLength(0);
  });
});

test.describe('AI QA: Agent Profile', () => {
  test('no critical bugs on agent profile', async ({ page }, testInfo) => {
    await page.goto('/agent/2741/606', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const report = await runAnalysis(page, testInfo);
    if (!report) return;

    expect(report.criticalBugs).toHaveLength(0);
  });
});

test.describe('AI QA: Graph', () => {
  test('no critical bugs on graph page', async ({ page }, testInfo) => {
    await page.goto('/graph', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const report = await runAnalysis(page, testInfo);
    if (!report) return;

    expect(report.criticalBugs).toHaveLength(0);
  });
});

test.describe('AI QA: Cross-page health', () => {
  test('no console errors across core pages', async ({ page }) => {
    const consoleErrors: Array<{ page: string; text: string }> = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('favicon') || text.includes('DevTools')) return;
        if (text.includes('Failed to fetch') || text.includes('ERR_')) return;
        if (text.includes('Failed to load resource') || text.includes('404'))
          return;
        consoleErrors.push({ page: page.url(), text });
      }
    });

    const pages = ['/', '/register', '/kudos'];
    for (const path of pages) {
      await page.goto(path, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await page.waitForTimeout(1000);
    }

    expect(
      consoleErrors,
      `Console errors: ${JSON.stringify(consoleErrors, null, 2)}`
    ).toHaveLength(0);
  });
});
