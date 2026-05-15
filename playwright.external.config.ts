import { defineConfig } from '@playwright/test';

/**
 * Playwright config for external site tests (8004scan, etc).
 * No local webServer needed - tests hit live URLs directly.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 1,
  use: {
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
