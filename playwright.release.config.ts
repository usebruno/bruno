import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const executablePath = process.env.BRUNO_EXECUTABLE_PATH;
if (!executablePath || !path.isAbsolute(executablePath) || !fs.existsSync(executablePath)) {
  throw new Error('Set BRUNO_EXECUTABLE_PATH to the absolute path of the packaged Bruno executable (not the installer).');
}

export default defineConfig({
  testDir: './tests/changelog/packaged',
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  outputDir: 'test-results/release-changelog',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/release-changelog', open: 'never' }],
    ['junit', { outputFile: 'test-results/release-changelog.xml' }]
  ]
});
